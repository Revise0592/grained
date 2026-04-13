# Grained

A self-hosted archive for film photography. Import rolls from your lab's scan zip, log metadata, browse in a lightbox, and annotate individual frames — all in a minimal dark/light interface.

---

## Features

- **Zip import** — drop a lab scan zip and Grained extracts, sorts, and thumbnails every frame automatically
- **Roll metadata** — film stock, format (35mm / 120 / 4×5), ISO, push/pull, camera, lens, lab, develop process (C-41, E-6, B&W, cross-process…), shot dates
- **Lightbox** — full-screen viewer with keyboard navigation, rotate CW/CCW, and per-frame info panel
- **Per-frame data** — frame number, shutter speed, aperture, EV comp, focal length, notes
- **Comments** — per-roll and per-frame comment threads
- **Cover photo** — pin any frame as the roll's cover in the catalog grid
- **Select & delete** — multi-select photos for bulk deletion, or delete individual frames
- **Dark / light theme** — defaults to dark, warm neutral palette
- **Single-user, self-hosted** — no accounts, no cloud, no telemetry

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router, standalone output) |
| Database | SQLite via Prisma 6 |
| Image processing | Sharp (thumbnails at 800 px) |
| Zip extraction | adm-zip |
| Styling | Tailwind CSS v3 + next-themes |
| Runtime | Node.js 20 |
| Deploy | Docker / Podman Compose |

---

## Getting started

### Requirements

- Docker **or** Podman + podman-compose

### 1. Clone the repo

```bash
git clone https://github.com/Revise0592/grained.git
cd grained
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` to set your options — the defaults work fine for a basic local install:

```env
# Where the SQLite database is stored (inside the container)
DATABASE_URL=file:/data/grained.db

# Where uploaded scans and thumbnails are stored (inside the container)
UPLOAD_DIR=/data/uploads

# Optional: enable password protection
AUTH_PASSWORD=your-password-here
SESSION_SECRET=a-long-random-string
```

Leave `AUTH_PASSWORD` and `SESSION_SECRET` blank (or remove them) to run without a login screen.

### 3. Start

**Docker Compose**
```bash
docker compose up -d
```

**Podman Compose**
```bash
podman-compose up -d
```

> **Bazzite / immutable Fedora:** install podman-compose with `pip3 install --user podman-compose`.

Open [http://localhost:3000](http://localhost:3000).

### docker-compose.yml reference

```yaml
services:
  grained:
    build: .
    container_name: grained
    ports:
      - "3000:3000"        # change left side to expose on a different host port
    volumes:
      - grained_data:/data  # all photos and the database live here
    environment:
      DATABASE_URL: ${DATABASE_URL:-file:/data/grained.db}
      UPLOAD_DIR: ${UPLOAD_DIR:-/data/uploads}
      AUTH_PASSWORD: ${AUTH_PASSWORD:-}
      SESSION_SECRET: ${SESSION_SECRET:-}
    restart: unless-stopped

volumes:
  grained_data:
    driver: local
```

All environment variables are read from your `.env` file at startup — you never need to edit `docker-compose.yml` directly.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:/data/grained.db` | SQLite path inside the container |
| `UPLOAD_DIR` | `/data/uploads` | Scan and thumbnail storage inside the container |
| `AUTH_PASSWORD` | *(unset)* | Password for the login screen — omit to disable auth |
| `SESSION_SECRET` | *(unset)* | Secret for signing session tokens — set a random string when using auth |

Both data paths default to `/data` inside the container, persisted by the `grained_data` named volume. Your archive never leaves your machine.

---

## Data

All roll data (photos, database) lives in a named volume (`grained_data`). It is completely separate from the application code — updating Grained never affects your archive.

```
grained_data/
├── grained.db          # SQLite database
└── uploads/
    └── <roll-id>/
        ├── 0001.jpg    # Original scans
        ├── 0002.tif
        └── thumbs/
            ├── 0001.jpg  # 800 px thumbnails
            └── 0002.jpg
```

Database migrations run automatically on startup via `prisma migrate deploy`.

---

## Importing a roll

1. Get a zip of scans from your lab (most mail-in labs offer this)
2. Click **New Roll** → drag the zip onto the upload zone
3. Give the roll a name and click **Import Roll**
4. Fill in roll metadata (film stock, camera, dates, etc.) via **Edit**

Supported image formats inside the zip: JPG, TIFF, PNG, HEIC, WebP.

---

## Development

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL to a local path
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## License

MIT
