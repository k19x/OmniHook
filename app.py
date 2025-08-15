from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import subprocess
import os
import frida

current_directory = os.path.dirname(os.path.abspath(__file__))
SCRIPT_PATH = os.path.join(current_directory, "static", "js", "scripts")

app = Flask(__name__)
socketio = SocketIO(app)

def enviar_log(mensagem):
    emit('log', mensagem, broadcast=True)
    print(f"[LOG] {mensagem}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/listar_dispositivos', methods=['GET'])
def listar_dispositivos():
    try:
        devices = frida.enumerate_devices()
        dispositivos = [{"id": device.id, "name": device.name, "type": device.type} for device in devices]
        return jsonify(dispositivos)
    except frida.ServerNotRunningError:
        return jsonify({'error': 'Frida server não está rodando.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/listar_pacotes', methods=['POST'])
def listar_pacotes():
    dispositivo_id = request.json.get('dispositivo_id')
    forma = request.json.get('forma', '-f')

    if not dispositivo_id:
        return jsonify({'error': 'ID do dispositivo não fornecido'}), 400

    try:
        if forma == '-f':
            comando = f'frida-ps -D {dispositivo_id} -ai'
        elif forma == '-n':
            comando = f'frida-ps -D {dispositivo_id} -a'
        else:
            return jsonify([])

        result = subprocess.run(
            comando, shell=True, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )

        # Debug: mostra saída bruta no log
        print("[DEBUG] Saída STDOUT frida-ps:\n", result.stdout)
        print("[DEBUG] Saída STDERR frida-ps:\n", result.stderr)

        if result.stderr.strip():
            return jsonify({'error': result.stderr.strip()}), 500

        linhas = result.stdout.splitlines()
        pacotes = []
        for linha in linhas[3:]:  # ignora cabeçalho
            partes = linha.split()
            if len(partes) >= 3:
                pacotes.append(partes[-1] if forma == '-f' else partes[1])

        return jsonify(pacotes)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/listar_scripts', methods=['GET'])
def listar_scripts():
    try:
        if not os.path.exists(SCRIPT_PATH):
            return jsonify({'error': 'Pasta de scripts não encontrada'}), 500

        scripts = [file for file in os.listdir(SCRIPT_PATH) if file.endswith('.js')]
        return jsonify(scripts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('executar_comando')
def executar_comando(data):
    dispositivo_id = data.get('dispositivo_id')
    pacote = data.get('pacote')
    scripts = data.get('scripts', [])
    forma = data.get('forma', '-f')

    if not dispositivo_id or not scripts or not forma:
        enviar_log('Erro: Dados insuficientes.')
        return

    script_flags = []
    for script in scripts:
        script_path = os.path.join(SCRIPT_PATH, script)
        if not os.path.exists(script_path):
            enviar_log(f'Erro: Script não encontrado: {script_path}')
            return
        script_flags.append(f'-l "{script_path}"')

    try:
        script_flags_str = ' '.join(script_flags)
        if forma == '-f':
            comando = f'frida -D "{dispositivo_id}" -f "{pacote}" {script_flags_str}'
        elif forma == '-n':
            comando = f'frida -D "{dispositivo_id}" -n "{pacote}" {script_flags_str}'
        elif forma == '-F':
            comando = f'frida -D "{dispositivo_id}" -F {script_flags_str}'
        else:
            enviar_log('Forma de execução inválida.')
            return

        enviar_log(f'Executando comando: {comando}')

        process = subprocess.Popen(comando, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        for line in iter(process.stdout.readline, ''):
            if line.strip():
                enviar_log(line.strip())
        process.stdout.close()
        process.wait()

        stderr_output = process.stderr.read()
        if stderr_output:
            enviar_log(f"Erro: {stderr_output.strip()}")
        else:
            enviar_log('Execução finalizada com sucesso.')

    except Exception as e:
        enviar_log(f'Erro ao executar comando: {str(e)}')

@app.route('/ativar_tcpip', methods=['POST'])
def ativar_tcpip():
    try:
        dispositivo_id = request.json.get('dispositivo_id')
        porta = request.json.get('porta', 5555)

        if not dispositivo_id:
            return jsonify({"error": "ID do dispositivo não fornecido"}), 400

        subprocess.run(f"adb -s {dispositivo_id} tcpip {porta}", shell=True, check=True)

        result = subprocess.run(f"adb -s {dispositivo_id} shell ip -f inet addr show wlan0",
                                shell=True, stdout=subprocess.PIPE, text=True)
        ip = None
        for line in result.stdout.splitlines():
            if "inet " in line:
                ip = line.strip().split()[1].split("/")[0]
                break

        if not ip:
            return jsonify({"error": "Não foi possível obter o IP do dispositivo"}), 500

        connect_result = subprocess.run(f"adb connect {ip}:{porta}",
                                        shell=True, stdout=subprocess.PIPE, text=True)

        return jsonify({
            "message": f"ADB TCP/IP ativado na porta {porta}",
            "ip": ip,
            "connect_output": connect_result.stdout.strip()
        })

    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Erro ao ativar TCP/IP: {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Rota não encontrada"}), 404

if __name__ == '__main__':
    socketio.run(app, debug=True, host="0.0.0.0")
