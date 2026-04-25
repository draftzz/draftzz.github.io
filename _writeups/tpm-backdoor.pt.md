---
title: "TPM Backdoor"
platform: "Hack The Box"
category: "Hardware"
difficulty: "Easy"
date: 2025-09-10
techniques: ["VHDL Analysis", "Hardware Backdoor", "TPM Exploitation"]
description: "Lendo código VHDL para encontrar um padrão de backdoor hardcoded que ignora a criptografia XOR e vaza a chave secreta do TPM."
lang: pt-br
translation_key: tpm-backdoor
permalink: /writeups/tpm-backdoor/pt/
---

| Info | Detalhe |
|------|---------|
| Plataforma | Hack The Box |
| Categoria | Hardware / Cryptography |
| Dificuldade | Easy |
| Flag | `HTB{4_7yp1c41_53cu23_TPM_ch1p}` |

---

## Visão Geral

Um desafio de hardware envolvendo um chip TPM (Trusted Platform Module) simulado com uma backdoor escondida. O servidor aceita sinais binários de 16 bits e retorna saídas criptografadas. O objetivo é analisar arquivos-fonte VHDL, entender a lógica de criptografia, e explorar a backdoor para extrair a chave secreta.

---

## Arquivos Fornecidos

- `backdoor.vhdl`, lógica da backdoor: ativa quando o input casa com um padrão hardcoded
- `tpm.vhdl`, chip top-level: roteia a saída para a chave ou para os dados criptografados baseado no sinal da backdoor
- `encryption.vhdl`, circuito de criptografia: operações XOR + NOT
- `key.vhdl`, chave secreta hardcoded
- `solve_hw.py`, script auxiliar dando dica da abordagem da solução
- `diagram.png`, diagrama de arquitetura do chip TPM

---

## Análise

### encryption.vhdl

```vhdl
for i in 1 to 15 loop
    E(i) <= D(i) XOR K(i);
end loop;
E(0)  <= NOT K(0);
E(6)  <= NOT K(6);
E(13) <= NOT K(13);
```

- Bits 1–15: XOR entre dado e chave
- Bits 0, 6, 13: sempre `NOT K(x)`, **independente do input D**

### backdoor.vhdl

```vhdl
constant pattern : STD_LOGIC_VECTOR(15 downto 0) := "1111111111101001";
if D = pattern then
    B <= '1';
```

A backdoor ativa quando o input bruto `D` é igual ao padrão hardcoded.

### tpm.vhdl

```vhdl
case B is
    when '1' =>  -- backdoor ativa
        Output(i) <= Key(i);  -- vaza a chave!
    when others =>
        Output(i) <= Encrypted(i);
```

Quando a backdoor está ativa (`B = 1`), a saída é a **chave em texto puro** em vez dos dados criptografados.

---

## Exploração

### Passo 1. Entender o fluxo

A backdoor checa o **input bruto D** antes da criptografia. Então enviar o padrão diretamente ativa a backdoor.

### Passo 2. Enviar o padrão

```bash
nc 154.57.164.67 32088
# Input: 1111111111101001
# Output: 0110001111100001  ← essa é a chave!
# You triggered the backdoor here is the flag: HTB{4_7yp1c41_53cu23_TPM_ch1p}
```

### Passo 3. Verificar

A saída `0110001111100001` casa exatamente com a constante em `key.vhdl`:
```vhdl
constant key : STD_LOGIC_VECTOR(15 downto 0) := "0110001111100001";
```

---

## Principais Aprendizados

- **VHDL** é uma linguagem de descrição de hardware, ler é como ler blueprints de circuito
- **Indexação `downto`**: bit 15 é o MSB (mais à esquerda na string), bit 0 é o LSB (mais à direita)
- Backdoors em hardware não precisam de vulnerabilidades de software, um único padrão hardcoded pode burlar toda a segurança
- A backdoor checava o **input em texto puro**, não a saída criptografada, sempre analise o fluxo completo do sinal

---

## Mapeamento MITRE ATT&CK

| Tática | Técnica | ID |
|--------|---------|-----|
| Credential Access | Unsecured Credentials: Hardcoded Credentials | T1552.001 |
| Defense Evasion | Hidden in Hardware Logic |, |
| Collection | Data from Configuration Repository | T1602 |

---

## Relevância para Cibersegurança Automotiva

Esse desafio espelha ameaças reais tratadas em **ISO/SAE 21434** e **UN R155**:

- Backdoors em hardware em ECUs ou TPMs são um vetor de ataque crítico em sistemas automotivos
- A metodologia TARA (usada na Scania) avalia especificamente riscos de cadeia de suprimentos, um TPM com backdoor de um fornecedor poderia comprometer toda a arquitetura de segurança do veículo
- ID da ameaça em contexto TARA: **tampering com hardware criptográfico**, nível de impacto **Crítico** (confidencialidade + integridade das chaves do veículo)

---

## Reflexão

O instinto inicial foi reverse-engineering da criptografia XOR. Mas analisar a arquitetura VHDL completa revelou que a backdoor ignora a criptografia inteira, não precisa quebrar a cripto se o hardware tem uma porta secreta. Lição: sempre mapeie o sistema completo antes de atacar componentes individuais.
