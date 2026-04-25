---
title: "Limit Overrun Race Condition"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Apprentice"
date: 2026-02-10
techniques: ["TOCTOU", "Coupon Abuse", "Single-Packet Attack"]
description: "Race condition de limit overrun em redenção de cupom — aplicando PROMO20 várias vezes em paralelo para levar uma jaqueta de $1.337 por $30."
lang: pt-br
translation_key: race-condition-limit-overrun
permalink: /writeups/race-condition-limit-overrun/pt/
---

## Plataforma
PortSwigger Web Security Academy

## Categoria
Race Conditions

## Dificuldade
Apprentice

## Objetivo
Comprar uma Lightweight "l33t" Leather Jacket explorando uma race condition no mecanismo de redenção de cupom.

---

## Contexto

O lab simula uma loja online com um sistema de cupons. Um código promocional `PROMO20` oferece 20% de desconto, com a intenção de uso único por usuário. O fluxo de compra contém uma vulnerabilidade TOCTOU (Time-of-Check-to-Time-of-Use): o servidor verifica se o cupom já foi aplicado, aplica o desconto, e só então marca como usado. Essa janela de race permite que requisições concorrentes burlem a restrição de uso único.

O item alvo custa $1.337,00 e o usuário tem apenas $50,00 em crédito da loja — tornando a compra legítima impossível mesmo com uma aplicação do cupom de 20%.

---

## Reconhecimento

### Credenciais
- **Username:** wiener
- **Password:** peter

### Endpoints Principais Identificados
| Endpoint | Método | Propósito |
|---|---|---|
| `/cart` | GET | Ver carrinho e total atual |
| `/cart/coupon` | POST | Aplicar código de cupom |
| `/cart/coupon/remove` | POST | Remover cupom aplicado |

### Análise da Requisição
Após logar e navegar pela loja, a requisição de aplicação de cupom foi capturada no Burp Suite Proxy → HTTP History:

```http
POST /cart/coupon HTTP/2
Host: 0abb003b04db4b1181275204003800b4.web-security-academy.net
Cookie: session=2Aag8H5B8xT5HdIX4QEealgTqW6j5LwH
Content-Type: application/x-www-form-urlencoded

csrf=LL7IIA0wttc3VMi1NFe9MUIN1U8npyeN&coupon=PROMO20
```

### Observações
- Aplicar o cupom uma vez dá 20% de desconto ($267,40 off)
- Aplicar uma segunda vez sequencialmente retorna "Coupon already applied"
- O servidor valida o uso do cupom **antes** de atualizar o banco — padrão TOCTOU clássico

---

## Exploração

### Fluxo Vulnerável (TOCTOU)
```
Thread 1: CHECK (cupom válido?) → SIM → APPLY desconto → UPDATE (marca usado)
Thread 2: CHECK (cupom válido?) → SIM → APPLY desconto → UPDATE (marca usado)
                                        ↑
                    Thread 2 checa ANTES da Thread 1 terminar o UPDATE
                    Resultado: desconto aplicado 2x
```

### Passos do Ataque

1. **Logar** como `wiener:peter` e adicionar a Lightweight "l33t" Leather Jacket ($1.337,00) ao carrinho
2. **Aplicar cupom** `PROMO20` normalmente via navegador para capturar a requisição
3. **Enviar pro Repeater** — botão direito no `POST /cart/coupon` no HTTP History → Send to Repeater
4. **Remover o cupom aplicado** no navegador antes do ataque
5. **Criar grupo de tabs** — botão direito na aba do Repeater → Create tab group → nome "race"
6. **Duplicar tabs** — botão direito → Duplicate tab, repetir até 20 tabs no total
7. **Enviar grupo em paralelo** — clicar no dropdown Send → "Send group in parallel (single-packet attack)"
8. **Analisar respostas:**
   - 13 das 20 requisições retornaram 302 (sucesso — cupom aplicado)
   - 7 das 20 retornaram "Coupon already applied"
9. **Verificar carrinho** — atualizei o navegador, total caiu pra $855,68 (primeira rodada)
10. **Repetir** — removi cupom, mandei outro batch paralelo, total caiu pra $30,09
11. **Finalizar pedido** — comprei a jaqueta de $1.337,00 por $30,09 com $50,00 de crédito

### Resultado
- **Preço original:** $1.337,00
- **Preço final:** $30,09
- **Desconto alcançado:** 97,7%
- **Crédito restante:** $19,91

---

## Mapeamento MITRE ATT&CK

| Tática | Técnica | ID |
|---|---|---|
| Initial Access | Valid Accounts | T1078 |
| Impact | Financial Theft | T1657 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-367:** Time-of-Check Time-of-Use (TOCTOU) Race Condition

---

## Conceitos-Chave Aprendidos

| Conceito | Descrição |
|---|---|
| TOCTOU | Falha Time-of-Check-to-Time-of-Use onde o estado muda entre validação e ação |
| Single-Packet Attack | Enviar múltiplas requisições HTTP/2 em um único pacote TCP para sincronização precisa |
| Limit Overrun | Exceder limites de uso único explorando janelas de race na lógica de validação |
| Burp Repeater Group Send | Recurso para enviar múltiplas requisições agrupadas em paralelo para testes de race condition |

---

## Ferramentas Utilizadas

| Ferramenta | Propósito |
|---|---|
| Burp Suite Community | Proxy, HTTP History, Repeater |
| Burp Repeater (Group Send) | Envio de 20 requisições em paralelo via single-packet attack |
| Firefox (Kali) | Navegador com proxy configurado em 127.0.0.1:8080 |

---

## Cheatsheet de Comandos & Técnicas

```
# Burp Repeater — Fluxo de Ataque de Race Condition
1. Capturar POST alvo em Proxy → HTTP History
2. Botão direito → Send to Repeater
3. Botão direito na aba → Create tab group
4. Botão direito na aba → Duplicate tab (repetir até 20 no total)
5. Dropdown Send → "Send group in parallel (single-packet attack)"
6. Verificar respostas: 302 = sucesso, "already applied" = bloqueado
7. Repetir batches até atingir o preço alvo
```

---

## Mitigação

Para prevenir essa race condition, a aplicação deveria implementar uma das seguintes:

- **Update condicional atômico:** `UPDATE coupons SET used = true WHERE code = 'PROMO20' AND used = false` — operação única, sem janela de race
- **Lock no nível do banco:** `SELECT FOR UPDATE` para travar a linha do cupom durante a transação
- **Idempotency keys:** Exigir uma chave única por requisição, rejeitar duplicatas no servidor

---

## Reflexão

Esse lab demonstra o padrão mais comum e lucrativo de race condition em bug bounty: limit overrun em redenção de cupom/desconto. O mesmo padrão de vulnerabilidade pagou $1.500 (Reverb.com), $216 (Dropbox) e $200 (Instacart) no HackerOne. O takeaway-chave é que qualquer endpoint com fluxo CHECK → ACTION → UPDATE sem locking adequado é potencialmente vulnerável. O recurso "Send group in parallel" do Burp Repeater torna a exploração trivial — sem precisar de Turbo Intruder ou scripts customizados pra essa classe de vulnerabilidade.
