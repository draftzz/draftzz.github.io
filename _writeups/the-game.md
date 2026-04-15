---
title: "The Game"
platform: "TryHackMe"
category: "Reverse Engineering"
difficulty: "Easy"
date: 2025-07-12
techniques: ["Static Analysis", "strings", "grep"]
---

[← Back to all writeups](/)

# The Game - TryHackMe

| Info | Detail |
|------|--------|
| Platform | TryHackMe |
| Category | Game Hacking / Static Analysis |
| Difficulty | Easy |
| Flag | `THM{I_CAN_READ_IT_ALL}` |

---

## Overview

A Tetris game binary with secrets hidden in its code. The objective is to find the flag buried inside the executable through static analysis.

## Approach

### 1. Extract and identify the file
```bash
unzip Tetrix.exe-1741979048280.zip
file Tetrix.exe
# PE32 executable (GUI) Intel 80386, for MS Windows
```

### 2. Extract readable strings
```bash
strings Tetrix.exe | grep -iE "THM\{|CTF\{|flag\{"
# THM{I_CAN_READ_IT_ALL}
```

The flag was stored as a plaintext string inside the binary — no obfuscation, no encryption.

## Key Takeaways

- **`strings`** is always the first tool for binary analysis — extract human-readable text from any file
- **`grep -iE`** enables case-insensitive search with extended regex (OR patterns)
- **`file`** identifies the real type of a file regardless of extension
- Never use `cat` on binary files — it outputs garbage because it tries to interpret bytes as text

## MITRE ATT&CK

| Tactic | Technique | ID |
|--------|-----------|-----|
| Discovery | File and Directory Discovery | T1083 |
| Collection | Data from Local System | T1005 |
