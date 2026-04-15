# draftzz // CyberSec Portfolio

Personal cybersecurity portfolio of **Bruno Antonio Moreira** — CSMS Coordinator @ Scania.
CTF writeups, web exploitation, race conditions, and automotive security research.

🌐 **Live site:** https://draftzz.github.io

## Stack
- Jekyll (custom theme — dark / terminal aesthetic)
- GitHub Pages
- Writeups as a Jekyll collection (`_writeups/`)

## Adding a new writeup

1. Create a markdown file in `_writeups/` with the proper frontmatter:

```yaml
---
title: "Machine Name"
platform: "Hack The Box"        # Hack The Box | TryHackMe | PortSwigger
category: "Web"                  # Web | Crypto | Race Conditions | Hardware | ...
difficulty: "Easy"               # Very Easy | Easy | Medium | Hard | Apprentice | Practitioner | Expert
date: 2026-04-14
techniques: ["XXE", "LFI"]
---
```

2. Write the content below the frontmatter (no need for an H1 — the title is rendered automatically).
3. Commit and push — GitHub Pages rebuilds automatically.

The home page lists, filters and badges everything based on the frontmatter.

## Contact
- **Email:** brunomoreira2712@gmail.com
- **LinkedIn:** [Bruno Moreira](https://www.linkedin.com/in/bruno-moreira-6250901b4/)
- **GitHub:** [@draftzz](https://github.com/draftzz)
