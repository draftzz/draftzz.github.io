---
title: "Limit Overrun Race Condition"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Apprentice"
date: 2026-02-10
techniques: ["TOCTOU", "Coupon Abuse", "Single-Packet Attack"]
description: "Limit overrun race on coupon redemption — applying PROMO20 multiple times in parallel to take a $1,337 leather jacket for $30."
lang: en
translation_key: race-condition-limit-overrun
---

## Platform
PortSwigger Web Security Academy

## Category
Race Conditions

## Difficulty
Apprentice

## Objective
Purchase a Lightweight "l33t" Leather Jacket by exploiting a race condition in the coupon redemption mechanism.

---

## Context

The lab simulates an online store with a coupon system. A promotional code `PROMO20` offers a 20% discount, intended for single use per user. The purchasing flow contains a TOCTOU (Time-of-Check-to-Time-of-Use) vulnerability: the server checks if the coupon was already applied, applies the discount, and only then marks it as used. This race window allows concurrent requests to bypass the single-use restriction.

The target item costs $1,337.00 and the user has only $50.00 in store credit — making a legitimate purchase impossible even with one application of the 20% coupon.

---

## Reconnaissance

### Credentials
- **Username:** wiener
- **Password:** peter

### Key Endpoints Identified
| Endpoint | Method | Purpose |
|---|---|---|
| `/cart` | GET | View cart and current total |
| `/cart/coupon` | POST | Apply coupon code |
| `/cart/coupon/remove` | POST | Remove applied coupon |

### Request Analysis
After logging in and navigating the store, the coupon application request was captured in Burp Suite Proxy → HTTP History:

```http
POST /cart/coupon HTTP/2
Host: 0abb003b04db4b1181275204003800b4.web-security-academy.net
Cookie: session=2Aag8H5B8xT5HdIX4QEealgTqW6j5LwH
Content-Type: application/x-www-form-urlencoded

csrf=LL7IIA0wttc3VMi1NFe9MUIN1U8npyeN&coupon=PROMO20
```

### Observations
- Applying the coupon once gives a 20% discount ($267.40 off)
- Applying it a second time sequentially returns "Coupon already applied"
- The server validates coupon usage **before** updating the database — classic TOCTOU pattern

---

## Exploitation

### Vulnerable Flow (TOCTOU)
```
Thread 1: CHECK (coupon valid?) → YES → APPLY discount → UPDATE (mark used)
Thread 2: CHECK (coupon valid?) → YES → APPLY discount → UPDATE (mark used)
                                        ↑
                    Thread 2 checks BEFORE Thread 1 completes UPDATE
                    Result: discount applied 2x
```

### Attack Steps

1. **Login** as `wiener:peter` and add the Lightweight "l33t" Leather Jacket ($1,337.00) to cart
2. **Apply coupon** `PROMO20` normally via the browser to capture the request
3. **Send to Repeater** — right-click the `POST /cart/coupon` request in HTTP History → Send to Repeater
4. **Remove the applied coupon** in the browser before the attack
5. **Create tab group** — right-click the Repeater tab → Create tab group → name "race"
6. **Duplicate tabs** — right-click → Duplicate tab, repeat until 20 tabs total
7. **Send group in parallel** — click the Send dropdown → "Send group in parallel (single-packet attack)"
8. **Analyze responses:**
   - 13 out of 20 requests returned 302 (success — coupon applied)
   - 7 out of 20 returned "Coupon already applied"
9. **Check cart** — refreshed the browser, total dropped to $855.68 (first round)
10. **Repeat** — removed coupon, sent another parallel batch, total dropped to $30.09
11. **Place order** — purchased the $1,337.00 jacket for $30.09 with $50.00 credit

### Result
- **Original price:** $1,337.00
- **Final price:** $30.09
- **Discount achieved:** 97.7%
- **Store credit remaining:** $19.91

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
| TOCTOU | Time-of-Check-to-Time-of-Use flaw where state changes between validation and action |
| Single-Packet Attack | Sending multiple HTTP/2 requests in one TCP packet for precise synchronization |
| Limit Overrun | Exceeding one-time-use limits by exploiting race windows in validation logic |
| Burp Repeater Group Send | Feature to send multiple grouped requests in parallel for race condition testing |

---

## Tools Used

| Tool | Purpose |
|---|---|
| Burp Suite Community | Proxy, HTTP History, Repeater |
| Burp Repeater (Group Send) | Sending 20 requests in parallel via single-packet attack |
| Firefox (Kali) | Browser with proxy configured to 127.0.0.1:8080 |

---

## Commands & Techniques Cheatsheet

```
# Burp Repeater — Race Condition Attack Flow
1. Capture target POST request in Proxy → HTTP History
2. Right-click → Send to Repeater
3. Right-click tab → Create tab group
4. Right-click tab → Duplicate tab (repeat for 20 total)
5. Send dropdown → "Send group in parallel (single-packet attack)"
6. Check responses: 302 = success, "already applied" = blocked
7. Repeat batches until target price reached
```

---



## Remediation

To prevent this race condition, the application should implement one of:

- **Atomic conditional update:** `UPDATE coupons SET used = true WHERE code = 'PROMO20' AND used = false` — single operation, no race window
- **Database-level locking:** `SELECT FOR UPDATE` to lock the coupon row during the transaction
- **Idempotency keys:** Require a unique key per request, reject duplicates server-side

---

## Reflection

This lab demonstrates the most common and profitable race condition pattern in bug bounty: limit overrun on coupon/discount redemption. The same vulnerability pattern has paid $1,500 (Reverb.com), $216 (Dropbox), and $200 (Instacart) on HackerOne. The key takeaway is that any endpoint with a CHECK → ACTION → UPDATE flow without proper locking is potentially vulnerable. The Burp Repeater's "Send group in parallel" feature makes exploitation trivial — no Turbo Intruder or custom scripts needed for this class of vulnerability.
