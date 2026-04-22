# Grained

Self-hosted archive for film photography. Import lab scan zips, log metadata, browse in a lightbox, annotate frames.

---

## Features

- **Zip import** — drop a lab scan zip, Grained extracts and thumbnails every frame
- **Roll metadata** — film stock, format, ISO, push/pull, camera, lens, lab, process, dates
- **Lightbox** — full-screen viewer with keyboard navigation, rotation, per-frame info panel
- **Per-frame data** — shutter, aperture, EV comp, focal length, notes
- **Comments** — per-roll and per-frame threads
- **Cover photo** — pin any frame as the roll's catalog cover
- **Bulk delete** — multi-select photos for deletion
- **Dark / light theme**
- **Single-user, self-hosted** — no accounts, no cloud, no telemetry

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router, standalone output) |
| Database | SQLite via Prisma 6 |
| Image processing | Sharp (800 px thumbnails) |
| Zip extraction | adm-zip |
| Styling | Tailwind CSS v3 + next-themes |
| Runtime | Node.js 24 |

---

## Getting started

**Requirements:** Docker + docker-compose

```bash
git clone https://github.com/Revise0592/grained.git
cd grained
cp .env.example .env
```

Edit `.env` — defaults work for a basic local install:

```env
DATABASE_URL=file:/data/grained.db
UPLOAD_DIR=/data/uploads

# Optional: enable password protection
AUTH_PASSWORD=your-password-here
SESSION_SECRET=a-long-random-string  # generate: openssl rand -base64 32
```

Omit `AUTH_PASSWORD` / `SESSION_SECRET` to run without a login screen.

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:/data/grained.db` | SQLite path inside container |
| `UPLOAD_DIR` | `/data/uploads` | Scan + thumbnail storage |
| `AUTH_PASSWORD` | *(unset)* | Login screen password — omit to disable auth |
| `SESSION_SECRET` | *(unset)* | Session signing secret — required when using auth |

---

## Data

All data lives in a named Docker volume (`grained_data`), separate from application code — updates never touch your archive.

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

Migrations run automatically on startup via `prisma migrate deploy`.

---

## Importing a roll

1. Get a zip of scans from your lab
2. **New Roll** → drag zip onto the upload zone
3. Name the roll → **Import Roll**
4. Fill in metadata via **Edit**

Supported formats: JPG, TIFF, PNG, HEIC, WebP.

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
