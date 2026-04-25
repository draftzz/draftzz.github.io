---
title: "TPM Backdoor"
platform: "Hack The Box"
category: "Hardware"
difficulty: "Easy"
date: 2025-09-10
techniques: ["VHDL Analysis", "Hardware Backdoor", "TPM Exploitation"]
description: "Reading VHDL source to find a hardcoded backdoor pattern that bypasses XOR encryption and leaks the TPM's secret key."
lang: en
translation_key: tpm-backdoor
---

| Info | Detail |
|------|--------|
| Platform | Hack The Box |
| Category | Hardware / Cryptography |
| Difficulty | Easy |
| Flag | `HTB{4_7yp1c41_53cu23_TPM_ch1p}` |

---

## Overview

A hardware challenge involving a simulated TPM (Trusted Platform Module) chip with a hidden backdoor. The server accepts 16-bit binary signals and returns encrypted outputs. The goal is to analyze VHDL source files, understand the encryption logic, and exploit the backdoor to extract the secret key.

---

## Files Provided

- `backdoor.vhdl`, backdoor logic: activates when input matches a hardcoded pattern
- `tpm.vhdl`, top-level chip: routes output to key or encrypted data based on backdoor signal
- `encryption.vhdl`, encryption circuit: XOR + NOT operations
- `key.vhdl`, hardcoded secret key
- `solve_hw.py`, helper script hinting at the solution approach
- `diagram.png`, architecture diagram of the TPM chip

---

## Analysis

### encryption.vhdl

```vhdl
for i in 1 to 15 loop
    E(i) <= D(i) XOR K(i);
end loop;
E(0)  <= NOT K(0);
E(6)  <= NOT K(6);
E(13) <= NOT K(13);
```

- Bits 1–15: XOR between data and key
- Bits 0, 6, 13: always `NOT K(x)`, **independent of input D**

### backdoor.vhdl

```vhdl
constant pattern : STD_LOGIC_VECTOR(15 downto 0) := "1111111111101001";
if D = pattern then
    B <= '1';
```

Backdoor activates when the raw input `D` equals the hardcoded pattern.

### tpm.vhdl

```vhdl
case B is
    when '1' =>  -- backdoor active
        Output(i) <= Key(i);  -- leaks the key!
    when others =>
        Output(i) <= Encrypted(i);
```

When backdoor is active (`B = 1`), output is the **raw key** instead of encrypted data.

---

## Exploitation

### Step 1. Understand the flow

The backdoor checks the **raw input D** before encryption. So sending the pattern directly activates it.

### Step 2. Send the pattern

```bash
nc 154.57.164.67 32088
# Input: 1111111111101001
# Output: 0110001111100001  ← this is the key!
# You triggered the backdoor here is the flag: HTB{4_7yp1c41_53cu23_TPM_ch1p}
```

### Step 3. Verify

The output `0110001111100001` matches exactly the constant in `key.vhdl`:
```vhdl
constant key : STD_LOGIC_VECTOR(15 downto 0) := "0110001111100001";
```

---

## Key Takeaways

- **VHDL** is a hardware description language, reading it is like reading circuit blueprints
- **`downto` indexing**: bit 15 is MSB (leftmost in string), bit 0 is LSB (rightmost)
- Backdoors in hardware don't need software vulnerabilities, a single hardcoded pattern can bypass all security
- The backdoor checked the **plaintext input**, not the encrypted output, always analyze the full signal flow

---

## MITRE ATT&CK Mapping

| Tactic | Technique | ID |
|--------|-----------|-----|
| Credential Access | Unsecured Credentials: Hardcoded Credentials | T1552.001 |
| Defense Evasion | Hidden in Hardware Logic |, |
| Collection | Data from Configuration Repository | T1602 |

---

## Automotive Cybersecurity Relevance

This challenge mirrors real threats addressed in **ISO/SAE 21434** and **UN R155**:

- Hardware backdoors in ECUs or TPMs are a critical attack vector in automotive systems
- TARA methodology (used at Scania) specifically evaluates supply chain risks, a backdoored TPM from a vendor could compromise the entire vehicle security architecture
- Threat ID in TARA context: **tampering with cryptographic hardware**, impact level **Critical** (confidentiality + integrity of vehicle keys)

---

## Reflection

The initial instinct was to reverse-engineer the XOR encryption. But analyzing the full VHDL architecture revealed the backdoor bypasses encryption entirely, no need to break crypto if the hardware has a secret door. Lesson: always map the full system before attacking individual components.
