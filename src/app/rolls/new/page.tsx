'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, UploadCloud, FilePlus } from 'lucide-react'
import { UploadZone } from '@/components/upload-zone'
import { RollForm } from '@/components/roll-form'
import { cn } from '@/lib/utils'

type Mode = 'import' | 'manual'

export default function NewRollPage() {
  const [mode, setMode] = useState<Mode>('import')

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
        Import scans from a lab .zip, or create a roll manually to fill in later.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg mb-8 w-fit">
        <ModeBtn active={mode === 'import'} onClick={() => setMode('import')} icon={<UploadCloud className="h-4 w-4" />}>
          Import .zip
        </ModeBtn>
        <ModeBtn active={mode === 'manual'} onClick={() => setMode('manual')} icon={<FilePlus className="h-4 w-4" />}>
          Manual
        </ModeBtn>
      </div>

      {mode === 'import' ? <UploadZone /> : <RollForm />}
    </div>
  )
}

function ModeBtn({
  active, onClick, icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {children}
    </button>
  )
}
