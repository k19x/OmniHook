// ==================== CONEXÃO COM BACKEND ==================== //
var socket = io();

function adicionarLog(mensagem) {
    const consoleElem = document.getElementById('log');
    consoleElem.textContent += mensagem + "\n";
    consoleElem.scrollTop = consoleElem.scrollHeight;
}

socket.on('log', function (mensagem) {
    if (typeof mensagem === "object") {
        adicionarLog(JSON.stringify(mensagem));
    } else {
        adicionarLog(mensagem);
    }
});

socket.on('console_output', function(data) {
    const consoleDiv = document.getElementById('console');
    consoleDiv.innerHTML += `<span class="${data.tipo}">${data.mensagem}</span><br>`;
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
});

// ==================== EVENTOS DE DISPOSITIVO ==================== //
document.getElementById('dispositivos').addEventListener('change', function () {
    let selectedDevice = this.value;
    let botoes = [
        document.getElementById('ativarTcpipBtn'),
        document.getElementById('statusConexaoBtn'),
        document.getElementById('reiniciarFridaBtn'),
        document.getElementById('listarPacotesBtn'),
        document.getElementById('listarScriptsBtn')
    ];

    botoes.forEach(btn => btn.disabled = !selectedDevice.trim());

    if (selectedDevice.trim()) {
        fetch('/listar_pacotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dispositivo_id: selectedDevice })
        })
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('pacotes');
            select.innerHTML = '';
            if (data.length > 0) {
                data.forEach(pkg => {
                    let opt = document.createElement('option');
                    opt.value = pkg;
                    opt.textContent = pkg;
                    select.appendChild(opt);
                });
                select.selectedIndex = 0;
                adicionarLog(`[PACOTES] Pacotes do dispositivo ${selectedDevice} carregados!`);
            } else {
                adicionarLog(`[PACOTES] Nenhum pacote encontrado para ${selectedDevice}.`);
            }
        })
        .catch(err => adicionarLog(`[ERRO PACOTES AUTO] ${err}`));
    }
});

// ==================== BOTÕES DE ADB ==================== //
document.getElementById('ativarTcpipBtn').addEventListener('click', function () {
    let dispositivo_id = document.getElementById('dispositivos').value;
    fetch('/ativar_tcpip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispositivo_id })
    })
    .then(res => res.json())
    .then(data => adicionarLog(`[TCP/IP] ${data.mensagem || JSON.stringify(data)}`))
    .catch(err => adicionarLog(`[ERRO TCP/IP] ${err}`));
});

document.getElementById('statusConexaoBtn').addEventListener('click', function () {
    let dispositivo_id = document.getElementById('dispositivos').value;
    fetch('/status_conexao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispositivo_id })
    })
    .then(res => res.json())
    .then(data => adicionarLog(`[STATUS] ${data.mensagem || JSON.stringify(data)}`))
    .catch(err => adicionarLog(`[ERRO STATUS] ${err}`));
});

document.getElementById('reiniciarFridaBtn').addEventListener('click', function () {
    let dispositivo_id = document.getElementById('dispositivos').value;
    fetch('/reiniciar_frida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispositivo_id })
    })
    .then(res => res.json())
    .then(data => adicionarLog(`[FRIDA] ${data.mensagem || JSON.stringify(data)}`))
    .catch(err => adicionarLog(`[ERRO FRIDA] ${err}`));
});

// ==================== LISTAGEM ==================== //
document.getElementById('listarDispositivosBtn').addEventListener('click', function () {
    fetch('/listar_dispositivos')
    .then(res => res.json())
    .then(data => {
        const select = document.getElementById('dispositivos');
        select.innerHTML = '<option value="">Selecionar dispositivo</option>';
        if (data.length > 0) {
            data.forEach(disp => {
                let opt = document.createElement('option');
                opt.value = disp.id;
                opt.textContent = `${disp.name} (${disp.conexao})`;
                select.appendChild(opt);
            });
            adicionarLog("[DISPOSITIVOS] Lista carregada com sucesso!");
        } else {
            adicionarLog("[DISPOSITIVOS] Nenhum dispositivo encontrado.");
        }
    })
    .catch(err => adicionarLog(`[ERRO DISPOSITIVOS] ${err}`));
});

document.getElementById('listarPacotesBtn').addEventListener('click', function () {
    let dispositivo_id = document.getElementById('dispositivos').value;
    fetch('/listar_pacotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispositivo_id })
    })
    .then(res => res.json())
    .then(data => {
        const select = document.getElementById('pacotes');
        select.innerHTML = '';
        if (data.length > 0) {
            data.forEach(pkg => {
                let opt = document.createElement('option');
                opt.value = pkg;
                opt.textContent = pkg;
                select.appendChild(opt);
            });
            select.selectedIndex = 0;
            adicionarLog("[PACOTES] Lista carregada com sucesso!");
        } else {
            adicionarLog("[PACOTES] Nenhum pacote encontrado.");
        }
    })
    .catch(err => adicionarLog(`[ERRO PACOTES] ${err}`));
});

document.getElementById('listarScriptsBtn').addEventListener('click', function () {
    fetch('/listar_scripts')
    .then(res => res.json())
    .then(data => {
        const select = document.getElementById('scripts');
        select.innerHTML = '<option value="">Selecionar script</option>';
        if (data.length > 0) {
            data.forEach(script => {
                let opt = document.createElement('option');
                opt.value = script;
                opt.textContent = script;
                select.appendChild(opt);
            });
            adicionarLog("[SCRIPTS] Lista carregada com sucesso!");
            document.getElementById('adicionarScriptBtn').disabled = false;
        } else {
            adicionarLog("[SCRIPTS] Nenhum script encontrado.");
        }
    })
    .catch(err => adicionarLog(`[ERRO SCRIPTS] ${err}`));
});

document.getElementById('listarTemplatesBtn').addEventListener('click', function () {
    fetch('/listar_templates')
    .then(res => res.json())
    .then(data => {
        const select = document.getElementById('templates');
        select.innerHTML = '<option value="">Selecionar template</option>';
        data.forEach(t => {
            let opt = document.createElement('option');
            opt.value = t.arquivo;
            opt.textContent = t.nome;
            select.appendChild(opt);
        });
        adicionarLog("[TEMPLATES] Carregados com sucesso!");
        document.getElementById('adicionarTemplateBtn').disabled = false;
    });
});

// ==================== FRIDA E EXECUÇÃO ==================== //
document.getElementById('adicionarScriptBtn').addEventListener('click', function () {
    const scriptSelect = document.getElementById('scripts');
    const selectedScript = scriptSelect.value;
    if (!selectedScript) {
        adicionarLog("[ERRO] Nenhum script selecionado.");
        return;
    }

    const lista = document.getElementById('scriptsSelecionados');
    const li = document.createElement('li');
    li.textContent = selectedScript;

    const btnRemove = document.createElement('button');
    btnRemove.textContent = "Remover";
    btnRemove.addEventListener('click', function () {
        lista.removeChild(li);
        if (lista.children.length === 0) {
            document.getElementById('executarBtn').disabled = true;
        }
    });

    li.appendChild(btnRemove);
    lista.appendChild(li);

    adicionarLog(`[SCRIPT] ${selectedScript} adicionado.`);

    if (document.getElementById('dispositivos').value && document.getElementById('pacotes').value) {
        document.getElementById('executarBtn').disabled = false;
    }
});

document.getElementById('executarBtn').addEventListener('click', function () {
    const dispositivo_id = document.getElementById('dispositivos').value;
    const pacote = document.getElementById('pacotes').value;
    const forma = document.querySelector('input[name="forma"]:checked').value;

    const scripts = [];
    document.querySelectorAll('#scriptsSelecionados li').forEach(li => {
        scripts.push(li.firstChild.textContent);
    });

    if (!dispositivo_id || !pacote || scripts.length === 0) {
        adicionarLog("[ERRO] Selecione dispositivo, pacote e script.");
        return;
    }

    socket.emit('executar_comando', { dispositivo_id, pacote, scripts, forma });
    adicionarLog("[INFO] Comando enviado para execução.");
});

// ==================== PROXY ==================== //
function getSelectedDevice() {
    return document.getElementById("dispositivos").value;
}

async function setProxy() {
    const device = getSelectedDevice();
    const ip = document.getElementById("proxy-ip").value;
    const port = document.getElementById("proxy-port").value;

    if (!device) {
        adicionarLog("[ERRO] Nenhum dispositivo selecionado para aplicar proxy!");
        return;
    }

    try {
        const res = await fetch("/set_proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device, ip, port })
        });
        const data = await res.json();
        adicionarLog(`[PROXY] ${data.mensagem || data.erro}`);
    } catch (err) {
        adicionarLog(`[ERRO PROXY] ${err}`);
    }
}

async function getProxy() {
    const device = getSelectedDevice();
    if (!device) {
        adicionarLog("[ERRO] Nenhum dispositivo selecionado para ver proxy!");
        return;
    }

    try {
        const res = await fetch("/get_proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device })
        });
        const data = await res.json();
        adicionarLog(`[PROXY] Proxy atual: ${data.proxy || data.erro}`);
    } catch (err) {
        adicionarLog(`[ERRO PROXY] ${err}`);
    }
}

async function clearProxy() {
    const device = getSelectedDevice();
    if (!device) {
        adicionarLog("[ERRO] Nenhum dispositivo selecionado para limpar proxy!");
        return;
    }

    try {
        const res = await fetch("/clear_proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device })
        });
        const data = await res.json();
        adicionarLog(`[PROXY] ${data.mensagem || data.erro}`);
    } catch (err) {
        adicionarLog(`[ERRO PROXY] ${err}`);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById("setProxyBtn")?.addEventListener("click", setProxy);
    document.getElementById("getProxyBtn")?.addEventListener("click", getProxy);
    document.getElementById("clearProxyBtn")?.addEventListener("click", clearProxy);
    document.getElementById('clearLogBtn')?.addEventListener('click', () => {
        document.getElementById('log').innerHTML = "";
        adicionarLog("[INFO] Console limpo.");
    });
    document.getElementById('saveLogBtn')?.addEventListener('click', () => {
        const consoleElem = document.getElementById('log');
        const conteudo = consoleElem.innerText || consoleElem.textContent;

        if (!conteudo.trim()) {
            adicionarLog("[ERRO] Console vazio, nada para salvar.");
            return;
        }

        const pacote = document.getElementById('pacotes').value || "sem-pacote";
        const agora = new Date();
        const dataHora = agora.toISOString().replace("T", "_").replace(/:/g, "-").split(".")[0];
        const nomeArquivo = `${dataHora}_${pacote}.txt`;

        const blob = new Blob([conteudo], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo;
        a.click();
        URL.revokeObjectURL(url);

        adicionarLog(`[INFO] Log salvo como ${nomeArquivo}`);
    });
    document.getElementById('refreshBtn')?.addEventListener('click', () => location.reload());
});

// screenshot
document.getElementById('screenshotBtn').addEventListener('click', function () {
    const dispositivo_id = document.getElementById('dispositivos').value;
    
    if (!dispositivo_id) {
        adicionarLog("[ERRO] Nenhum dispositivo selecionado para screenshot.");
        return;
    }

    fetch('/screenshot', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: dispositivo_id })
    })
    .then(res => res.blob())
    .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        adicionarLog(`[SCREENSHOT] Captura concluída para ${dispositivo_id}`);
    })
    .catch(err => adicionarLog(`[ERRO SCREENSHOT] ${err}`));
});

// Mirror
document.getElementById('mirrorBtn').addEventListener('click', () => {
    const dispositivo_id = document.getElementById('dispositivos').value;

    if (!dispositivo_id) {
        adicionarLog("[ERRO] Nenhum dispositivo selecionado para mirror.");
        return;
    }

    fetch('/mirror', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispositivo_id })
    })
    .then(res => res.json())
    .then(data => {
        adicionarLog(`[MIRROR] ${data.mensagem || data.erro}`);
    })
    .catch(err => adicionarLog(`[ERRO MIRROR] ${err}`));
});