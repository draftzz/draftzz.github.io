---
title: "Multi-Endpoint Race Conditions"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Practitioner"
date: 2026-03-05
techniques: ["Multi-Endpoint TOCTOU", "Cart Manipulation", "Race Condition"]
description: "Multi-endpoint race condition between `/cart` and `/cart/checkout` — adding a $1,337 jacket after the balance check has passed."
lang: en
translation_key: race-condition-multi-endpoint
---

## Platform
PortSwigger Web Security Academy

## Category
Race Conditions

## Difficulty
Practitioner

## Objective
Purchase a Lightweight "l33t" Leather Jacket by exploiting a multi-endpoint race condition in the purchasing flow.

---

## Context

The lab simulates an online store where the purchasing flow validates the cart total against the user's store credit before confirming the order. However, a race condition exists between the cart modification endpoint and the checkout endpoint. By sending requests to both endpoints simultaneously, an attacker can add expensive items to the cart after the balance validation has passed but before the order is confirmed.

---

## Reconnaissance

### Credentials
- **Username:** wiener
- **Password:** peter
- **Starting credit:** $100.00

### Key Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/cart` | POST | Add item to cart (productId, quantity) |
| `/cart/checkout` | POST | Finalize purchase (validates balance) |
| `/gift-card` | POST | Redeem gift card code |
| `/my-account` | GET | View credit balance and gift cards |

### Products

| Product | ID | Price |
|---|---|---|
| Lightweight "l33t" Leather Jacket | 1 | $1,337.00 |
| Gift Card | 2 | $10.00 |

### Request Analysis

**POST /cart (add item):**
```http
POST /cart HTTP/2
Host: 0a190036036c3f5e8283cea6006200f6.web-security-academy.net
Cookie: session=OpkKY3fjMFZOqsjgAGVQt8XAD1l9dMnY
Content-Type: application/x-www-form-urlencoded

productId=1&redir=PRODUCT&quantity=1
```

**POST /cart/checkout (finalize):**
```http
POST /cart/checkout HTTP/2
Host: 0a190036036c3f5e8283cea6006200f6.web-security-academy.net
Cookie: session=OpkKY3fjMFZOqsjgAGVQt8XAD1l9dMnY
Content-Type: application/x-www-form-urlencoded

csrf=fg0ROGd56JAIQkcIWd5TEjmW2ORReOvU
```

### Observations
- Normal flow: add item → checkout → server validates balance → confirms order
- Race window exists between balance validation and order confirmation
- Gift cards purchased can be redeemed to recover credit for retry attempts

---

## Exploitation

### Vulnerable Flow (Multi-Endpoint TOCTOU)
```
Normal flow:
  Cart has Gift Card ($10) → Checkout → CHECK balance ($10 < $100 ✓) → CONFIRM order

Race condition attack:
  Cart has Gift Card ($10) → Checkout starts → CHECK balance ($10 < $100 ✓)
                              ↕ SIMULTANEOUSLY ↕
                    POST /cart adds Leather Jacket ($1,337)
                              → CONFIRM order (now includes jacket!)
```

### Attack Steps

1. **Logged in** as `wiener:peter` and explored the store
2. **Purchased gift card** normally to understand the checkout flow and capture requests
3. **Sent to Repeater** both `POST /cart` and `POST /cart/checkout`
4. **Modified POST /cart** body to add the Leather Jacket: `productId=1&redir=PRODUCT&quantity=1`
5. **Created tab group** with requests in parallel attack configuration:
   - Tab 1: POST /cart (add Leather Jacket, productId=1)
   - Tab 2: POST /cart (add Leather Jacket, productId=1) — duplicate for higher success rate
   - Tab 3: POST /cart (add Leather Jacket, productId=1) — duplicate for higher success rate
   - Tab 4: POST /cart/checkout (finalize purchase)
6. **Added gift card** ($10) to cart via browser before each attempt
7. **Sent group in parallel** (single-packet attack)
8. **Repeated multiple attempts** — failed attempts purchased gift cards, which were redeemed to recover credit
9. **Successfully exploited** — the checkout validated the balance against the cheap gift card, but the parallel POST /cart requests added the Leather Jacket before order confirmation

### Result
- **Item purchased:** Lightweight "l33t" Leather Jacket ($1,337.00)
- **Final store credit:** -$2,584.00 (negative balance!)
- **Lab status:** Solved

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|---|---|---|
| Initial Access | Valid Accounts | T1078 |
| Impact | Financial Theft | T1657 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-367:** Time-of-Check Time-of-Use (TOCTOU) Race Condition

---

## Key Concepts Learned

| Concept | Description |
|---|---|
| Multi-Endpoint Race Condition | Exploiting race windows between two different endpoints that share state |
| Connection Warming | Sending a preliminary request to reduce latency on the first real request |
| Retry Strategy | Failed attempts can still be useful — gift cards purchased can be redeemed to fund retries |
| Request Duplication | Duplicating the cart modification request increases chances of hitting the race window |
| Negative Balance | Successful exploitation resulted in negative credit, demonstrating the severity of the financial impact |

---

## Tools Used

| Tool | Purpose |
|---|---|
| Burp Suite Community | Proxy, HTTP History, Repeater |
| Burp Repeater (Group Send) | Sending multi-endpoint requests in parallel via single-packet attack |
| Firefox (Kali) | Browser with proxy configured to 127.0.0.1:8080 |

---

## Commands & Techniques Cheatsheet

```
# Multi-Endpoint Race Condition Attack Flow
1. Capture POST /cart and POST /cart/checkout in Proxy → HTTP History
2. Send both to Repeater
3. Modify POST /cart to add the expensive item (productId=1)
4. Duplicate POST /cart tab 2-3 times for higher success rate
5. Add cheap item (gift card) to cart via browser
6. Create tab group with all tabs
7. Send group in parallel (single-packet attack)
8. Check cart/account in browser
9. If failed: redeem any purchased gift cards, re-add gift card to cart, retry
10. Repeat until race window is hit successfully
```

---

## Errors & Lessons Learned

1. **HTTP protocol mismatch** — Creating a manual GET / tab for connection warming caused "Cannot send group" error because it defaulted to HTTP/1.1 while other tabs were HTTP/2. Fix: ensure all tabs in a group use the same protocol version, or skip connection warming.
2. **Burp "Stream failed to close" error** — HTTP/2 bug in Burp Community Edition. Fix: refresh the page or retry; usually works on second attempt.
3. **Multiple attempts needed** — Unlike limit-overrun (Lab 1), multi-endpoint race conditions have a smaller race window. Duplicating the POST /cart request and retrying multiple times was necessary.
4. **Gift card recovery strategy** — Failed attempts that buy gift cards aren't wasted — redeem the cards to recover credit for the next attempt. This makes the attack sustainable.

---

## Remediation

To prevent multi-endpoint race conditions in checkout flows:

- **Snapshot cart at validation time:** Lock the cart state when balance validation begins and use that snapshot for order confirmation, ignoring any concurrent modifications
- **Atomic checkout operation:** Use database transactions with SELECT FOR UPDATE to lock the cart and user balance during the entire checkout process
- **Cart versioning:** Include a cart version token in the checkout request; reject if the cart was modified after the token was issued
- **Optimistic locking:** Include a cart hash in the checkout; if the cart contents don't match at confirmation time, abort the transaction

---

## Reflection

This lab demonstrates a more sophisticated race condition than simple limit overruns. Instead of exploiting a single endpoint, the attack targets the gap between two different endpoints that share state. The checkout endpoint validates the balance based on current cart contents, but doesn't lock the cart — allowing parallel requests to modify it during processing. The key insight is that duplicating the attack request increases success probability, and failed attempts can be recycled through gift card redemption. The negative balance result (-$2,584.00) demonstrates the critical financial impact this class of vulnerability can have in real-world e-commerce applications.
