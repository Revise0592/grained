'use client'

import { useRouter } from 'next/navigation'
import { Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagFilterProps {
  tags: { name: string; _count: { rolls: number } }[]
  activeTag: string | undefined
}

export function TagFilter({ tags, activeTag }: TagFilterProps) {
  const router = useRouter()

  if (tags.length === 0) return null

  return (
    <div className="flex items-center gap-2 sm:flex-wrap w-max sm:w-auto">
      <Tag className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <button
        onClick={() => router.push('/')}
        aria-pressed={!activeTag}
        className={cn(
          'h-9 sm:h-8 px-3 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !activeTag
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        )}
      >
        All
      </button>
      {tags.map(tag => (
        <button
          key={tag.name}
          onClick={() => router.push(`/?tag=${encodeURIComponent(tag.name)}`)}
          aria-pressed={activeTag === tag.name}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 sm:h-8 px-3 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeTag === tag.name
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          {tag.name}
          <span className={cn('font-mono tabular-nums opacity-60', activeTag === tag.name && 'opacity-80')}>
            {tag._count.rolls}
          </span>
        </button>
      ))}
      {activeTag && (
        <button
          onClick={() => router.push('/')}
          className="ml-1 inline-flex h-9 sm:h-8 items-center gap-1 px-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  )
}
