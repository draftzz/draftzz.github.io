---
title: "W1seGuy"
platform: "TryHackMe"
category: "Crypto"
difficulty: "Easy"
date: 2025-07-25
techniques: ["XOR", "Known-Plaintext Attack", "Python Sockets"]
description: "Ataque de texto plano conhecido em chave XOR de 5 bytes ASCII, recupere 4 bytes pelo prefixo `THM{` e brute-force no último via socket."
lang: pt-br
translation_key: w1seguy
permalink: /writeups/w1seguy/pt/
---

| Info | Detalhe |
|------|---------|
| Plataforma | TryHackMe |
| Categoria | Cryptography / XOR |
| Dificuldade | Easy |
| Flag 1 | `THM{p1alntExtAtt4ckcAnr3alLyhUrty0urxOr}` |
| Flag 2 | `THM{BrUt3_ForC1nG_XOR_cAn_B3_FuN_nO?}` |

---

## Visão Geral

Um servidor na porta 1337 envia uma flag criptografada com XOR e pede a chave de criptografia. O código-fonte é fornecido, revelando uma chave de 5 caracteres usando `random.choice(string.ascii_letters)`.

## Análise da Vulnerabilidade

O código-fonte revela:
- **Chave de 5 caracteres** composta apenas por letras ASCII (52 possibilidades por posição)
- **Criptografia XOR** que é reversível: `A XOR B = C` significa `C XOR A = B`
- **Texto plano conhecido**: flags sempre começam com `THM{`, 4 bytes conhecidos = 4 dos 5 caracteres da chave recuperados instantaneamente

## Exploração

### Ataque de Texto Plano Conhecido

Como `ciphertext XOR plaintext = key`, e sabemos que a flag começa com `THM{`:

```python
cipher_bytes = bytes.fromhex(hex_from_server)
known = "THM{"
key = ""
for i in range(len(known)):
    key += chr(cipher_bytes[i] ^ ord(known[i]))
# Recupera 4 dos 5 caracteres da chave
```

### Brute Force no 5º Caractere

Apenas 52 possibilidades para o último caractere:

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

### Solução Automatizada (Script com Socket)

Como a chave muda a cada conexão, o exploit completo conecta, captura, resolve e responde automaticamente:

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
        print(data2)  # Contém a Flag 2
        break

s.close()
```

## Principais Aprendizados

- **XOR é reversível**, saber texto plano + cifrado = recuperação da chave
- **Ataque de texto plano conhecido** reduz brute force de 380M para 52 tentativas
- **Chaves curtas são fatais**, 5 caracteres é trivialmente quebrável
- **Automatize com sockets** quando o servidor gera dados novos a cada conexão
- Os nomes das flags confirmam as técnicas: "p1alntExtAtt4ck" e "BrUt3_ForC1nG_XOR"

## MITRE ATT&CK

| Tática | Técnica | ID |
|--------|---------|-----|
| Credential Access | Brute Force | T1110 |
| Command and Control | Application Layer Protocol | T1071 |
