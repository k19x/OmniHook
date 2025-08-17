from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO
import os
import subprocess
import threading

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Caminhos
current_directory = os.path.dirname(os.path.abspath(__file__))
SCRIPT_PATH = os.path.join(current_directory, "static", "js", "scripts")
UPLOAD_FOLDER = os.path.join(current_directory, "uploads")

os.makedirs(SCRIPT_PATH, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==============================
# Rotas principais
# ==============================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/listar_scripts', methods=['GET'])
def listar_scripts():
    try:
        arquivos = [f for f in os.listdir(SCRIPT_PATH) if f.endswith(".js")]
        return jsonify(arquivos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/adicionar_script', methods=['POST'])
def adicionar_script():
    try:
        if 'script' not in request.files:
            return jsonify({"error": "Nenhum arquivo enviado"}), 400

        file = request.files['script']
        if not file.filename.endswith('.js'):
            return jsonify({"error": "Apenas arquivos .js são permitidos"}), 400

        save_path = os.path.join(SCRIPT_PATH, file.filename)
        file.save(save_path)
        return jsonify({"message": f"Script '{file.filename}' adicionado com sucesso!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================
# Funções auxiliares
# ==============================
def run_cmd_background(cmd):
    """Executa comando no background e envia saída para o console via socket."""
    def runner():
        try:
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for line in process.stdout:
                socketio.emit('log', f"{line.strip()}")
        except Exception as e:
            socketio.emit('log', f"[ERRO] {str(e)}")

    threading.Thread(target=runner, daemon=True).start()

def executar_comando_adb(dispositivo_id, comando):
    """Executa comando ADB específico em um dispositivo."""
    try:
        cmd = ["adb", "-s", dispositivo_id] + comando
        resultado = subprocess.check_output(cmd, text=True).strip()
        return {"mensagem": resultado}
    except subprocess.CalledProcessError as e:
        return {"erro": e.output}
    except Exception as e:
        return {"erro": str(e)}

# ==============================
# Rotas ADB
# ==============================
@app.route('/listar_dispositivos', methods=['GET'])
def listar_dispositivos():
    try:
        resultado = subprocess.check_output(["adb", "devices", "-l"], text=True).splitlines()
        dispositivos = []
        for linha in resultado[1:]:
            if linha.strip():
                partes = linha.split()
                device_id = partes[0]

                # Identificar modelo
                modelo = "Desconhecido"
                for p in partes:
                    if p.startswith("model:"):
                        modelo = p.split("model:")[1]
                        break

                # Identificar se é USB ou REDE
                if ":" in device_id and device_id.count(".") == 3:
                    conexao = "REDE"
                else:
                    conexao = "USB"

                dispositivos.append({
                    "id": device_id,
                    "name": modelo,
                    "conexao": conexao
                })

        return jsonify(dispositivos)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/listar_pacotes', methods=['POST'])
def listar_pacotes():
    data = request.json
    dispositivo_id = data.get("dispositivo_id")
    if not dispositivo_id:
        return jsonify({"erro": "ID do dispositivo não fornecido"}), 400
    try:
        cmd = ["adb", "-s", dispositivo_id, "shell", "pm", "list", "packages", "-3"]
        resultado = subprocess.check_output(cmd, text=True).splitlines()
        pacotes = [pkg.replace("package:", "").strip() for pkg in resultado]
        return jsonify(pacotes)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/status_conexao', methods=['POST'])
def status_conexao():
    data = request.json
    dispositivo_id = data.get("dispositivo_id")

    try:
        cmd = ["adb", "-s", dispositivo_id, "get-state"]
        resultado = subprocess.check_output(cmd, text=True).strip()

        status_map = {
            "device": "✅ Dispositivo conectado e pronto.",
            "offline": "⚠️ Dispositivo detectado, mas offline.",
            "unauthorized": "❌ Autorização necessária. Aceite a chave de depuração no celular."
        }

        mensagem = status_map.get(resultado, f"Estado desconhecido: {resultado}")
        return jsonify({"estado": resultado, "mensagem": mensagem})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/ativar_tcpip', methods=['POST'])
def ativar_tcpip():
    data = request.json
    dispositivo_id = data.get("dispositivo_id")

    try:
        # Descobrir IP do dispositivo
        cmd_ip = ["adb", "-s", dispositivo_id, "shell", "ip", "-f", "inet", "addr", "show", "wlan0"]
        resultado = subprocess.check_output(cmd_ip, text=True).splitlines()

        ip = None
        for linha in resultado:
            linha = linha.strip()
            if "inet " in linha:
                ip = linha.split()[1].split("/")[0]
                break

        if not ip:
            return jsonify({"erro": "Não foi possível identificar o IP do dispositivo."}), 500

        # Ativar TCP/IP
        subprocess.run(["adb", "-s", dispositivo_id, "tcpip", "5555"], check=True)

        return jsonify({
            "mensagem": f"✅ TCP/IP habilitado na porta 5555. Conecte usando: adb connect {ip}:5555",
            "ip": ip
        })

    except subprocess.CalledProcessError as e:
        return jsonify({"erro": e.output}), 500
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/reiniciar_frida', methods=['POST'])
def reiniciar_frida():
    data = request.json
    dispositivo_id = data.get("dispositivo_id")
    try:
        # Matar processo frida-server
        subprocess.run(["adb", "-s", dispositivo_id, "shell", "su -c", "pkill", "-f", "frida-server"], check=False)
        # Reiniciar frida-server (ajuste conforme localização do binário no dispositivo)
        subprocess.run(["adb", "-s", dispositivo_id, "shell", "su -c", "nohup", "./data/local/tmp/frida-server &"], check=False)
        return jsonify({"mensagem": "Frida reiniciado com sucesso!"})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# ==============================
# Execução de Frida
# ==============================
@socketio.on('executar_comando')
def executar_comando(data):
    dispositivo_id = data.get('dispositivo_id')
    pacote = data.get('pacote')
    scripts = data.get('scripts', [])
    forma = data.get('forma')

    script_args = []
    for script in scripts:
        script_path = os.path.join(SCRIPT_PATH, script)
        script_args.extend(['-l', script_path])

    cmd = ["frida", "-D", dispositivo_id, forma, pacote] + script_args
    run_cmd_background(cmd)

# ==============================
# Inicialização
# ==============================
if __name__ == '__main__':
    socketio.run(
        app,
        host='0.0.0.0',
        port=5001,
        debug=True,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
