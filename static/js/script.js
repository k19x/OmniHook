document.addEventListener('DOMContentLoaded', () => {
    const listarDispositivosBtn = document.getElementById('listarDispositivosBtn');
    const dispositivosSelect = document.getElementById('dispositivos');
    const listarPacotesBtn = document.getElementById('listarPacotesBtn');
    const pacotesSelect = document.getElementById('pacotes');
    const listarScriptsBtn = document.getElementById('listarScriptsBtn');
    const scriptsSelect = document.getElementById('scripts');
    const adicionarScriptBtn = document.getElementById('adicionarScriptBtn'); // Botão para adicionar scripts
    const scriptsSelecionados = document.getElementById('scriptsSelecionados'); // Lista de scripts selecionados
    const executarBtn = document.getElementById('executarBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const formaRadios = document.querySelectorAll('input[name="forma"]');
    const log = document.getElementById('log');

    const socket = io();

    let selectedScripts = []; // Lista de scripts selecionados

    // Função para adicionar mensagens ao log
    function appendLog(message) {
        log.textContent += `${message}\n`;
        log.scrollTop = log.scrollHeight; // Scroll automático para o final
    }

    // Função para limpar o console
    function clearLog() {
        log.textContent = '';
    }

    // Função para capturar a forma selecionada (-f ou -n)
    function getSelectedForma() {
        const formaRadio = document.querySelector('input[name="forma"]:checked');
        return formaRadio ? formaRadio.value : '-f'; // Retorna -f como padrão
    }

    // Função para listar dispositivos
    function listarDispositivos() {
        fetch('/listar_dispositivos')
            .then(response => response.json())
            .then(data => {
                dispositivosSelect.innerHTML = '<option value="">Selecionar dispositivo</option>';
                if (data.error) {
                    appendLog(data.error);
                    return;
                }
                data.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.id;
                    option.textContent = `${device.name} (${device.type})`;
                    dispositivosSelect.appendChild(option);
                });
                appendLog('Dispositivos carregados com sucesso!');
            })
            .catch(error => appendLog(`Erro ao listar dispositivos: ${error}`));
    }

    // Função para listar pacotes
    function listarPacotes() {
        const dispositivoId = dispositivosSelect.value;
        const forma = getSelectedForma();

        fetch('/listar_pacotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dispositivo_id: dispositivoId, forma: forma })
        })
            .then(response => response.json())
            .then(data => {
                pacotesSelect.innerHTML = '<option value="">Selecionar pacote</option>';
                if (data.error) {
                    appendLog(data.error);
                    return;
                }
                data.forEach(pacote => {
                    const option = document.createElement('option');
                    option.value = pacote;
                    option.textContent = pacote;
                    pacotesSelect.appendChild(option);
                });
                appendLog(`Pacotes carregados com sucesso (${forma === '-f' ? 'por pacote' : 'por nome do app'})!`);
                listarScriptsBtn.disabled = false; // Habilita botão de listar scripts
            })
            .catch(error => appendLog(`Erro ao listar pacotes: ${error}`));
    }

    // Função para listar scripts
    function listarScripts() {
        fetch('/listar_scripts')
            .then(response => response.json())
            .then(data => {
                scriptsSelect.innerHTML = '<option value="">Selecionar script</option>';
                if (data.error) {
                    appendLog(data.error);
                    return;
                }
                data.forEach(script => {
                    const option = document.createElement('option');
                    option.value = script;
                    option.textContent = script;
                    scriptsSelect.appendChild(option);
                });
                appendLog('Scripts carregados com sucesso!');
                adicionarScriptBtn.disabled = false; // Habilita botão para adicionar scripts
            })
            .catch(error => appendLog(`Erro ao listar scripts: ${error}`));
    }

    // Função para adicionar scripts à lista
    function adicionarScript() {
        const script = scriptsSelect.value;
        if (!script || selectedScripts.includes(script)) {
            appendLog('Script já adicionado ou não selecionado.');
            return;
        }
        selectedScripts.push(script);

        const li = document.createElement('li');
        li.textContent = script;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remover';
        removeBtn.addEventListener('click', () => {
            li.remove();
            selectedScripts = selectedScripts.filter(s => s !== script);
            verificarExecutarBtn(); // Verifica se o botão Executar deve ser desativado
        });

        li.appendChild(removeBtn);
        scriptsSelecionados.appendChild(li);
        appendLog(`Script adicionado: ${script}`);
        verificarExecutarBtn(); // Verifica se o botão Executar deve ser ativado
    }

    // Função para verificar e habilitar o botão Executar
    function verificarExecutarBtn() {
        executarBtn.disabled = selectedScripts.length === 0 || !dispositivosSelect.value || !pacotesSelect.value;
    }

    // Função para executar o comando
    function executarComando() {
        const dispositivoId = dispositivosSelect.value;
        const pacote = pacotesSelect.value;
        const forma = getSelectedForma();

        if (!dispositivoId || !pacote || selectedScripts.length === 0) {
            appendLog('Por favor, selecione dispositivo, pacote e ao menos um script.');
            return;
        }

        // Enviar comando ao servidor via Socket.IO
        socket.emit('executar_comando', {
            dispositivo_id: dispositivoId,
            pacote: pacote,
            scripts: selectedScripts, // Enviar todos os scripts selecionados
            forma: forma
        });
    }

    // Receber mensagens em tempo real do servidor
    socket.on('log', (message) => {
        appendLog(message);
    });

    // Eventos
    listarDispositivosBtn.addEventListener('click', listarDispositivos);

    dispositivosSelect.addEventListener('change', () => {
        listarPacotesBtn.disabled = !dispositivosSelect.value;
        pacotesSelect.innerHTML = '<option value="">Selecionar pacote</option>'; // Limpa pacotes
        listarScriptsBtn.disabled = true;
        adicionarScriptBtn.disabled = true;
        verificarExecutarBtn();
    });

    listarPacotesBtn.addEventListener('click', listarPacotes);

    pacotesSelect.addEventListener('change', () => {
        listarScriptsBtn.disabled = false; // Habilita botão de listar scripts
        verificarExecutarBtn();
    });

    listarScriptsBtn.addEventListener('click', listarScripts);

    adicionarScriptBtn.addEventListener('click', adicionarScript);

    executarBtn.addEventListener('click', executarComando);

    clearLogBtn.addEventListener('click', clearLog);

    formaRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            listarPacotesBtn.disabled = !dispositivosSelect.value;
            pacotesSelect.innerHTML = '<option value="">Selecionar pacote</option>'; // Limpa pacotes ao trocar forma
            listarScriptsBtn.disabled = true;
            adicionarScriptBtn.disabled = true;
            verificarExecutarBtn();
        });
    });
});


// Seleciona o elemento <h3> pelo ID ou pelo texto
const titleElement = document.getElementById('gerenciador-title');

// Função para alternar o texto
function toggleFridaText() {
    let currentText = titleElement.textContent;
    
    // Alterna entre "Fr1da" e "Frida"
    if (currentText.includes("Frida")) {
        titleElement.textContent = currentText.replace("Frida", "Fr1da");
    } else if (currentText.includes("Fr1da")) {
        titleElement.textContent = currentText.replace("Fr1da", "Frida");
    }
}

// Define um intervalo para alternar o texto a cada 1 segundo
setInterval(toggleFridaText, 1000);
