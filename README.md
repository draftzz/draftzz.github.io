# draftzz // CyberSec Portfolio

Personal cybersecurity portfolio of **Bruno Antonio Moreira**. CSMS Coordinator @ Scania.
CTF writeups, web exploitation, race conditions, and automotive security research.

🌐 **Live site:** https://draftzz.github.io

## Stack

- Jekyll (custom theme, dark / terminal aesthetic)
- GitHub Pages
- Plugins: `jekyll-feed`, `jekyll-seo-tag`, `jekyll-sitemap`
- Writeups as a Jekyll collection (`_writeups/`)
- Bug bounty reports as a separate collection (`_bugbounty/`)
- Bilingual: English (default) + Portuguese (pt-br)

## Adding a new writeup (English)

1. Create a markdown file in `_writeups/<slug>.md` with this frontmatter:

```yaml
---
title: "Machine Name"
platform: "Hack The Box"        # Hack The Box | TryHackMe | PortSwigger
category: "Web"                  # Web | Crypto | Race Conditions | Hardware | ...
difficulty: "Easy"               # Very Easy | Easy | Medium | Hard | Apprentice | Practitioner | Expert
date: 2026-04-14
techniques: ["XXE", "LFI"]
description: "One-line teaser used for OG, meta description, and home card preview."
lang: en
translation_key: machine-name    # same slug as the file (no extension)
---
```

2. Write the content below the frontmatter (no need for an H1, the title is rendered automatically).
3. Commit and push. GitHub Pages rebuilds automatically.

## Adding a Portuguese translation

For each English writeup at `_writeups/<slug>.md`, create a sibling at `_writeups/<slug>.pt.md` with:

```yaml
---
title: "Título Traduzido"
platform: "Hack The Box"
category: "Web"
difficulty: "Easy"
date: 2026-04-14                 # same date as EN
techniques: ["XXE", "LFI"]       # keep technique names in English (they're technical jargon)
description: "Descrição em português para preview e SEO."
lang: pt-br
translation_key: machine-name    # MUST match the EN sister
permalink: /writeups/machine-name/pt/
---
```

Translation conventions:

- **Translate prose only.** Keep code blocks, payloads, HTTP requests, command output, CVE/CWE codes, and tool names in English.
- Keep `category`, `platform`, `difficulty`, and `techniques` values **identical** to the EN version. They drive cross-language filters.
- Set explicit `permalink: /writeups/<slug>/pt/` so the URL stays clean.

## Frontmatter field reference

| Field | Required | Notes |
|-------|----------|-------|
| `title` | yes | Translated per language |
| `platform` | yes | One of `Hack The Box`, `TryHackMe`, `PortSwigger` (or add a new platform, slugified to a CSS class) |
| `category` | yes | Free-form but reused across files (drives filter pills) |
| `difficulty` | yes | Slugified (`Very Easy` → `very-easy`) for the badge color |
| `date` | yes | `YYYY-MM-DD`. Used for sorting and the "new" badge (< 30 days) |
| `techniques` | yes | Array of technique names; drives `/tags/` page and "related writeups" |
| `description` | recommended | 1-line teaser for SEO and home card preview |
| `lang` | recommended | `en` (default) or `pt-br` |
| `translation_key` | for bilingual writeups | Slug shared between EN and PT sister files |
| `permalink` | only for `.pt.md` | `/writeups/<slug>/pt/` |

## Bug bounty reports

Drop reports under `_bugbounty/`, they use the same writeup layout. Recommended frontmatter:

```yaml
---
title: "Stored XSS in Foo Inc. Search"
platform: "HackerOne"
category: "Bug Bounty"
difficulty: "Medium"
date: 2026-05-01
techniques: ["Stored XSS", "DOM"]
description: "..."
lang: en
program: "Foo Inc."
severity: "High"
status: "disclosed"              # disclosed | private | triaged
---
```

(Disclosure-related fields like `program`, `severity`, `status` are not yet rendered by the layout, extend `_layouts/writeup.html` when you start filling the collection.)

## Local development

```bash
bundle install                  # first time only
bundle exec jekyll serve        # http://localhost:4000
```

## Layout features

- **Home (`_layouts/home.html`):** filterable card grid (category + platform + lang), search, "new" badge for posts < 30 days, date and reading time on each card.
- **Writeup (`_layouts/writeup.html`):** sticky TOC sidebar (auto-built from h2/h3 by `assets/js/toc.js`), anchor links on headings, related writeups (matched by shared techniques), language switch link to sister translation.
- **SEO:** OG/Twitter meta, JSON-LD `TechArticle` schema, hreflang alternates between en/pt-br, sitemap, RSS feed.
- **Language toggle:** EN/PT pills in the nav. Stores choice in `localStorage`; on writeup pages, switching lang navigates to the sister translation if it exists.

## Contact

- **Email:** brunomoreira2712@gmail.com
- **LinkedIn:** [Bruno Moreira](https://www.linkedin.com/in/bruno-moreira-6250901b4/)
- **GitHub:** [@draftzz](https://github.com/draftzz)
