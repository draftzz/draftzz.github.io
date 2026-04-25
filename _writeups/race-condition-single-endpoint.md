---
title: "Single-Endpoint Race Conditions"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Practitioner"
date: 2026-04-15
techniques: ["Hidden Multi-Step", "Email Change Race", "Account Takeover"]
description: "Single-endpoint race on email change — two parallel requests make the victim's confirmation token get sent to the attacker's inbox, leading to account takeover."
lang: en
translation_key: race-condition-single-endpoint
---

## Platform
PortSwigger Web Security Academy

## Category
Race Conditions

## Difficulty
Practitioner

## Objective
Exploit a race condition in the email change functionality to gain access to `carlos@ginandjuice.shop`, access the admin panel, and delete user carlos.

---

## Context

The lab has an email change feature that sends a confirmation link to the new email address. Internally, the server processes this in multiple hidden steps: it generates a confirmation token, associates it with the target email, and sends the confirmation email. A race condition exists within this single endpoint — by sending two email change requests simultaneously (one to a controlled email, one to the victim's email), the confirmation token can be associated with the victim's email but sent to the attacker's email.

---

## Reconnaissance

### Credentials
- **Username:** wiener
- **Password:** peter
- **Attacker email:** wiener@exploit-0a6a00380326974481fa294f013400f8.exploit-server.net
- **Target email:** carlos@ginandjuice.shop

### Key Endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/my-account/change-email` | POST | Request email change (sends confirmation link) |
| `/my-account` | GET | View account details |
| `/admin` | GET | Admin panel (requires admin email) |
| `/admin/delete?username=carlos` | GET | Delete user |

### Email Change Request
```http
POST /my-account/change-email HTTP/2
Host: 0a09002803fa973c81ce2a4300e700e9.web-security-academy.net
Cookie: session=LBNrDmsD4sjEPKFxzkisV6k17Go2SHD7
Content-Type: application/x-www-form-urlencoded

email=wiener@exploit-0a6a00380326974481fa294f013400f8.exploit-server.net&csrf=MROq5uKyM7Rpm5V96noKw7dB5goieBp7
```

### Observations
- Email change requires clicking a confirmation link sent to the new email address
- The confirmation link is sent to whichever email is specified in the request
- The server processes the email change in multiple internal steps within a single request
- The hidden multi-step process creates a race window between token generation and email association

---

## Exploitation

### Vulnerable Flow (Hidden Multi-Step)
```
Normal single request flow:
  POST change-email (carlos@...) → Generate token → Associate with carlos@... → Send to carlos@...

Race condition with two parallel requests:
  Request 1 (wiener@...):  Generate token → Associate with wiener@... → Send to wiener@...
  Request 2 (carlos@...):  Generate token → Associate with carlos@... → Send to ???

  If timing aligns:
  Request 1: Generate token(A) → ...
  Request 2: Generate token(B) → Associate with carlos@... → Send token(B) to wiener@...!
                                                                ↑
                              Token for carlos@... gets sent to attacker's email
```

### Attack Steps

1. **Logged in** as `wiener:peter` and navigated to My Account
2. **Changed email** to attacker address to capture the `POST /my-account/change-email` request
3. **Verified email flow** — checked Email client and confirmed confirmation link was received
4. **Sent request to Repeater** and duplicated the tab
5. **Configured two requests:**
   - Tab 1: `email=wiener@exploit-0a6a00380326974481fa294f013400f8.exploit-server.net` (attacker email)
   - Tab 2: `email=carlos@ginandjuice.shop` (target email)
6. **Created tab group** with both tabs
7. **Sent group in parallel** (single-packet attack) — repeated approximately 30 times
8. **Checked Email client** after each batch — eventually received a confirmation email mentioning `carlos@ginandjuice.shop`
9. **Clicked confirmation link** — email changed to `carlos@ginandjuice.shop`
10. **Accessed Admin panel** — now available with admin email
11. **Deleted user carlos** — lab solved

### Result
- **Account takeover achieved** via email change race condition
- **Admin access gained** by associating account with `carlos@ginandjuice.shop`
- **User carlos deleted** via admin panel
- **Attempts required:** ~30 parallel batches

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|---|---|---|
| Initial Access | Valid Accounts | T1078 |
| Privilege Escalation | Exploitation for Privilege Escalation | T1068 |
| Persistence | Account Manipulation | T1098 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-367:** Time-of-Check Time-of-Use (TOCTOU) Race Condition

---

## Key Concepts Learned

| Concept | Description |
|---|---|
| Hidden Multi-Step Sequence | Single endpoint that internally processes multiple steps (token generation, email association, email sending) with race windows between them |
| Single-Endpoint Race Condition | Unlike multi-endpoint attacks, this exploits internal sub-states within one request handler |
| Account Takeover via Email Change | Race condition causes confirmation token for victim email to be sent to attacker's email |
| Persistence Required | This attack has a small race window — approximately 30 attempts were needed to hit the right timing |

---

## Tools Used

| Tool | Purpose |
|---|---|
| Burp Suite Community | Proxy, HTTP History, Repeater |
| Burp Repeater (Group Send) | Sending two email change requests in parallel via single-packet attack |
| Email Client (lab) | Monitoring for confirmation emails with victim's email address |
| Firefox (Kali) | Browser with proxy configured to 127.0.0.1:8080 |

---

## Commands & Techniques Cheatsheet

```
# Single-Endpoint Race Condition Attack Flow
1. Capture POST /change-email in Proxy → HTTP History
2. Send to Repeater → Duplicate tab
3. Tab 1: email=attacker@controlled.com (your email)
4. Tab 2: email=victim@target.com (admin email)
5. Create tab group with both tabs
6. Send group in parallel (single-packet attack)
7. Check Email client for confirmation mentioning victim email
8. If not found: repeat steps 6-7 (may need 20-30+ attempts)
9. Click confirmation link → email changed to victim's
10. Access admin panel → delete target user
```

---

## Remediation

To prevent single-endpoint race conditions in email change:

- **Atomic token-email binding:** Generate the confirmation token and bind it to the target email in a single atomic database transaction
- **Mutex per user:** Use a per-user lock to prevent concurrent email change requests for the same account
- **Rate limit email changes:** Allow only one pending email change request at a time per user, rejecting new requests until the current one is confirmed or expired
- **Token includes email hash:** Embed the target email address (or its hash) in the confirmation token itself, making it impossible for a race condition to redirect the token to a different email

---

## Reflection

This lab demonstrates the most subtle class of race condition — hidden multi-step sequences within a single endpoint. Unlike limit overruns or multi-endpoint attacks, there's no obvious sign that the endpoint is vulnerable. The internal steps (generate token → associate email → send confirmation) happen invisibly, and the race window between them is extremely small. The attack required ~30 attempts to succeed, which highlights that single-endpoint race conditions need persistence. In a real bug bounty context, this would be a High to Critical finding because it enables account takeover — one of the most impactful vulnerability classes.
