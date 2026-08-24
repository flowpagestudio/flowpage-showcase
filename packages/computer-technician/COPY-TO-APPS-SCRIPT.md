# Copy kit — Computer Technician

Paste these files **together** into one Google Apps Script project  
(account: `flowpagestudio@gmail.com`).

## Files to copy

| File in this folder | Name in Apps Script editor |
|---|---|
| `Code.gs` | `Code.gs` |
| `Index.html` | `Index` |
| `Management.html` | `Management` |
| `appsscript.json` | Project Settings → Show `appsscript.json` |

Do **not** paste `COPY-TO-APPS-SCRIPT.md`, `Gallery.md`, or `.clasp.json.example` into Apps Script.

## Manual steps

1. Open the Apps Script project while signed in as `flowpagestudio@gmail.com`.
2. Replace the four files above as one version → Save.
3. Run `setupProject` once from the editor and approve Drive / Gmail / Calendar.
4. Deploy → Manage deployments → Edit → **New version** → Deploy  
   (or new Web App: Execute as **Me**, Who has access **Anyone**).
5. Copy the `/exec` URL.

## Live deployment URL

`https://script.google.com/macros/s/AKfycbwEMKeizrjNhqjjTsvh9W8OzrfI5Mzgp7qj7MaZ8OsVqho9TrtSQ6KaXVxNfqcb1mE/exec`

Important: when updating code, use **Deploy → Manage deployments → Edit (pencil) → New version**.  
Creating a brand-new Web App deployment changes the `/exec` URL and breaks the Pages links until you update them again.

## One Web App URL — all views

| Surface | Path |
|---|---|
| Public lead form | `/exec` |
| Owner management | `/exec?view=management` |
| Public gallery JSONP | `/exec?view=gallery&callback=FlowPageGallery` |
| Health check | `/exec?view=health` |

Wire the showcase demo at `showcase/projects/technician/` so CTAs and the gallery `<script src>` use that same `/exec` base.

## What the system does

- Public lead form (`Index`) with file uploads to Drive
- Sheet `פניות` + Gmail alert to the business owner
- Management UI (`?view=management`): statuses + gallery
- Public gallery feed (`?view=gallery`) for the showcase site

## Sheets

Workbook ID is set in `CONFIG.SHEET_ID` inside `Code.gs`.

| Sheet | Role |
|---|---|
| `פניות` | Live leads + statuses |
| `גלריה` | Five slots (`gallery-1` … `gallery-5`) |
| `הגדרות` | Owner email, folder IDs |

Images live in Drive; the sheet stores metadata and display URLs.

## End-to-end check

1. Open `/exec` → submit a test lead → row in `פניות` → owner email arrives.
2. Open `/exec?view=management` → change status → customer email updates.
3. Replace a gallery image → `/exec?view=gallery` returns the new URL.
4. Reload `showcase/projects/technician/` → gallery updates without editing Git assets.

## clasp (optional, later)

```bash
npm i -g @google/clasp
cp packages/computer-technician/.clasp.json.example packages/computer-technician/.clasp.json
# put the Script ID into .clasp.json
clasp login
cd packages/computer-technician
clasp push
clasp deploy
```

Do not commit a real `.clasp.json`.
