document.addEventListener('DOMContentLoaded', () => {
    const dispositivosSelect = document.getElementById('dispositivos');
    const pacotesSelect = document.getElementById('pacotes');
    const listarDispositivosBtn = document.getElementById('listarDispositivosBtn');
    const listarPacotesBtn = document.getElementById('listarPacotesBtn');
    const ativarTcpipBtn = document.getElementById('ativarTcpipBtn');
    const log = document.getElementById('log');
    const socket = io();

    function appendLog(message) {
        log.textContent += `${message}\n`;
        log.scrollTop = log.scrollHeight;
    }

    function getSelectedForma() {
        const checked = document.querySelector('input[name="forma"]:checked');
        return checked ? checked.value : '-f';
    }

    function listarDispositivos() {
        appendLog('Listando dispositivos...');
        fetch('/listar_dispositivos')
            .then(res => res.json())
            .then(data => {
                dispositivosSelect.innerHTML = '<option value="">Selecionar dispositivo</option>';
                if (data.error) return appendLog(`Erro: ${data.error}`);
                data.forEach(dev => {
                    const opt = document.createElement('option');
                    opt.value = dev.id;
                    opt.textContent = `${dev.name} (${dev.type})`;
                    dispositivosSelect.appendChild(opt);
                });
                appendLog('Dispositivos carregados com sucesso!');
            })
            .catch(err => appendLog(`Erro: ${err.message}`));
    }

    function listarPacotes() {
        const dispositivoId = dispositivosSelect.value;
        const forma = getSelectedForma();
        if (!dispositivoId) return appendLog("Selecione um dispositivo.");

        appendLog(`Listando pacotes (${forma})...`);
        fetch('/listar_pacotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dispositivo_id: dispositivoId, forma: forma })
        })
        .then(res => res.json())
        .then(data => {
            pacotesSelect.innerHTML = '<option value="">Selecionar pacote</option>';
            if (data.error) return appendLog(`Erro: ${data.error}`);
            if (!data.length) return appendLog('Nenhum pacote encontrado.');

            data.forEach(pkg => {
                const opt = document.createElement('option');
                opt.value = pkg;
                opt.textContent = pkg;
                pacotesSelect.appendChild(opt);
            });
            appendLog('Pacotes carregados com sucesso!');
        })
        .catch(err => appendLog(`Erro: ${err.message}`));
    }

    function ativarTcpip() {
        const dispositivoId = dispositivosSelect.value;
        if (!dispositivoId) return appendLog("Selecione um dispositivo.");
        appendLog(`Ativando TCP/IP em ${dispositivoId}...`);
        fetch('/ativar_tcpip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dispositivo_id: dispositivoId, porta: 5555 })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) return appendLog(`Erro: ${data.error}`);
            appendLog(`✅ TCP/IP ativado! IP: ${data.ip}`);
            appendLog(`Conexão: ${data.connect_output}`);
        })
        .catch(err => appendLog(`Erro: ${err.message}`));
    }

    listarDispositivosBtn.addEventListener('click', listarDispositivos);
    listarPacotesBtn.addEventListener('click', listarPacotes);
    ativarTcpipBtn.addEventListener('click', ativarTcpip);

    socket.on('log', msg => appendLog(msg));
});
