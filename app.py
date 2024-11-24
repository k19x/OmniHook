from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import subprocess
import os
import frida

# Caminho dos scripts
SCRIPT_PATH = fr"C:\Users\{os.getlogin()}\Downloads\frida-universal\static\js\scripts"
app = Flask(__name__)
socketio = SocketIO(app)

# Rota principal para renderizar a página
@app.route('/')
def index():
    return render_template('index.html')

# Rota para listar dispositivos conectados
@app.route('/listar_dispositivos', methods=['GET'])
def listar_dispositivos():
    try:
        devices = frida.enumerate_devices()
        dispositivos = [{"id": device.id, "name": device.name, "type": device.type} for device in devices]
        return jsonify(dispositivos)
    except frida.ServerNotRunningError:
        return jsonify({'error': 'Frida server não está rodando. Certifique-se de que o Frida server esteja ativo no dispositivo.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Rota para listar pacotes instalados no dispositivo selecionado
@app.route('/listar_pacotes', methods=['POST'])
def listar_pacotes():
    dispositivo_id = request.json.get('dispositivo_id')
    forma = request.json.get('forma', '-f')  # Padrão é -f

    if not dispositivo_id:
        return jsonify({'error': 'ID do dispositivo não fornecido'}), 400

    try:
        comando = f'frida-ps -D {dispositivo_id} -ai'
        result = subprocess.run(comando, shell=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if result.stderr:
            return jsonify({'error': result.stderr.strip()}), 500

        linhas = result.stdout.splitlines()
        pacotes = []
        for linha in linhas[3:]:
            partes = linha.split()
            if len(partes) >= 3:
                if forma == '-f':
                    pacotes.append(partes[-1])  # Pegar o nome do pacote (coluna 3)
                elif forma == '-n':
                    pacotes.append(partes[1])  # Pegar o nome do app (coluna 2)
        return jsonify(pacotes)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Rota para listar os scripts disponíveis
@app.route('/listar_scripts', methods=['GET'])
def listar_scripts():
    try:
        if not os.path.exists(SCRIPT_PATH):
            return jsonify({'error': 'Pasta de scripts não encontrada'}), 500

        scripts = [file for file in os.listdir(SCRIPT_PATH) if file.endswith('.js')]
        return jsonify(scripts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Função para executar o comando Frida com múltiplos scripts e enviar logs em tempo real
@socketio.on('executar_comando')
def executar_comando(data):
    dispositivo_id = data.get('dispositivo_id')
    pacote = data.get('pacote')
    scripts = data.get('scripts', [])  # Lista de scripts selecionados
    forma = data.get('forma', '-f')  # Padrão é -f caso não seja enviado

    if not dispositivo_id or not pacote or not scripts or not forma:
        emit('log', 'Erro: Dados insuficientes fornecidos.', broadcast=True)
        return

    # Validar os scripts
    script_flags = []
    for script in scripts:
        script_path = os.path.join(SCRIPT_PATH, script)
        if not os.path.exists(script_path):
            emit('log', f'Erro: Script não encontrado em {script_path}', broadcast=True)
            return
        script_flags.append(f'-l "{script_path}"')

    # Construir o comando de acordo com a forma selecionada
    try:
        script_flags_str = ' '.join(script_flags)
        if forma == '-f':  # Inicia e anexa ao processo pelo pacote
            comando = f'frida -D "{dispositivo_id}" -f "{pacote}" {script_flags_str}'
        elif forma == '-n':  # Apenas anexa ao processo pelo nome
            comando = f'frida -D "{dispositivo_id}" -n "{pacote}" {script_flags_str}'
        else:
            emit('log', 'Erro: Forma de execução inválida.', broadcast=True)
            return

        emit('log', f'Executando comando: {comando}', broadcast=True)

        # Executar o comando
        process = subprocess.Popen(
            comando, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        for line in iter(process.stdout.readline, ''):
            if line:
                emit('log', line.strip(), broadcast=True)  # Enviar logs em tempo real
        process.stdout.close()
        process.wait()
        emit('log', 'Comando finalizado.', broadcast=True)
    except Exception as e:
        emit('log', f'Erro ao executar comando: {str(e)}', broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
