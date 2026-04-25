---
title: "Race Conditions Single-Endpoint"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Practitioner"
date: 2026-04-15
techniques: ["Hidden Multi-Step", "Email Change Race", "Account Takeover"]
description: "Race single-endpoint na troca de email, duas requisições paralelas fazem o token de confirmação da vítima ir pro inbox do atacante, virando account takeover."
lang: pt-br
translation_key: race-condition-single-endpoint
permalink: /writeups/race-condition-single-endpoint/pt/
---

## Plataforma
PortSwigger Web Security Academy

## Categoria
Race Conditions

## Dificuldade
Practitioner

## Objetivo
Explorar uma race condition na funcionalidade de troca de email pra ganhar acesso a `carlos@ginandjuice.shop`, acessar o painel admin e deletar o usuário carlos.

---

## Contexto

O lab tem um recurso de troca de email que envia um link de confirmação pro novo endereço. Internamente, o servidor processa isso em múltiplos passos escondidos: gera um token de confirmação, associa ao email alvo, e envia o email de confirmação. Existe uma race condition dentro desse único endpoint, ao enviar duas requisições de troca de email simultaneamente (uma pra um email controlado, outra pro email da vítima), o token de confirmação pode ser associado ao email da vítima mas enviado pro email do atacante.

---

## Reconhecimento

### Credenciais
- **Username:** wiener
- **Password:** peter
- **Email do atacante:** wiener@exploit-0a6a00380326974481fa294f013400f8.exploit-server.net
- **Email alvo:** carlos@ginandjuice.shop

### Endpoints Principais

| Endpoint | Método | Propósito |
|---|---|---|
| `/my-account/change-email` | POST | Solicitar troca de email (envia link de confirmação) |
| `/my-account` | GET | Ver detalhes da conta |
| `/admin` | GET | Painel admin (requer email admin) |
| `/admin/delete?username=carlos` | GET | Deletar usuário |

### Requisição de Troca de Email
```http
POST /my-account/change-email HTTP/2
Host: 0a09002803fa973c81ce2a4300e700e9.web-security-academy.net
Cookie: session=LBNrDmsD4sjEPKFxzkisV6k17Go2SHD7
Content-Type: application/x-www-form-urlencoded

email=wiener@exploit-0a6a00380326974481fa294f013400f8.exploit-server.net&csrf=MROq5uKyM7Rpm5V96noKw7dB5goieBp7
```

### Observações
- A troca de email exige clicar num link de confirmação enviado pro novo endereço
- O link de confirmação é enviado pro email especificado na requisição
- O servidor processa a troca em múltiplos passos internos dentro de uma única requisição
- O processo multi-step escondido cria uma janela de race entre geração do token e associação do email

---

## Exploração

### Fluxo Vulnerável (Hidden Multi-Step)
```
Fluxo normal de uma requisição:
  POST change-email (carlos@...) → Gerar token → Associar com carlos@... → Enviar pra carlos@...

Race condition com duas requisições paralelas:
  Requisição 1 (wiener@...):  Gerar token → Associar com wiener@... → Enviar pra wiener@...
  Requisição 2 (carlos@...):  Gerar token → Associar com carlos@... → Enviar pra ???

  Se o timing alinhar:
  Requisição 1: Gerar token(A) → ...
  Requisição 2: Gerar token(B) → Associar com carlos@... → Enviar token(B) pra wiener@...!
                                                                ↑
                              Token pra carlos@... vai pro email do atacante
```

### Passos do Ataque

1. **Logado** como `wiener:peter` e naveguei pro My Account
2. **Troquei o email** pro endereço do atacante pra capturar o `POST /my-account/change-email`
3. **Verifiquei o fluxo de email**, checkei o cliente de Email e confirmei que o link de confirmação chegou
4. **Enviei a requisição pro Repeater** e dupliquei a aba
5. **Configurei as duas requisições:**
   - Tab 1: `email=wiener@exploit-0a6a00380326974481fa294f013400f8.exploit-server.net` (email do atacante)
   - Tab 2: `email=carlos@ginandjuice.shop` (email alvo)
6. **Criei grupo de tabs** com as duas
7. **Enviei o grupo em paralelo** (single-packet attack), repeti aproximadamente 30 vezes
8. **Checava o cliente de Email** depois de cada batch, eventualmente recebi um email de confirmação mencionando `carlos@ginandjuice.shop`
9. **Cliquei no link de confirmação**, email trocado pra `carlos@ginandjuice.shop`
10. **Acessei o painel Admin**, agora disponível com email admin
11. **Deletei o usuário carlos**, lab solved

### Resultado
- **Account takeover alcançada** via race condition em troca de email
- **Acesso admin obtido** ao associar a conta com `carlos@ginandjuice.shop`
- **Usuário carlos deletado** pelo painel admin
- **Tentativas necessárias:** ~30 batches paralelos

---

## Mapeamento MITRE ATT&CK

| Tática | Técnica | ID |
|---|---|---|
| Initial Access | Valid Accounts | T1078 |
| Privilege Escalation | Exploitation for Privilege Escalation | T1068 |
| Persistence | Account Manipulation | T1098 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-367:** Time-of-Check Time-of-Use (TOCTOU) Race Condition

---

## Conceitos-Chave Aprendidos

| Conceito | Descrição |
|---|---|
| Sequência Multi-Step Escondida | Endpoint único que internamente processa múltiplos passos (geração de token, associação de email, envio) com janelas de race entre eles |
| Race Condition Single-Endpoint | Diferente de ataques multi-endpoint, isso explora sub-estados internos dentro de um único handler de requisição |
| Account Takeover via Troca de Email | Race condition faz o token de confirmação do email da vítima ser enviado pro email do atacante |
| Persistência Necessária | Esse ataque tem janela de race pequena, aproximadamente 30 tentativas foram necessárias pra acertar o timing |

---

## Ferramentas Utilizadas

| Ferramenta | Propósito |
|---|---|
| Burp Suite Community | Proxy, HTTP History, Repeater |
| Burp Repeater (Group Send) | Envio de duas requisições de troca de email em paralelo via single-packet attack |
| Email Client (lab) | Monitorar emails de confirmação com o endereço da vítima |
| Firefox (Kali) | Navegador com proxy configurado em 127.0.0.1:8080 |

---

## Cheatsheet de Comandos & Técnicas

```
# Fluxo de Ataque de Race Condition Single-Endpoint
1. Capturar POST /change-email em Proxy → HTTP History
2. Enviar pro Repeater → Duplicar tab
3. Tab 1: email=attacker@controlled.com (seu email)
4. Tab 2: email=victim@target.com (email admin)
5. Criar grupo de tabs com ambas
6. Enviar grupo em paralelo (single-packet attack)
7. Checar cliente de Email por confirmação mencionando email da vítima
8. Se não achar: repetir passos 6-7 (pode precisar 20-30+ tentativas)
9. Clicar no link de confirmação → email trocado pro da vítima
10. Acessar painel admin → deletar usuário alvo
```

---

## Mitigação

Para prevenir race conditions single-endpoint na troca de email:

- **Binding atômico token-email:** Gerar o token de confirmação e fazer o binding com o email alvo numa única transação atômica de banco
- **Mutex por usuário:** Usar lock por usuário pra prevenir requisições concorrentes de troca de email pra mesma conta
- **Rate limit em troca de email:** Permitir apenas uma requisição de troca pendente por vez por usuário, rejeitando novas até a atual ser confirmada ou expirar
- **Token inclui hash do email:** Embutir o endereço de email alvo (ou hash dele) no próprio token de confirmação, tornando impossível pra race condition redirecionar o token pra outro email

---

## Reflexão

Classe mais difícil de farejar: a sequência multi-step fica escondida dentro de um handler só. O endpoint gera um token, faz o bind com o email, depois envia; a race entre bind e envio é o que faz o token da vítima cair no inbox do atacante. ~30 tentativas pra pegar a janela. Account takeover em High a Critical, uma das classes mais impactantes que você acha num programa.
