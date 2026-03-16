---
layout: default
title: "W1seGuy - TryHackMe"
---

[← Back to all writeups](/)

# W1seGuy - TryHackMe

| Info | Detail |
|------|--------|
| Platform | TryHackMe |
| Category | Cryptography / XOR |
| Difficulty | Easy |
| Flag 1 | `THM{p1alntExtAtt4ckcAnr3alLyhUrty0urxOr}` |
| Flag 2 | `THM{BrUt3_ForC1nG_XOR_cAn_B3_FuN_nO?}` |

---

## Overview

A server on port 1337 sends an XOR-encrypted flag and asks for the encryption key. The source code is provided, revealing a 5-character key using `random.choice(string.ascii_letters)`.

## Vulnerability Analysis

The source code reveals:
- **5-character key** composed of ASCII letters only (52 possible chars per position)
- **XOR encryption** which is reversible: `A XOR B = C` means `C XOR A = B`
- **Known plaintext**: flags always start with `THM{` — 4 known bytes = 4 of 5 key characters recovered instantly

## Exploitation

### Known-Plaintext Attack

Since `ciphertext XOR plaintext = key`, and we know the flag starts with `THM{`:

```python
cipher_bytes = bytes.fromhex(hex_from_server)
known = "THM{"
key = ""
for i in range(len(known)):
    key += chr(cipher_bytes[i] ^ ord(known[i]))
# Recovers 4 of 5 key characters
```

### Brute Force the 5th Character

Only 52 possibilities for the last character:

```python
for c in string.ascii_letters:
    test_key = key + c
    result = ""
    for i in range(len(cipher_bytes)):
        result += chr(cipher_bytes[i] ^ ord(test_key[i % len(test_key)]))
    if result.endswith("}"):
        print(f"Key: {test_key}")
        print(f"Flag: {result}")
        break
```

### Automated Solution (Socket Script)

Since the key changes on every connection, the full exploit connects, captures, solves, and responds automatically:

```python
import socket, string

s = socket.socket()
s.connect(("TARGET_IP", 1337))
data = s.recv(4096).decode()

hex_str = data.split("flag 1: ")[1].split("\n")[0].strip()
cipher_bytes = bytes.fromhex(hex_str)

known = "THM{"
key = ""
for i in range(len(known)):
    key += chr(cipher_bytes[i] ^ ord(known[i]))

for c in string.ascii_letters:
    test_key = key + c
    result = ""
    for i in range(len(cipher_bytes)):
        result += chr(cipher_bytes[i] ^ ord(test_key[i % len(test_key)]))
    if result.endswith("}"):
        print(f"Key: {test_key}")
        print(f"Flag 1: {result}")
        s.send((test_key + "\n").encode())
        data2 = s.recv(4096).decode()
        print(data2)  # Contains Flag 2
        break

s.close()
```

## Key Takeaways

- **XOR is reversible** — knowing plaintext + ciphertext = key recovery
- **Known-plaintext attack** reduces brute force from 380M to 52 attempts
- **Short keys are fatal** — 5 chars is trivially breakable
- **Automate with sockets** when the server generates fresh data each connection
- The flag names confirm the techniques: "p1alntExtAtt4ck" and "BrUt3_ForC1nG_XOR"

## MITRE ATT&CK

| Tactic | Technique | ID |
|--------|-----------|-----|
| Credential Access | Brute Force | T1110 |
| Command and Control | Application Layer Protocol | T1071 |
