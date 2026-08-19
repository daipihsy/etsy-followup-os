# Etsy Listing Follow-up OS

A local-first operations system for managing a **pool of Etsy listings** — not orders, not a single hero product. It answers one question every time you open it:

> **“Which listings do I need to handle today?”**

You have many listings with decent CTR. The hard part isn't finding a good link — it's remembering what you did to each listing, when to come back, which experiments are running, and which promising listings are being neglected. This app tracks all of that.

- **Today** — a prioritized follow-up queue (overdue reviews, due today, growing, testing, untouched winners).
- **Dashboard** — a dense, sortable, filterable table of the whole pool, with bulk actions.
- **Pipeline** — a drag-and-drop kanban across listing stages.
- **Experiments** — one variable at a time, with Before / After and outcome.
- **Analytics** — CTR × CVR Product Matrix, Untouched Winners, and *My Etsy Playbook* (win-rate by variable).
- **Settings** — thresholds, currency, theme, and JSON backup / restore.

Everything is stored **locally in your browser** (IndexedDB). No server, no account, no cloud, no Etsy API.

---

## Tech stack

- **Next.js 14** (App Router, static export) + **TypeScript**
- **Tailwind CSS** (desktop-first, dark mode)
- **IndexedDB** via **Dexie** + `dexie-react-hooks` (live queries)
- **Recharts** (Product Matrix scatter, metric trend lines)

---

## Requirements

- **Node.js 18.18+** (Node 20 recommended)
- npm

---

## Install

```bash
npm install
```

## Local development

```bash
npm run dev
```

Open http://localhost:3000. On first run the app is empty and offers **Load Demo Data** (~15 sample listings covering every scenario: high CTR/high CVR, high CTR/low CVR, new, growing, testing, winner, overdue review, untouched winner).

## Type-check, lint, build

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # next build -> static export into ./out
```

`npm run build` produces a fully static site in **`./out`** (via `output: 'export'` in `next.config.mjs`). This is what gets published to GitHub Pages.

---

## Deploy to GitHub Pages

### Option A — automatic (recommended)

A workflow is included at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Create a GitHub repository and push this project to the **`main`** branch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Etsy Listing Follow-up OS"
   git branch -M main
   git remote add origin https://github.com/<your-user>/<your-repo>.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Every push to `main` builds and deploys automatically. The workflow **derives the base path from your repo name**, so:
   - A repo named `etsy-followup-os` → served at `https://<user>.github.io/etsy-followup-os/`
   - A repo named `<user>.github.io` → served at the domain root (no base path).

The site will be live at the URL shown in the **Actions → Deploy → deploy** job summary (and under Settings → Pages).

### Option B — manual build & upload

If you prefer to build locally and publish `./out` yourself, set the base path to match your repo name:

```bash
NEXT_PUBLIC_BASE_PATH=/<your-repo> npm run build
```

Then serve or publish the contents of `./out`. The included `public/.nojekyll` file (copied into `out/`) prevents GitHub Pages' Jekyll processing from hiding the `_next/` assets folder.

> **Base path matters.** GitHub Pages project sites live under `/<repo>/`. If assets 404 after deploy, it's almost always because the build wasn't given the right `NEXT_PUBLIC_BASE_PATH`. The Actions workflow handles this for you.

---

## Where your data lives

All data is stored in your browser's **IndexedDB** under the database name **`etsy-followup-os`**. Tables: `listings`, `actions`, `snapshots`, `experiments`, `reviews`, `settings`, `savedFilters`.

Implications:
- Data is **per-browser and per-device**. It is not synced. Using a different browser or computer shows a different (empty) database.
- Clearing browser site data / “Clear cookies and site data” for the origin **erases everything**. Export first.
- Incognito/private windows usually start empty and discard data on close.

## Backup (export)

**Settings → Data & Backup → Export All Data (JSON)** downloads a file like:

```
etsy-followup-backup-2026-08-20.json
```

It contains every listing, action, snapshot, experiment, review, saved filter, and your settings. Do this regularly.

## Restore (import)

**Settings → Data & Backup → Import Backup…**, choose a previously exported JSON file, then pick a mode:

- **Merge** — keeps your current data and adds/overwrites records by id. Good for moving data to a new browser without losing what's already there.
- **Replace** — **wipes the current database** and loads only the backup's contents. Requires a second confirmation.

## Reset

**Settings → Data & Backup → Reset All Data** permanently deletes everything in this browser (double-confirmed). Export a backup first.

---

## Core concepts

- **Listing Age** is computed from `publishDate` and bucketed into **New (0–7d), Early (8–14d), Growing (15–30d), Mature (30+d)**.
- **Actions** record what you changed (Price, Main Image, Title, Ads, …) with before/after, a reason, and an optional **next review** interval (default 3 days).
- **Reviews** are separate from actions on purpose: a review can conclude **“Keep Current Setup”** — deciding *not* to change something is a valid, recorded outcome.
- **Snapshots** capture metrics at a point in time (all fields optional, ~20 seconds to log). The latest snapshot becomes the listing's current metrics.
- **Experiments** change one variable, capture a before snapshot, and on conclusion show **Before / After / Δ** with a Positive / Neutral / Negative outcome and your decision.
- **Untouched Winners** = strong performance (CTR ≥ threshold **and** ROAS/CVR/orders signal) but **no action for ≥ N days** (default 5). The app only asks you to *review* them — sometimes the right move is to leave them alone.

Thresholds (Positive CTR / CVR / ROAS, Untouched warning days, Default review interval, Product Matrix quadrant lines) are all configurable in **Settings**.

---

## Project structure

```
etsy-followup-os/
├─ .github/workflows/deploy.yml   # GitHub Pages CI (build + deploy)
├─ next.config.mjs                # static export + basePath from env
├─ tailwind.config.ts             # theme tokens (dark mode via class)
├─ public/.nojekyll               # keep _next/ on GitHub Pages
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx               # root layout + pre-paint theme script
│  │  ├─ globals.css              # theme tokens + component classes
│  │  ├─ page.tsx                 # Today (default route)
│  │  ├─ dashboard/page.tsx       # Dashboard table + filters + bulk
│  │  ├─ pipeline/page.tsx        # Kanban (drag & drop)
│  │  ├─ experiments/page.tsx     # Experiments + Before/After
│  │  ├─ analytics/page.tsx       # Product Matrix, Playbook, Untouched
│  │  ├─ settings/page.tsx        # Thresholds + backup/restore
│  │  └─ listing/page.tsx         # Listing detail (/listing?id=…) + timeline
│  ├─ components/                 # AppShell, forms, badges, UI, filters, bulk
│  ├─ hooks/useData.ts            # live IndexedDB queries + enrichment
│  └─ lib/                        # types, db (Dexie), repo, derive, filters,
│                                 # date, demo, util
└─ README.md
```

The Listing Detail page uses a query parameter (`/listing?id=…`) rather than a dynamic route, so it works with static export (arbitrary IDs live only in the browser and can't be pre-rendered).

---

## Current limitations (V1)

By design, this version deliberately does **not** include:

- Etsy API, order sync, or any automatic metric import (metrics are entered by hand via snapshots).
- Automatic price/ads changes or auto-optimization — the app records and reminds; **you make the operational calls**.
- Accounts, authentication, cloud sync, or multi-user/collaboration.
- Cross-device sync — data is local to one browser (use JSON export/import to move it).
- Server-side anything — it's a fully static site.

These may come later. V1 is focused on doing one thing well: keeping a whole pool of listings under continuous, deliberate follow-up.
