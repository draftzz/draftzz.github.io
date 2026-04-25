---
title: "The Game"
platform: "TryHackMe"
category: "Reverse Engineering"
difficulty: "Easy"
date: 2025-07-12
techniques: ["Static Analysis", "strings", "grep"]
description: "Análise estática de um binário PE32 do Tetris — extraindo uma flag em texto puro com `strings` e `grep`, sem ofuscação alguma."
lang: pt-br
translation_key: the-game
permalink: /writeups/the-game/pt/
---

| Info | Detalhe |
|------|---------|
| Plataforma | TryHackMe |
| Categoria | Game Hacking / Análise Estática |
| Dificuldade | Easy |
| Flag | `THM{I_CAN_READ_IT_ALL}` |

---

## Visão Geral

Um binário do jogo Tetris com segredos escondidos no código. O objetivo é encontrar a flag enterrada dentro do executável usando análise estática.

## Abordagem

### 1. Extrair e identificar o arquivo
```bash
unzip Tetrix.exe-1741979048280.zip
file Tetrix.exe
# PE32 executable (GUI) Intel 80386, for MS Windows
```

### 2. Extrair strings legíveis
```bash
strings Tetrix.exe | grep -iE "THM\{|CTF\{|flag\{"
# THM{I_CAN_READ_IT_ALL}
```

A flag estava armazenada como string em texto puro dentro do binário — sem ofuscação, sem criptografia.

## Principais Aprendizados

- **`strings`** é sempre a primeira ferramenta para análise de binário — extrai texto legível de qualquer arquivo
- **`grep -iE`** habilita busca case-insensitive com regex estendida (padrões com OR)
- **`file`** identifica o tipo real do arquivo independente da extensão
- Nunca use `cat` em arquivos binários — gera lixo na tela porque tenta interpretar bytes como texto

## MITRE ATT&CK

| Tática | Técnica | ID |
|--------|---------|-----|
| Discovery | File and Directory Discovery | T1083 |
| Collection | Data from Local System | T1005 |
