# Release bundle — Computer Technician

Copy these files **together** into the Google Apps Script project under `flowpagestudio@gmail.com`:

1. `Code.gs`
2. `Index.html` (Apps Script file name: `Index`)
3. `Management.html` (Apps Script file name: `Management`)
4. `appsscript.json`

## Manual paste (current)

1. Open the business Apps Script project while signed in as `flowpagestudio@gmail.com`.
2. Replace all four files above as one version.
3. Save.
4. Run `setupProject` once from the editor and approve Drive / Gmail / Calendar.
5. Deploy → Manage deployments → Edit → **New version** → Deploy  
   (or create a new Web App: Execute as **Me**, Who has access **Anyone**).
6. Copy the `/exec` URL.

## Live deployment URL

`https://script.google.com/macros/s/AKfycbykp5QoR-nIBwEwCuNSziPz-waGd0ymqnbOsIJcgVAhgm5T-kGUce6xi9I2-OdqKrvNuQ/exec`

## Where the gallery appears

| Surface | Gallery? |
|---|---|
| Public site `projects/technician/` | Yes — visitor-facing gallery |
| Web App `/exec` (Index form) | Yes — same live gallery feed above the process steps |
| Web App `/exec?view=management` | Yes — owner edit controls |
| Static `management.html` demo | No — link only to live management |

## Wire the public site

Use **one** Web App URL for everything:

| Surface | Path |
|---|---|
| Lead form | `/exec` |
| Owner management | `/exec?view=management` |
| Public gallery JSONP | `/exec?view=gallery&callback=FlowPageGallery` |
| Health check | `/exec?view=health` |

Update `projects/technician/index.html` so the CTA buttons and the gallery `<script src>` all use that same `/exec` base.  
If lead and gallery point at different deployments, the gallery stays stuck on “loading”.

## Sheets created / expected

Workbook ID is set in `CONFIG.SHEET_ID`.

| Sheet | Role |
|---|---|
| `פניות` | Live leads + statuses |
| `גלריה` | Five slots (`gallery-1` … `gallery-5`) |
| `הגדרות` | Owner email, folder IDs |

Images live in Drive; the sheet stores metadata and display URLs.

## clasp (later)

```bash
npm i -g @google/clasp
cp apps-script/computer-technician/.clasp.json.example apps-script/computer-technician/.clasp.json
# put the Script ID into .clasp.json
clasp login
cd apps-script/computer-technician
clasp push
clasp deploy
```

Do not commit a real `.clasp.json` with secrets; keep using the `.example` file in git.

## End-to-end check

1. Open `/exec` → submit a test lead → row appears in `פניות` → owner email arrives.
2. Open `/exec?view=management` → change status → customer email updates.
3. Replace a gallery image → confirm `/exec?view=gallery` returns the new URL.
4. Reload the public technician page → gallery figure updates without editing Git assets.
