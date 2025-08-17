# 🔥 ADB & Frida Manager (Flask + Socket.IO)

Este projeto é uma interface web para gerenciar dispositivos Android conectados via **ADB**, listar pacotes instalados, executar **scripts Frida** em processos e automatizar tarefas de análise de segurança.

Foi desenvolvido em **Python (Flask + Flask-SocketIO)** com **frontend em HTML/JS**, permitindo interação em tempo real com logs e comandos.

---

## 🚀 Funcionalidades

- **Gerenciamento de dispositivos ADB**
  - Listar dispositivos conectados (USB e TCP/IP)
  - Mostrar modelo e tipo de conexão
  - Consultar status do dispositivo
  - Ativar modo **ADB TCP/IP**

- **Execução com Frida**
  - Reiniciar o `frida-server` remotamente
  - Listar pacotes instalados automaticamente ao selecionar o dispositivo
  - Selecionar e gerenciar múltiplos scripts `.js`
  - Executar scripts Frida em pacotes selecionados
  - Console de logs em tempo real (via Socket.IO)

- **Gerenciamento de scripts**
  - Upload de scripts `.js`
  - Listagem de scripts disponíveis
  - Seleção múltipla de scripts para execução

- **Console integrado**
  - Saída em tempo real dos comandos
  - Botão de limpar console
  - Exportar logs para arquivo `.txt`

---

## 📦 Pré-requisitos

- **Python 3.9+**
- **ADB** instalado e acessível no `PATH`
- **Frida** instalado no host:
  ```bash
  pip install frida-tools
