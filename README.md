# Grained

Grained is a self-hosted archive for lab-scanned film rolls. It gives you one place to keep your scans, notes, and roll details so you can reliably revisit work months or years later.

Day to day, you can import scan ZIPs, organize rolls, browse frames in a lightbox, annotate images, and quickly find past rolls when you want to review or share.

---

## Features

- **Fast roll import** — drop in a lab scan ZIP and Grained prepares your frames so they are ready to browse.
- **Organized roll records** — keep film stock, format, ISO, camera, lens, lab details, and dates together with each roll.
- **Comfortable frame browsing** — use the full-screen lightbox with keyboard navigation, rotation, and frame info at a glance.
- **Per-frame notes and settings** — store exposure details and notes directly on each frame so context is never lost.
- **Comments for context** — add roll-level and frame-level comments for editing notes, reminders, or collaboration.
- **Flexible roll covers** — choose any frame as the cover image so your archive stays visually scannable.
- **Bulk cleanup tools** — multi-select frames when you need to remove rejects quickly.
- **Dark and light theme** — pick the viewing style that works best in your workspace.
- **Private by default** — self-hosted, single-user workflow with no cloud dependency.

---

## Getting started (Docker)

**Requirements:** Docker + Docker Compose

```bash
git clone https://github.com/Revise0592/grained.git
cd grained
cp .env.example .env
```

### Configure environment variables

Set these **minimum required variables** in `.env`:

- `DATABASE_URL`
- `UPLOAD_DIR`

Optional / advanced variables:

- `AUTH_DISABLED`
- `AUTH_PASSWORD`
- `SESSION_SECRET`
- `API_KEY`
- `UPLOAD_TEMP_TTL_MS`
- `ENABLE_LEGACY_CHUNK_UPLOAD`

Then start Grained:

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:/data/grained.db` | Location of your archive database. |
| `UPLOAD_DIR` | `/data/uploads` | Folder where original scans and generated files are stored. |
| `AUTH_DISABLED` | `true` | Explicitly disables authentication for local/public deployments. |
| `AUTH_PASSWORD` | *(unset)* | Password used for login when `AUTH_DISABLED=false`. |
| `SESSION_SECRET` | *(unset)* | Secret used to sign revocable login sessions when `AUTH_DISABLED=false`. |
| `API_KEY` | *(unset)* | Bearer token for API access via middleware protection. |
| `UPLOAD_TEMP_TTL_MS` | `86400000` | How long temporary upload files are kept before cleanup (in milliseconds). |
| `ENABLE_LEGACY_CHUNK_UPLOAD` | `false` | Compatibility mode for older chunked upload behavior. |

#### Common deployment patterns

- **Local default:** Leave `AUTH_DISABLED=true` for a simple local archive.
- **Password-protected:** Set `AUTH_DISABLED=false` and add `AUTH_PASSWORD` plus `SESSION_SECRET`.
- **API-enabled:** Add `API_KEY` when you want protected API access alongside the web app.

If `AUTH_DISABLED` is not set to `true`, Grained now requires both `AUTH_PASSWORD` and `SESSION_SECRET`. Partial auth configuration is treated as an error and the container will refuse to start.

---

## Data persistence

Your archive lives in a named Docker volume (`grained_data`), separate from app files, so updates do not overwrite your scans or database.

```
grained_data/
├── grained.db
└── uploads/
    └── <roll-id>/
        ├── 0001.jpg
        ├── 0002.tif
        └── thumbs/
            ├── 0001.jpg
            └── 0002.jpg
```

Database updates are applied automatically when the container starts.

---

## Importing a roll

1. Download a ZIP of scans from your lab.
2. Click **New Roll** and drag the ZIP into the upload area.
3. Name the roll and click **Import Roll**.
4. Open **Edit** to add roll details and notes.

Supported formats: JPG, TIFF, PNG, HEIC, WebP.

Uploads are capped to protect the host: direct uploads and assembled legacy chunk uploads are limited to roughly 800 MB per job, legacy chunks are limited to 10 MB each with a maximum of 80 chunks, and Grained refuses new uploads when shared temp storage is exhausted.

---

## Development

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL to a local path
npx prisma migrate dev
npm run dev
```

---

## AI Disclosure

I've used AI in parts of this project, mainly on the database side, as a learning tool. I understand what the code does and welcome issue reports to improve it.
