import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { UploadZone } from '@/components/upload-zone'

export default function NewRollPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        All Rolls
      </Link>

      <h1 className="text-xl font-semibold text-foreground mb-1">New Roll</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Import scans from your lab&apos;s .zip file.
      </p>

      <UploadZone />
    </div>
  )
}
