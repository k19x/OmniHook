from flask import Flask, render_template, jsonify, request, send_file
from flask_socketio import SocketIO
import os
import subprocess
import threading
import time

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# ==============================
# Caminhos
# ==============================
current_directory = os.path.dirname(os.path.abspath(__file__))
SCRIPT_PATH = os.path.join(current_directory, "static", "js", "scripts")
UPLOAD_FOLDER = os.path.join(current_directory, "uploads")
DUMP_FOLDER = os.path.join(current_directory, "dumps")
OUTPUTS = os.path.join(current_directory, "outputs")

os.makedirs(SCRIPT_PATH, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DUMP_FOLDER, exist_ok=True)
os.makedirs(OUTPUTS, exist_ok=True)


# ==============================
# Funções auxiliares
# ==============================
def run_cmd_background(cmd):
    """Executa comando no background e envia saída para o console via socket."""
    def runner():
        try:
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
            )
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
# Rotas ADB básicas
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

                modelo = "Desconhecido"
                for p in partes:
                    if p.startswith("model:"):
                        modelo = p.split("model:")[1]
                        break

                conexao = "REDE" if ":" in device_id and device_id.count(".") == 3 else "USB"

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

    if not dispositivo_id:
        return jsonify({"erro": "ID do dispositivo não fornecido."}), 400

    try:
        # 1. Obter o IP atual do dispositivo (via Wi-Fi)
        cmd_ip = ["adb", "-s", dispositivo_id, "shell", "ip", "-f", "inet", "addr", "show", "wlan0"]
        resultado = subprocess.check_output(cmd_ip, text=True).splitlines()

        ip = None
        for linha in resultado:
            linha = linha.strip()
            if linha.startswith("inet "):
                ip = linha.split()[1].split("/")[0]
                break

        if not ip:
            return jsonify({"erro": "❌ Não foi possível identificar o IP do dispositivo via wlan0."}), 500

        # 2. Ativar o modo TCP/IP
        subprocess.run(["adb", "-s", dispositivo_id, "tcpip", "5555"], check=True)

        # 3. Conectar via IP
        connect_cmd = ["adb", "connect", f"{ip}:5555"]
        resultado_conexao = subprocess.check_output(connect_cmd, text=True).strip()

        return jsonify({
            "mensagem": f"✅ TCP/IP ativado e conexão via rede estabelecida com: {ip}:5555\n{resultado_conexao}",
            "ip": ip
        })

    except subprocess.CalledProcessError as e:
        return jsonify({"erro": f"[ADB ERRO] {e.output}"}), 500
    except Exception as e:
        return jsonify({"erro": f"[EXCEÇÃO] {str(e)}"}), 500

@app.route('/reiniciar_frida', methods=['POST'])
def reiniciar_frida():
    data = request.json
    dispositivo_id = data.get("dispositivo_id")
    try:
        subprocess.run(["adb", "-s", dispositivo_id, "shell", "su -c", "pkill", "-f", "frida-server"], check=False)
        subprocess.run(["adb", "-s", dispositivo_id, "shell", "su -c", "nohup", "./data/local/tmp/frida-server &"], check=False)
        return jsonify({"mensagem": "Frida reiniciado com sucesso!"})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/listar_templates', methods=['GET'])
def listar_templates():
    templates = [
        {"nome": "Bypass SSL Pinning", "arquivo": "bypass_ssl.js"},
        {"nome": "Anti-root Bypass", "arquivo": "antiroot.js"},
        {"nome": "Log de chamadas de APIs Java", "arquivo": "log_java.js"}
    ]
    return jsonify(templates)


@app.route("/adb/logcat", methods=["GET"])
def adb_logcat():
    try:
        process = subprocess.Popen(
            ["adb", "logcat"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        return jsonify({"status": "ok", "output": "Logcat iniciado"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})


# ==============================
# Funções Pentest Mobile Extras
# ==============================
# Screenshot
@app.route("/screenshot", methods=["POST"])
def screenshot():
    device_id = request.json.get("device")
    if not device_id:
        return jsonify({"erro": "Nenhum dispositivo selecionado"}), 400

    filename = os.path.join(OUTPUTS, f"screenshot_{device_id}.png")
    cmd = ["adb", "-s", device_id, "exec-out", "screencap", "-p"]

    try:
        with open(filename, "wb") as f:
            subprocess.run(cmd, stdout=f, check=True)
        return send_file(filename, mimetype="image/png")
    except Exception as e:
        return jsonify({"erro": f"Não foi possível capturar screenshot: {str(e)}"}), 500


# Screenrecord
@app.route("/screenrecord", methods=["POST"])
def screenrecord():
    device_id = request.json.get("device")
    duration = request.json.get("duration", 10)
    if not device_id:
        return jsonify({"erro": "Nenhum dispositivo selecionado"}), 400

    filename = os.path.join(OUTPUTS, f"screenrecord_{device_id}_{int(time.time())}.mp4")
    cmd = f"adb -s {device_id} shell screenrecord --time-limit {duration} /sdcard/out.mp4 && adb -s {device_id} pull /sdcard/out.mp4 {filename}"

    try:
        os.system(cmd)
        if os.path.exists(filename):
            return send_file(filename, mimetype="video/mp4")
        else:
            return jsonify({"erro": "Falha ao gravar tela"}), 500
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# Mirror
@app.route('/mirror', methods=['POST'])
def iniciar_mirror():
    try:
        data = request.json
        dispositivo_id = data.get("dispositivo_id")

        if not dispositivo_id:
            return jsonify({"erro": "Dispositivo não informado"}), 400

        base_dir = os.path.dirname(os.path.abspath(__file__))
        caminho_scrcpy = os.path.join(base_dir, "mirror", "scrcpy.exe")

        subprocess.Popen([caminho_scrcpy, "-s", dispositivo_id])
        return jsonify({"mensagem": f"✅ Mirror iniciado para {dispositivo_id} com sucesso!"})

    except Exception as e:
        return jsonify({"erro": f"Erro ao iniciar mirror: {str(e)}"}), 500

# Dump APK
@app.route("/dump_apk", methods=["POST"])
def dump_apk():
    device_id = request.json.get("device")
    package = request.json.get("package")
    if not device_id or not package:
        return jsonify({"erro": "Dispositivo ou pacote inválido"}), 400

    try:
        path = subprocess.check_output(["adb", "-s", device_id, "shell", "pm", "path", package], text=True).strip()
        if not path.startswith("package:"):
            return jsonify({"erro": f"Pacote {package} não encontrado"}), 404

        apk_path = path.replace("package:", "")
        filename = os.path.join(OUTPUTS, f"{package}.apk")
        subprocess.run(["adb", "-s", device_id, "pull", apk_path, filename], check=True)
        return send_file(filename, mimetype="application/vnd.android.package-archive")
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# Port Forward
@app.route("/port_forward", methods=["POST"])
def port_forward():
    device_id = request.json.get("device")
    local = request.json.get("local")
    remote = request.json.get("remote")

    if not device_id or not local or not remote:
        return jsonify({"erro": "Parâmetros inválidos"}), 400

    try:
        cmd = ["adb", "-s", device_id, "forward", f"tcp:{local}", f"tcp:{remote}"]
        subprocess.check_output(cmd, text=True)
        return jsonify({"resultado": f"Port forwarding ativo: {local} -> {remote}"})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    
@app.route("/set_proxy", methods=["POST"])
def set_proxy():
    data = request.json
    device_id = data.get("device")
    ip = data.get("ip")
    port = data.get("port")

    if not device_id or not ip or not port:
        return jsonify({"erro": "Parâmetros inválidos"}), 400

    try:
        cmd = ["adb", "-s", device_id, "shell", "su -c", "settings", "put", "global", "http_proxy", f"{ip}:{port}"]
        subprocess.run(cmd, check=True)
        return jsonify({"mensagem": f"✅ Proxy definido: {ip}:{port}"})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route("/get_proxy", methods=["POST"])
def get_proxy():
    data = request.json
    device_id = data.get("device")

    if not device_id:
        return jsonify({"erro": "Dispositivo não selecionado"}), 400

    try:
        cmd = ["adb", "-s", device_id, "shell", "su -c", "settings", "get", "global", "http_proxy"]
        resultado = subprocess.check_output(cmd, text=True).strip()
        return jsonify({"proxy": resultado})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route("/clear_proxy", methods=["POST"])
def clear_proxy():
    data = request.json
    device_id = data.get("device")

    if not device_id:
        return jsonify({"erro": "Dispositivo não selecionado"}), 400

    try:
        cmd = ["adb", "-s", device_id, "shell", "su -c", "settings", "put", "global", "http_proxy", ":0"]
        subprocess.run(cmd, check=True)
        return jsonify({"mensagem": "🧹 Proxy limpo com sucesso!"})
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
# ==============================