---
title: "Race Conditions Multi-Endpoint"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Practitioner"
date: 2026-03-05
techniques: ["Multi-Endpoint TOCTOU", "Cart Manipulation", "Race Condition"]
description: "Race condition multi-endpoint entre `/cart` e `/cart/checkout`, adicionando uma jaqueta de $1.337 depois que a checagem de saldo já passou."
lang: pt-br
translation_key: race-condition-multi-endpoint
permalink: /writeups/race-condition-multi-endpoint/pt/
---

## Plataforma
PortSwigger Web Security Academy

## Categoria
Race Conditions

## Dificuldade
Practitioner

## Objetivo
Comprar uma Lightweight "l33t" Leather Jacket explorando uma race condition multi-endpoint no fluxo de compra.

---

## Contexto

O lab simula uma loja online onde o fluxo de compra valida o total do carrinho contra o crédito do usuário antes de confirmar o pedido. Porém, existe uma race condition entre o endpoint de modificação do carrinho e o endpoint de checkout. Ao enviar requisições para ambos endpoints simultaneamente, um atacante pode adicionar itens caros ao carrinho depois que a validação de saldo passou mas antes do pedido ser confirmado.

---

## Reconhecimento

### Credenciais
- **Username:** wiener
- **Password:** peter
- **Crédito inicial:** $100,00

### Endpoints Principais

| Endpoint | Método | Propósito |
|---|---|---|
| `/cart` | POST | Adicionar item ao carrinho (productId, quantity) |
| `/cart/checkout` | POST | Finalizar compra (valida saldo) |
| `/gift-card` | POST | Resgatar código de gift card |
| `/my-account` | GET | Ver saldo de crédito e gift cards |

### Produtos

| Produto | ID | Preço |
|---|---|---|
| Lightweight "l33t" Leather Jacket | 1 | $1.337,00 |
| Gift Card | 2 | $10,00 |

### Análise das Requisições

**POST /cart (adicionar item):**
```http
POST /cart HTTP/2
Host: 0a190036036c3f5e8283cea6006200f6.web-security-academy.net
Cookie: session=OpkKY3fjMFZOqsjgAGVQt8XAD1l9dMnY
Content-Type: application/x-www-form-urlencoded

productId=1&redir=PRODUCT&quantity=1
```

**POST /cart/checkout (finalizar):**
```http
POST /cart/checkout HTTP/2
Host: 0a190036036c3f5e8283cea6006200f6.web-security-academy.net
Cookie: session=OpkKY3fjMFZOqsjgAGVQt8XAD1l9dMnY
Content-Type: application/x-www-form-urlencoded

csrf=fg0ROGd56JAIQkcIWd5TEjmW2ORReOvU
```

### Observações
- Fluxo normal: adicionar item → checkout → servidor valida saldo → confirma pedido
- Janela de race existe entre validação de saldo e confirmação do pedido
- Gift cards comprados podem ser resgatados pra recuperar crédito em tentativas seguintes

---

## Exploração

### Fluxo Vulnerável (TOCTOU Multi-Endpoint)
```
Fluxo normal:
  Carrinho tem Gift Card ($10) → Checkout → CHECK saldo ($10 < $100 ✓) → CONFIRM pedido

Ataque de race condition:
  Carrinho tem Gift Card ($10) → Checkout começa → CHECK saldo ($10 < $100 ✓)
                              ↕ SIMULTANEAMENTE ↕
                    POST /cart adiciona Leather Jacket ($1.337)
                              → CONFIRM pedido (agora inclui a jaqueta!)
```

### Passos do Ataque

1. **Logar** como `wiener:peter` e explorar a loja
2. **Comprar gift card** normalmente para entender o fluxo de checkout e capturar requisições
3. **Enviar pro Repeater** ambos `POST /cart` e `POST /cart/checkout`
4. **Modificar POST /cart** body para adicionar a Leather Jacket: `productId=1&redir=PRODUCT&quantity=1`
5. **Criar grupo de abas** com requisições em configuração de ataque paralelo:
   - Aba 1: POST /cart (adicionar Leather Jacket, productId=1)
   - Aba 2: POST /cart (adicionar Leather Jacket, productId=1), duplicada para maior taxa de sucesso
   - Aba 3: POST /cart (adicionar Leather Jacket, productId=1), duplicada para maior taxa de sucesso
   - Aba 4: POST /cart/checkout (finalizar compra)
6. **Adicionar gift card** ($10) ao carrinho via navegador antes de cada tentativa
7. **Enviar grupo em paralelo** (single-packet attack)
8. **Repetir múltiplas tentativas**, tentativas falhadas compraram gift cards, que foram resgatados pra recuperar crédito
9. **Exploração bem-sucedida**, o checkout validou o saldo contra o gift card barato, mas as requisições paralelas no POST /cart adicionaram a Leather Jacket antes da confirmação do pedido

### Resultado
- **Item comprado:** Lightweight "l33t" Leather Jacket ($1.337,00)
- **Crédito final da loja:** -$2.584,00 (saldo negativo!)
- **Status do lab:** Solved

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
| Race Condition Multi-Endpoint | Explorar janelas de race entre dois endpoints diferentes que compartilham estado |
| Connection Warming | Enviar uma requisição preliminar para reduzir latência na primeira requisição real |
| Estratégia de Retry | Tentativas falhadas ainda podem ser úteis, gift cards comprados podem ser resgatados pra fundar novas tentativas |
| Duplicação de Requisição | Duplicar a requisição de modificação do carrinho aumenta as chances de pegar a janela de race |
| Saldo Negativo | A exploração deixou o crédito do usuário negativo, mostrando o tamanho do estrago dessa classe de bug |

---

## Ferramentas Utilizadas

| Ferramenta | Propósito |
|---|---|
| Burp Suite Community | Proxy, HTTP History, Repeater |
| Burp Repeater (Group Send) | Envio de requisições multi-endpoint em paralelo via single-packet attack |
| Firefox (Kali) | Navegador com proxy configurado em 127.0.0.1:8080 |

---

## Cheatsheet de Comandos & Técnicas

```
# Fluxo de Ataque de Race Condition Multi-Endpoint
1. Capturar POST /cart e POST /cart/checkout em Proxy → HTTP History
2. Enviar ambas pro Repeater
3. Modificar POST /cart pra adicionar o item caro (productId=1)
4. Duplicar aba de POST /cart 2-3 vezes pra maior taxa de sucesso
5. Adicionar item barato (gift card) ao carrinho via navegador
6. Criar grupo de abas com todas as abas
7. Enviar grupo em paralelo (single-packet attack)
8. Verificar carrinho/conta no navegador
9. Se falhar: resgatar qualquer gift card comprado, re-adicionar gift card ao carrinho, retentar
10. Repetir até a janela de race ser pega com sucesso
```

---

## Erros e Lições Aprendidas

1. **Mismatch de protocolo HTTP**. Criar manualmente uma aba GET / pra connection warming causou erro "Cannot send group" porque ela ficou em HTTP/1.1 enquanto as outras abas estavam em HTTP/2. Fix: garantir que todas as abas no grupo usem a mesma versão de protocolo, ou pular o connection warming.
2. **Erro "Stream failed to close" do Burp**. Bug HTTP/2 no Burp Community Edition. Fix: atualizar a página ou retentar; geralmente funciona na segunda tentativa.
3. **Múltiplas tentativas necessárias**. Diferente do limit-overrun (Lab 1), race conditions multi-endpoint têm janela de race menor. Duplicar a requisição POST /cart e retentar várias vezes foi necessário.
4. **Estratégia de recuperação via gift card**. Tentativas falhadas que compram gift cards não são desperdiçadas, resgate os cards pra recuperar crédito pra próxima tentativa. Isso torna o ataque sustentável.

---

## Mitigação

Para prevenir race conditions multi-endpoint em fluxos de checkout:

- **Snapshot do carrinho no momento da validação:** Travar o estado do carrinho quando a validação de saldo começa e usar esse snapshot para confirmação do pedido, ignorando modificações concorrentes
- **Operação atômica de checkout:** Usar transações de banco com SELECT FOR UPDATE para travar o carrinho e o saldo do usuário durante todo o processo de checkout
- **Versionamento de carrinho:** Incluir um token de versão do carrinho na requisição de checkout; rejeitar se o carrinho foi modificado depois do token ser emitido
- **Locking otimista:** Incluir um hash do carrinho no checkout; se o conteúdo do carrinho não casar no momento da confirmação, abortar a transação

---

## Reflexão

Gap entre dois endpoints que compartilham estado. O checkout valida o total do carrinho mas não trava o carrinho, então POSTs paralelos pra /cart entram depois do check de saldo. Duplicar a requisição de modificação aumentou a taxa de hit. Tentativas falhadas que compraram gift cards bancaram a próxima rodada, terminando em saldo negativo de -$2.584. O impacto financeiro sozinho já justifica por que checkout de e-commerce precisa de fluxo atômico.
