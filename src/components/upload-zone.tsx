'use client'

import { useState, useRef } from 'react'
import { UploadCloud, FileArchive, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UploadZoneProps {
  onSuccess?: (rollId: string) => void
}

type ProgressState =
  | { stage: 'idle' }
  | { stage: 'uploading'; loaded: number; total: number }
  | { stage: 'assembling' }
  | { stage: 'extracting'; message: string }
  | { stage: 'processing'; current: number; total: number; name: string }
  | { stage: 'done'; rollId: string; count: number }
  | { stage: 'error'; message: string }

/** 10 MB per chunk — fallback path when single-request upload is rejected by infra limits. */
const CHUNK_SIZE = 10 * 1024 * 1024

function generateJobId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-accent transition-all duration-200 ease-out rounded-full"
        style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
      />
    </div>
  )
}

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [rollName, setRollName] = useState('')
  const [progress, setProgress] = useState<ProgressState>({ stage: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rollNameRef = useRef(rollName)
  rollNameRef.current = rollName

  const busy =
    progress.stage === 'uploading' ||
    progress.stage === 'assembling' ||
    progress.stage === 'extracting' ||
    progress.stage === 'processing' ||
    progress.stage === 'done'

  const selectFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setProgress({ stage: 'error', message: 'Please select a .zip file' })
      return
    }
    // On Linux (Flatpak/Snap browsers, some drag sources) the File object can
    // arrive with size 0 even when the file is valid — catch it early.
    if (f.size === 0) {
      setProgress({
        stage: 'error',
        message: 'Could not read the dropped file. Try dragging from your file manager, or use Browse Files.',
      })
      return
    }
    setFile(f)
    setProgress({ stage: 'idle' })
    if (!rollNameRef.current) {
      setRollName(f.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' '))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) selectFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    // Prefer DataTransferItem.webkitGetAsEntry() — it resolves the real File
    // object with correct size even on Linux where getAsFile() may return size 0.
    const item = e.dataTransfer.items?.[0]
    if (item?.kind === 'file') {
      const entry = item.webkitGetAsEntry()
      if (entry?.isFile) {
        ;(entry as FileSystemFileEntry).file(
          (f) => selectFile(f),
          () => {
            // Entry API failed — fall back to getAsFile()
            const f = item.getAsFile()
            if (f) selectFile(f)
          },
        )
        return
      }
      // No entry API — try getAsFile() directly
      const f = item.getAsFile()
      if (f) selectFile(f)
      return
    }

    // Last resort: legacy files collection
    const f = e.dataTransfer.files?.[0]
    if (f) selectFile(f)
  }

  const reset = () => {
    setFile(null)
    setRollName('')
    setProgress({ stage: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  const upload = async () => {
    if (!file || busy) return

    try {
      const singleRequestUpload = () =>
        new Promise<string>((resolve, reject) => {
          const form = new FormData()
          form.append('file', file)
          form.append('name', rollName || file.name.replace(/\.zip$/i, ''))

          const xhr = new XMLHttpRequest()
          xhr.open('POST', '/api/upload')

          xhr.upload.onprogress = (e) => {
            setProgress({
              stage: 'uploading',
              loaded: e.loaded,
              total: e.total || file.size,
            })
          }

          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText) as { jobId?: string; error?: string }
              if (xhr.status < 300 && data.jobId) {
                setProgress({ stage: 'uploading', loaded: file.size, total: file.size })
                resolve(data.jobId)
                return
              }
              reject(new Error(data.error ?? `Upload failed (${xhr.status})`))
            } catch {
              reject(new Error('Unexpected upload response'))
            }
          }

          xhr.onerror = () => reject(new Error('Network error during upload — check your connection'))
          xhr.ontimeout = () => reject(new Error('Upload timed out'))

          xhr.send(form)
        })

      const shouldFallbackToChunkUpload = (err: unknown) => {
        if (!(err instanceof Error)) return false
        const msg = err.message.toLowerCase()
        return (
          msg.includes('(413') ||
          msg.includes('payload too large') ||
          msg.includes('request entity too large') ||
          msg.includes('body too large') ||
          msg.includes('502') ||
          msg.includes('504')
        )
      }

      const chunkedUploadFallback = async () => {
        const jobId = generateJobId()
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
        let bytesConfirmed = 0

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE
          const end = Math.min(start + CHUNK_SIZE, file.size)
          const chunk = file.slice(start, end)
          const chunkSize = end - start

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('POST', '/api/upload/chunk')
            xhr.setRequestHeader('Content-Type', 'application/octet-stream')
            xhr.setRequestHeader('X-Job-Id', jobId)
            xhr.setRequestHeader('X-Chunk-Index', String(i))
            xhr.setRequestHeader('X-Total-Chunks', String(totalChunks))
            xhr.setRequestHeader('X-File-Name', file.name)
            xhr.setRequestHeader('X-Roll-Name', encodeURIComponent(rollName || file.name.replace(/\.zip$/i, '')))

            xhr.upload.onprogress = (e) => {
              setProgress({
                stage: 'uploading',
                loaded: bytesConfirmed + e.loaded,
                total: file.size,
              })
            }

            xhr.onload = () => {
              try {
                const data = JSON.parse(xhr.responseText) as { ok?: boolean; error?: string }
                if (xhr.status < 300 && data.ok) {
                  bytesConfirmed += chunkSize
                  setProgress({ stage: 'uploading', loaded: bytesConfirmed, total: file.size })
                  resolve()
                } else {
                  reject(new Error(data.error ?? `Server error on chunk ${i}`))
                }
              } catch {
                reject(new Error(`Unexpected response on chunk ${i}`))
              }
            }

            xhr.onerror = () => reject(new Error(`Network error on chunk ${i} — check your connection`))
            xhr.ontimeout = () => reject(new Error(`Timeout on chunk ${i}`))

            xhr.send(chunk)
          })
        }

        setProgress({ stage: 'assembling' })

        const assembleRes = await fetch('/api/upload/assemble', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            totalChunks,
            fileName: file.name,
            rollName: rollName || file.name.replace(/\.zip$/i, ''),
          }),
        })
        if (!assembleRes.ok) {
          const data = (await assembleRes.json()) as { error?: string }
          throw new Error(data.error ?? 'Assembly failed')
        }
        const assembleData = (await assembleRes.json()) as { jobId?: string }
        if (!assembleData.jobId) {
          throw new Error('Assembly response missing jobId')
        }

        return assembleData.jobId
      }

      let processJobId: string
      try {
        processJobId = await singleRequestUpload()
      } catch (err) {
        if (!shouldFallbackToChunkUpload(err)) throw err
        processJobId = await chunkedUploadFallback()
      }

      // ── Phase 2: Stream processing progress via SSE ───────────────────────────
      setProgress({ stage: 'extracting', message: 'Opening zip file…' })

      const response = await fetch(`/api/upload/${processJobId}/process`, {
        headers: { Accept: 'text/event-stream' },
      })
      if (!response.ok || !response.body) {
        throw new Error('Failed to start processing stream')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE events are separated by double newlines
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue

          let event: {
            stage: string
            message?: string
            current?: number
            total?: number
            name?: string
            rollId?: string
            count?: number
          }
          try {
            event = JSON.parse(line.slice(6))
          } catch {
            continue
          }

          if (event.stage === 'extracting') {
            setProgress({ stage: 'extracting', message: event.message ?? 'Extracting…' })
          } else if (event.stage === 'processing') {
            setProgress({
              stage: 'processing',
              current: event.current!,
              total: event.total!,
              name: event.name ?? '',
            })
          } else if (event.stage === 'done') {
            setProgress({ stage: 'done', rollId: event.rollId!, count: event.count! })
            if (onSuccess) {
              onSuccess(event.rollId!)
            } else {
              router.push(`/rolls/${event.rollId}`)
            }
            break outer
          } else if (event.stage === 'error') {
            throw new Error(event.message ?? 'Processing failed')
          }
        }
      }
    } catch (err) {
      setProgress({ stage: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  // Derived display values
  const uploadPct =
    progress.stage === 'uploading' && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : null
  const processPct =
    progress.stage === 'processing'
      ? Math.round((progress.current / progress.total) * 100)
      : null

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Drop zone ────────────────────────────────────────────────────────────── */}
      {!file && !busy && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer select-none ${
            dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <UploadCloud
              className={`h-10 w-10 ${dragOver ? 'text-accent' : 'text-muted-foreground'}`}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {dragOver ? 'Drop it here' : 'Drag & drop or click to select'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Supports JPG, TIFF, PNG, HEIC inside a .zip — no size limit
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
              className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Browse Files
            </button>
          </div>
        </div>
      )}

      {/* ── File selected, ready to import ─────────────────────────────────────── */}
      {file && progress.stage === 'idle' && (
        <>
          <div className="border border-border rounded-lg p-4 flex items-center gap-3">
            <FileArchive className="h-8 w-8 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              Remove
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Roll name</label>
            <input
              type="text"
              value={rollName}
              onChange={(e) => setRollName(e.target.value)}
              placeholder="e.g. Summer 2024, Roll 12"
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button
            onClick={upload}
            className="w-full py-2.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Import Roll
          </button>
        </>
      )}

      {/* ── Upload progress ─────────────────────────────────────────────────────── */}
      {progress.stage === 'uploading' && (
        <div className="space-y-2.5 py-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Uploading…</span>
            <span className="text-muted-foreground tabular-nums">
              {uploadPct !== null ? `${uploadPct}%` : '—'}
            </span>
          </div>
          <ProgressBar percent={uploadPct ?? 0} />
          {progress.total > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {(progress.loaded / 1024 / 1024).toFixed(1)} / {(progress.total / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
        </div>
      )}

      {/* ── Assembling chunks ────────────────────────────────────────────────────── */}
      {progress.stage === 'assembling' && (
        <div className="flex items-center gap-2.5 py-1 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Assembling file on server…</span>
        </div>
      )}

      {/* ── Extracting / opening ZIP ─────────────────────────────────────────────── */}
      {progress.stage === 'extracting' && (
        <div className="flex items-center gap-2.5 py-1 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{progress.message}</span>
        </div>
      )}

      {/* ── Per-image processing progress ──────────────────────────────────────── */}
      {progress.stage === 'processing' && (
        <div className="space-y-2.5 py-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Processing photos…</span>
            <span className="text-muted-foreground tabular-nums">
              {progress.current} / {progress.total}
            </span>
          </div>
          <ProgressBar percent={processPct!} />
          <p className="text-xs text-muted-foreground truncate" title={progress.name}>
            {progress.name}
          </p>
        </div>
      )}

      {/* ── Done ─────────────────────────────────────────────────────────────────── */}
      {progress.stage === 'done' && (
        <div className="flex items-center gap-2 py-1 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span>
            Imported {progress.count} photo{progress.count !== 1 ? 's' : ''} — redirecting…
          </span>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────────── */}
      {progress.stage === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{progress.message}</span>
          </div>
          <button
            onClick={reset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
