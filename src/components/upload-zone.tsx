'use client'

import { useState, useRef } from 'react'
import { UploadCloud, FileArchive, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UploadZoneProps {
  onSuccess?: (rollId: string) => void
}

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [rollName, setRollName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')
    setFile(f)
    if (!rollName) {
      setRollName(f.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' '))
    }
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setProgress('Uploading…')

    const form = new FormData()
    form.append('file', file)
    form.append('name', rollName || file.name.replace(/\.zip$/i, ''))

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setProgress(`Done — ${data.photoCount} photos imported`)
      if (onSuccess) {
        onSuccess(data.rollId)
      } else {
        router.push(`/rolls/${data.rollId}`)
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Upload failed'
      const message =
        raw === 'Failed to fetch'
          ? 'Upload failed — the server did not respond. The file may be too large for the available memory.'
          : raw
      setError(message)
      setProgress('')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* File display / picker */}
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileArchive className="h-10 w-10 text-accent" />
            <p className="font-medium text-sm text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <button
              onClick={() => { setFile(null); setRollName(''); setError('') }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-1"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Select your lab .zip file</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Supports JPG, TIFF, PNG, HEIC inside a .zip
              </p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Browse Files
            </button>
          </div>
        )}
      </div>

      {/* Roll name */}
      {file && (
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Roll name</label>
          <input
            type="text"
            value={rollName}
            onChange={e => setRollName(e.target.value)}
            placeholder="e.g. Summer 2024, Roll 12"
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {/* Status */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {progress && !error && (
        <p className="text-sm text-muted-foreground">{progress}</p>
      )}

      {/* Upload button */}
      {file && !uploading && !progress && (
        <button
          onClick={upload}
          className="w-full py-2.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          Import Roll
        </button>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing images…
        </div>
      )}
    </div>
  )
}
