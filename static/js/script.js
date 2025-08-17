// Conexão com Socket.IO
var socket = io();

// Função para adicionar mensagens no console
function adicionarLog(mensagem) {
    const consoleElem = document.getElementById('log');
    const p = document.createElement('p');
    p.textContent = mensagem;
    p.style.color = "#00ff88";
    consoleElem.appendChild(p);
    consoleElem.scrollTop = consoleElem.scrollHeight;
}

// Receber logs do backend
socket.on('log', function (mensagem) {
    if (typeof mensagem === "object") {
        adicionarLog(JSON.stringify(mensagem));
    } else {
        adicionarLog(mensagem);
    }
});

// Habilitar funções ADB quando um dispositivo for selecionado
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

    // 🚀 NOVO: carregar pacotes automaticamente ao selecionar o dispositivo
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

                // Seleciona automaticamente o primeiro pacote
                select.selectedIndex = 0;

                adicionarLog(`[PACOTES] Pacotes do dispositivo ${selectedDevice} carregados!`);
            } else {
                adicionarLog(`[PACOTES] Nenhum pacote encontrado para ${selectedDevice}.`);
            }
        })
        .catch(err => adicionarLog(`[ERRO PACOTES AUTO] ${err}`));
    }
});

// ---- BOTÕES ----

// Ativar TCP/IP
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

// Status Conexão
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

// Reiniciar Frida
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

// ---- OUTRAS FUNÇÕES DO SISTEMA ----

// Listar dispositivos
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

// Listar pacotes (fallback manual)
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

            select.selectedIndex = 0; // seleciona primeiro pacote
            adicionarLog("[PACOTES] Lista carregada com sucesso!");
        } else {
            adicionarLog("[PACOTES] Nenhum pacote encontrado.");
        }
    })
    .catch(err => adicionarLog(`[ERRO PACOTES] ${err}`));
});

// Listar scripts
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

// Adicionar script na lista de selecionados
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

    adicionarLog(`[SCRIPT] ${selectedScript} adicionado à execução.`);

    // Habilitar botão Executar se houver dispositivo, pacote e script
    const dispositivoSelecionado = document.getElementById('dispositivos').value.trim() !== "";
    const pacoteSelecionado = document.getElementById('pacotes').value.trim() !== "";
    if (dispositivoSelecionado && pacoteSelecionado) {
        document.getElementById('executarBtn').disabled = false;
    }
});

// Executar Frida
document.getElementById('executarBtn').addEventListener('click', function () {
    const dispositivo_id = document.getElementById('dispositivos').value;
    const pacote = document.getElementById('pacotes').value;
    const forma = document.querySelector('input[name="forma"]:checked').value;

    // Pega todos os scripts selecionados
    const scripts = [];
    document.querySelectorAll('#scriptsSelecionados li').forEach(li => {
        scripts.push(li.firstChild.textContent);
    });

    if (!dispositivo_id || !pacote || scripts.length === 0) {
        adicionarLog("[ERRO] Selecione um dispositivo, um pacote e pelo menos um script.");
        return;
    }

    // Envia para o backend via Socket.IO
    socket.emit('executar_comando', {
        dispositivo_id,
        pacote,
        scripts,
        forma
    });

    adicionarLog("[INFO] Comando enviado para execução.");
});

socket.on('console_output', function(data) {
    const consoleDiv = document.getElementById('console');
    consoleDiv.innerHTML += `<span class="${data.tipo}">${data.mensagem}</span><br>`;
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
});

// ===== BOTÕES DO CONSOLE =====

// Limpar console
document.getElementById('clearLogBtn').addEventListener('click', function () {
    const consoleElem = document.getElementById('log');
    consoleElem.innerHTML = "";
    adicionarLog("[INFO] Console limpo.");
});

// Salvar console em arquivo
document.getElementById('saveLogBtn').addEventListener('click', function () {
    const consoleElem = document.getElementById('log');
    let conteudo = consoleElem.innerText || consoleElem.textContent;

    if (!conteudo.trim()) {
        adicionarLog("[ERRO] Console vazio, nada para salvar.");
        return;
    }

    let blob = new Blob([conteudo], { type: "text/plain" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "log_frida.txt";
    a.click();

    URL.revokeObjectURL(url);
    adicionarLog("[INFO] Log salvo como log_frida.txt");
});

// Atualizar página (Refresh)
document.getElementById('refreshBtn').addEventListener('click', function () {
    location.reload();
});
// ===== FIM BOTÕES DO CONSOLE =====