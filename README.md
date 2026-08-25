# FlowPage Studio — Showcase

Two separate layers. Not a pyramid.

```
flowpage-showcase/
  README.md                 ← this map
  index.html                ← redirects to the showcase site
  showcase/                 ← static portfolio (GitHub Pages)
    index.html              ← studio main page
    process.html
    style.css
    projects/
      technician/           ← case 01 demo (+ management stub)
      pedicure-manicure/    ← case 02 demo
      architecture/         ← case 03 BakeFlow showcase
  packages/                 ← Google Apps Script copy kits (manual paste)
    computer-technician/    ← live kit (Code.gs + Index + Management)
    pedicure-manicure/      ← placeholder
    architecture/           ← placeholder
```

## What lives where

| Layer | Purpose | Edit when… |
|---|---|---|
| `showcase/` | Portfolio site visitors see | Changing demos, branding, case pages |
| `packages/<name>/` | Files you paste into Apps Script | Changing forms, sheets, owner management, gallery API |

Each business system is its own package. The main page only **links** to demos; it does not own their backend.

## Copy a system into Google Apps Script

1. Open `packages/<project>/`.
2. Follow that folder’s `COPY-TO-APPS-SCRIPT.md` (computer-technician already has one).
3. Paste only the listed `.gs` / `.html` / `appsscript.json` files.

## Showcase ↔ package pairing

| Showcase demo | Apps Script package |
|---|---|
| `showcase/projects/technician/` | `packages/computer-technician/` |
| `showcase/projects/pedicure-manicure/` | `packages/pedicure-manicure/` (todo) |
| `showcase/projects/architecture/` | `packages/bakery-production/` |

## GitHub Pages

Site files are under `showcase/`. Root `index.html` sends visitors there.  
If you prefer Pages from `/docs`, rename `showcase` → `docs` and update the root redirect.
