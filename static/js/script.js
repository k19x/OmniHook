document.addEventListener('DOMContentLoaded', () => {
    const listarDispositivosBtn = document.getElementById('listarDispositivosBtn');
    const dispositivosSelect = document.getElementById('dispositivos');
    const listarPacotesBtn = document.getElementById('listarPacotesBtn');
    const pacotesSelect = document.getElementById('pacotes');
    const listarScriptsBtn = document.getElementById('listarScriptsBtn');
    const scriptsSelect = document.getElementById('scripts');
    const adicionarScriptBtn = document.getElementById('adicionarScriptBtn');
    const scriptsSelecionados = document.getElementById('scriptsSelecionados');
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
        console.log(`[LOG] ${message}`); // Log adicional no console
    }

    // Função para limpar o console
    function clearLog() {
        log.textContent = '';
        console.clear(); // Limpa o console do navegador
    }

    // Função para capturar a forma selecionada (-f, -F ou -n)
    function getSelectedForma() {
        const formaRadio = document.querySelector('input[name="forma"]:checked');
        return formaRadio ? formaRadio.value : '-f'; // Retorna -f como padrão
    }

    // Função para verificar o estado dos pacotes e scripts
    function verificarEstado() {
        const forma = getSelectedForma();

        if (forma === '-F') {
            // Ativa apenas "Listar Scripts" e "Adicionar Script"
            listarPacotesBtn.disabled = true;
            pacotesSelect.disabled = true;
            pacotesSelect.innerHTML = '<option value="">Selecionar pacote</option>';
            listarScriptsBtn.disabled = false;
            adicionarScriptBtn.disabled = false;
        } else {
            // Ativa "Listar Pacotes" e controla o estado de outros botões
            listarPacotesBtn.disabled = !dispositivosSelect.value;
            pacotesSelect.disabled = !dispositivosSelect.value;
            listarScriptsBtn.disabled = !pacotesSelect.value;
            adicionarScriptBtn.disabled = true; // Adicionar script desabilitado até listar scripts
        }
        verificarExecutarBtn(); // Atualiza o estado do botão "Executar"
    }

    // Função para listar dispositivos
    function listarDispositivos() {
        appendLog('Listando dispositivos...');
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
                verificarEstado();
            })
            .catch(error => appendLog(`Erro ao listar dispositivos: ${error}`));
    }

    // Função para listar pacotes
    function listarPacotes() {
        const dispositivoId = dispositivosSelect.value;
        const forma = getSelectedForma(); // Captura a forma selecionada
    
        if (!dispositivoId) {
            appendLog('Selecione um dispositivo para listar os pacotes.');
            return;
        }
    
        if (forma === '-F') {
            appendLog('Anexar ao processo iniciado (-F) não requer seleção de pacotes.');
            pacotesSelect.disabled = true; // Desabilita o dropdown de pacotes
            pacotesSelect.innerHTML = '<option value="">Selecionar pacote</option>';
            verificarEstado(); // Atualiza o estado dos botões
            return;
        }
    
        appendLog('Listando pacotes...');
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
            appendLog('Pacotes carregados com sucesso!');
            verificarEstado(); // Atualiza o estado dos botões
        })
        .catch(error => appendLog(`Erro ao listar pacotes: ${error}`));
    }

    // Função para listar scripts
    function listarScripts() {
        appendLog('Listando scripts disponíveis...');
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
                adicionarScriptBtn.disabled = false; // Habilita o botão "Adicionar Script"
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
            verificarExecutarBtn();
        });

        li.appendChild(removeBtn);
        scriptsSelecionados.appendChild(li);
        appendLog(`Script adicionado: ${script}`);
        verificarExecutarBtn();
    }

    // Função para verificar e habilitar/desabilitar o botão Executar
    function verificarExecutarBtn() {
        const forma = getSelectedForma();
        const dispositivoSelecionado = !!dispositivosSelect.value;
        const pacoteSelecionado = !!pacotesSelect.value;
        const scriptsSelecionados = selectedScripts.length > 0;

        if (forma === '-F') {
            executarBtn.disabled = !dispositivoSelecionado || !scriptsSelecionados;
        } else {
            executarBtn.disabled = !dispositivoSelecionado || !pacoteSelecionado || !scriptsSelecionados;
        }
    }

    // Função para executar o comando
    function executarComando() {
        const dispositivoId = dispositivosSelect.value;
        const pacote = pacotesSelect.value;
        const forma = getSelectedForma();

        if (!dispositivoId || selectedScripts.length === 0 || (forma !== '-F' && !pacote)) {
            appendLog('Por favor, selecione dispositivo, pacote (exceto em -F) e ao menos um script.');
            return;
        }

        const comandoLog = {
            dispositivo_id: dispositivoId,
            scripts: selectedScripts,
            forma: forma
        };

        if (forma !== '-F') {
            comandoLog.pacote = pacote;
        }

        // Receber mensagens em tempo real do servidor
        socket.on('log', (message) => {
            appendLog(message);
            console.log(`[BACKEND] ${message}`); // Log adicional para mensagens do backend
        });

        appendLog(`Preparando comando: ${JSON.stringify(comandoLog)}`);
        socket.emit('executar_comando', comandoLog);
    }

         // salvar logs
         function salvarLogs() {
            const logContent = log.textContent;
            if (!logContent) {
                appendLog('Nenhum log disponível para salvar.');
                return;
            }
        
            const blob = new Blob([logContent], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'console_logs.txt';
            link.click();
            URL.revokeObjectURL(link.href);
        
            appendLog('Logs salvos como console_logs.txt.');
        }
    
        // refresh
        function refreshPagina() {
            appendLog('Atualizando a página...');
            location.reload();
        }
    
    

    // Configurar eventos
    listarDispositivosBtn.addEventListener('click', listarDispositivos);
    listarPacotesBtn.addEventListener('click', listarPacotes);
    listarScriptsBtn.addEventListener('click', listarScripts);
    dispositivosSelect.addEventListener('change', verificarEstado);
    pacotesSelect.addEventListener('change', verificarEstado);
    formaRadios.forEach(radio => radio.addEventListener('change', verificarEstado));
    adicionarScriptBtn.addEventListener('click', adicionarScript);
    executarBtn.addEventListener('click', executarComando);
    clearLogBtn.addEventListener('click', clearLog);
    document.getElementById('saveLogBtn').addEventListener('click', salvarLogs);
    document.getElementById('refreshBtn').addEventListener('click', refreshPagina);


    // Definir estado inicial
    verificarEstado();
});
