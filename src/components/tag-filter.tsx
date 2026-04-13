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
    <div className="flex items-center gap-2 flex-wrap">
      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <button
        onClick={() => router.push('/')}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
          !activeTag
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        )}
      >
        All
      </button>
      {tags.map(tag => (
        <button
          key={tag.name}
          onClick={() => router.push(`/?tag=${encodeURIComponent(tag.name)}`)}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
            activeTag === tag.name
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          {tag.name}
          <span className={cn('opacity-60', activeTag === tag.name && 'opacity-80')}>
            {tag._count.rolls}
          </span>
        </button>
      ))}
      {activeTag && (
        <button
          onClick={() => router.push('/')}
          className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  )
}
