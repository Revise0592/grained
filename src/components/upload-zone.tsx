'use client'

import { useEffect, useState, useRef } from 'react'
import { UploadCloud, FileArchive, FileImage, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { AppSettingsShape } from '@/lib/settings'

interface UploadZoneProps {
  onSuccess?: (rollId: string) => void
  targetRollId?: string
}

type ProgressState =
  | { stage: 'idle' }
  | { stage: 'uploading'; loaded: number; total: number }
  | { stage: 'extracting'; message: string }
  | { stage: 'processing'; current: number; total: number; name: string }
  | { stage: 'done'; rollId: string; count: number }
  | { stage: 'error'; message: string }

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

export function UploadZone({ onSuccess, targetRollId }: UploadZoneProps) {
  const router = useRouter()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectionMode, setSelectionMode] = useState<'zip' | 'files' | null>(null)
  const [rollName, setRollName] = useState('')
  const [frameNumberStart, setFrameNumberStart] = useState('')
  const [autoRotationPolicy, setAutoRotationPolicy] = useState('exif-only')
  const [duplicateHandling, setDuplicateHandling] = useState('rename')
  const [progress, setProgress] = useState<ProgressState>({ stage: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rollNameRef = useRef(rollName)
  rollNameRef.current = rollName

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((settings: AppSettingsShape) => {
        setFrameNumberStart(settings.importDefaults.frameNumberStart?.toString() ?? '')
        setAutoRotationPolicy(settings.importDefaults.autoRotationPolicy)
        setDuplicateHandling(settings.importDefaults.duplicateHandling)
      })
      .catch(() => {})
  }, [])

  const busy =
    progress.stage === 'uploading' ||
    progress.stage === 'extracting' ||
    progress.stage === 'processing' ||
    progress.stage === 'done'

  const normalizeCandidates = (candidates: File[]): { files?: File[]; mode?: 'zip' | 'files'; error?: string } => {
    if (candidates.length === 0) return { error: 'No files selected' }

    const nonEmptyFiles = candidates.filter((f) => f.size > 0)
    if (nonEmptyFiles.length === 0) {
      return {
        error: 'Could not read the dropped file. Try dragging from your file manager, or use Browse Files.',
      }
    }

    const zipFiles = nonEmptyFiles.filter((f) => f.name.toLowerCase().endsWith('.zip'))
    const imageFiles = nonEmptyFiles.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      return ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'heic', 'heif'].includes(ext)
    })

    if (zipFiles.length > 0 && imageFiles.length > 0) {
      return { error: 'Upload either one .zip or image files, not both.' }
    }

    if (zipFiles.length > 1) {
      return { error: 'Please select only one .zip file.' }
    }

    if (zipFiles.length === 1) {
      return { files: zipFiles, mode: 'zip' }
    }

    if (imageFiles.length > 0) {
      return { files: imageFiles, mode: 'files' }
    }

    return { error: 'No supported files found. Upload one .zip or image files (JPG, TIFF, PNG, HEIC, WebP).' }
  }

  const selectFromCandidates = (candidates: File[]) => {
    const checked = normalizeCandidates(candidates)
    if (!checked.files || !checked.mode) {
      setProgress({ stage: 'error', message: checked.error ?? 'Upload failed' })
      return
    }
    selectFiles(checked.files, checked.mode)
  }

  const selectFiles = (files: File[], mode: 'zip' | 'files') => {
    setSelectedFiles(files)
    setSelectionMode(mode)
    setProgress({ stage: 'idle' })
    if (!rollNameRef.current) {
      const defaultName =
        mode === 'zip'
          ? files[0].name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ')
          : `Import ${files.length} photo${files.length === 1 ? '' : 's'}`
      setRollName(defaultName)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      selectFromCandidates(files)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const filesFromItems = await Promise.all(
      Array.from(e.dataTransfer.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => new Promise<File | null>((resolve) => {
          // Prefer DataTransferItem.webkitGetAsEntry() — it resolves the real File
          // object with correct size even on Linux where getAsFile() may return size 0.
          const entry = item.webkitGetAsEntry()
          if (entry?.isFile) {
            ;(entry as FileSystemFileEntry).file(
              (f) => resolve(f),
              () => resolve(item.getAsFile()),
            )
            return
          }
          resolve(item.getAsFile())
        })),
    )
    const candidates = filesFromItems.filter((f): f is File => Boolean(f))

    if (candidates.length > 0) {
      selectFromCandidates(candidates)
      return
    }

    // Last resort: legacy files collection
    const fallbackFiles = Array.from(e.dataTransfer.files ?? [])
    if (fallbackFiles.length > 0) {
      selectFromCandidates(fallbackFiles)
    }
  }

  const reset = () => {
    setSelectedFiles([])
    setSelectionMode(null)
    setRollName('')
    setProgress({ stage: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  const upload = async () => {
    if (selectedFiles.length === 0 || busy) return

    try {
      const formData = new FormData()
      for (const selectedFile of selectedFiles) {
        formData.append('file', selectedFile)
      }
      const fallbackName =
        selectionMode === 'zip'
          ? selectedFiles[0].name.replace(/\.zip$/i, '')
          : `Import ${selectedFiles.length} photo${selectedFiles.length === 1 ? '' : 's'}`
      formData.append('name', rollName || fallbackName)
      if (targetRollId) {
        formData.append('rollId', targetRollId)
      }
      if (frameNumberStart) {
        formData.append('frameNumberStart', frameNumberStart)
      }
      formData.append('autoRotationPolicy', autoRotationPolicy)
      formData.append('duplicateHandling', duplicateHandling)

      const uploadData = await new Promise<{ jobId?: string; error?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/upload')

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return
          setProgress({
            stage: 'uploading',
            loaded: e.loaded,
            total: e.total,
          })
        }

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText) as { jobId?: string; error?: string }
            if (xhr.status < 300 && data.jobId) {
              const totalSize = selectedFiles.reduce((sum, selectedFile) => sum + selectedFile.size, 0)
              setProgress({ stage: 'uploading', loaded: totalSize, total: totalSize })
              resolve(data)
            } else {
              reject(new Error(data.error ?? 'Upload failed'))
            }
          } catch {
            reject(new Error('Unexpected response from upload endpoint'))
          }
        }

        xhr.onerror = () => reject(new Error('Network error while uploading — check your connection'))
        xhr.ontimeout = () => reject(new Error('Upload timed out'))

        xhr.send(formData)
      })

      if (!uploadData.jobId) {
        throw new Error('Upload response missing jobId')
      }

      // ── Stream processing progress via SSE ───────────────────────────────────
      setProgress({ stage: 'extracting', message: 'Preparing uploaded files…' })

      const response = await fetch(`/api/upload/${uploadData.jobId}/process`, {
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
        accept=".zip,.jpg,.jpeg,.png,.tif,.tiff,.webp,.heic,.heif"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Drop zone ────────────────────────────────────────────────────────────── */}
      {selectedFiles.length === 0 && !busy && (
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
                Upload one .zip or individual JPG, TIFF, PNG, HEIC, WebP files
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
              className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Browse Files
            </button>
          </div>
        </div>
      )}

      {/* ── File selected, ready to import ─────────────────────────────────────── */}
      {selectedFiles.length > 0 && progress.stage === 'idle' && (
        <>
          <div className="border border-border rounded-lg p-4 flex items-center gap-3">
            {selectionMode === 'zip' ? (
              <FileArchive className="h-8 w-8 text-accent shrink-0" />
            ) : (
              <FileImage className="h-8 w-8 text-accent shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectionMode === 'zip'
                  ? selectedFiles[0].name
                  : `${selectedFiles.length} image file${selectedFiles.length === 1 ? '' : 's'} selected`}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFiles.reduce((sum, selectedFile) => sum + selectedFile.size, 0) / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              Remove
            </button>
          </div>

          {!targetRollId && (
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
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Frame start</label>
              <input
                type="number"
                min="0"
                value={frameNumberStart}
                onChange={(e) => setFrameNumberStart(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Rotation</label>
              <select
                value={autoRotationPolicy}
                onChange={(e) => setAutoRotationPolicy(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="off">Off</option>
                <option value="exif-only">EXIF only</option>
                <option value="force-upright">Force upright</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Duplicates</label>
              <select
                value={duplicateHandling}
                onChange={(e) => setDuplicateHandling(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="skip">Skip</option>
                <option value="rename">Rename</option>
                <option value="replace">Replace</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={upload}
            className="w-full py-2.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            {targetRollId ? 'Add Photos' : 'Import Roll'}
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
            type="button"
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
