'use client'

import Link from 'next/link'
import { Camera, Image as ImageIcon } from 'lucide-react'
import { cn, formatDate, imageUrl } from '@/lib/utils'
import type { Roll, Photo, Tag } from '@prisma/client'
import type { DisplayPreferences } from '@/lib/settings'

type RollWithMeta = Roll & {
  photos: Pick<Photo, 'id' | 'path' | 'filename' | 'rotation'>[]
  _count: { photos: number; comments: number }
  tags?: Pick<Tag, 'name'>[]
}

const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  theme: 'dark',
  gridDensity: 'comfortable',
  showFrameMetadataInGrid: true,
  showTagsOnCards: true,
}

export function RollCard({
  roll,
  preferences = DEFAULT_DISPLAY_PREFERENCES,
}: {
  roll: RollWithMeta
  preferences?: DisplayPreferences
}) {
  const cover = roll.coverPhotoId
    ? (roll.photos.find(p => p.id === roll.coverPhotoId) ?? roll.photos[0])
    : roll.photos[0]
  const coverRotation = cover?.rotation ?? 0
  const coverIsTransverse = coverRotation === 90 || coverRotation === 270

  return (
    <Link
      href={`/rolls/${roll.id}`}
      className="group block rounded-lg overflow-hidden border border-border bg-card hover:border-accent/40 transition-all duration-200 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
    >
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {cover ? (
          <img
            src={imageUrl(cover.path, true)}
            alt={roll.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            style={coverRotation ? { transform: `rotate(${coverRotation}deg)${coverIsTransverse ? ' scale(1.4)' : ''}` } : undefined}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {roll._count.photos > 0 && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
            {roll._count.photos}
          </div>
        )}
      </div>

      <div className={cn(preferences.gridDensity === 'compact' ? 'p-2.5' : 'p-3.5')}>
        <h3 className="font-medium text-foreground truncate text-sm leading-tight">{roll.name}</h3>

        {preferences.showFrameMetadataInGrid && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {roll.filmStock && (
              <span className="flex items-center gap-1 truncate">
                <Camera className="h-3 w-3 shrink-0" />
                {roll.filmStock}
              </span>
            )}
            {roll.filmFormat && (
              <span className="shrink-0">{roll.filmFormat}</span>
            )}
            {roll.iso && (
              <span className="shrink-0">
                ISO {roll.iso}{roll.pushPull && roll.pushPull !== '0' ? ` ${roll.pushPull}` : ''}
              </span>
            )}
          </div>
        )}

        {preferences.showTagsOnCards && roll.tags && roll.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {roll.tags.slice(0, 3).map(tag => (
              <span key={tag.name} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {tag.name}
              </span>
            ))}
            {roll.tags.length > 3 && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                +{roll.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {preferences.gridDensity !== 'compact' && (
          <div className="mt-2 text-xs text-muted-foreground/70">
            {roll.dateShotStart
              ? formatDate(roll.dateShotStart)
              : formatDate(roll.createdAt)}
          </div>
        )}
      </div>
    </Link>
  )
}

export function RollCardSkeleton() {
  return (
    <div className={cn('rounded-lg overflow-hidden border border-border bg-card animate-pulse')}>
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    </div>
  )
}
