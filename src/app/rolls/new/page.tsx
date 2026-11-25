import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { UploadZone } from '@/components/upload-zone'

export default function NewRollPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-10 sm:pt-6">
      <Link
        href="/"
        className="hidden md:inline-flex h-8 items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        All rolls
      </Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16 md:items-start">
        <div className="md:pt-2">
          <h1 className="text-[28px] leading-9 sm:text-[40px] sm:leading-[48px] font-medium tracking-tight text-foreground">
            Import a roll
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-[44ch]">
            Drop in the .zip your lab sent, or the scans themselves. Grained makes the thumbnails and opens the roll when it is done.
          </p>
          <dl className="mt-6 hidden md:block divide-y divide-border border-y border-border text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Accepts</dt>
              <dd className="text-right">One .zip, or JPG, TIFF, PNG, HEIC and WebP files</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Size</dt>
              <dd className="font-mono tabular-nums">Up to 800 MB per import</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Order</dt>
              <dd className="text-right">Frames sorted by file name</dd>
            </div>
          </dl>
        </div>

        <UploadZone />
      </div>
    </div>
  )
}
