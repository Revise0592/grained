'use client'

import Link from 'next/link'
import { Image as ImageIcon } from 'lucide-react'
import { cn, formatDate, imageUrl } from '@/lib/utils'
import type { Roll, Photo, Tag } from '@prisma/client'
import type { DisplayPreferences } from '@/lib/settings'
import { DEFAULT_THEME_PALETTE } from '@/lib/themes'

type RollWithMeta = Roll & {
  photos: Pick<Photo, 'id' | 'path' | 'filename' | 'rotation'>[]
  _count: { photos: number; comments: number }
  tags?: Pick<Tag, 'name'>[]
}

const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  theme: 'dark',
  palette: DEFAULT_THEME_PALETTE,
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
      className="card-link group block rounded-lg overflow-hidden border border-border bg-card hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="aspect-[3/2] bg-muted relative overflow-hidden">
        {cover ? (
          <div className="zoom h-full w-full">
            <img
              src={imageUrl(cover.path, true)}
              alt={roll.name}
              className="w-full h-full object-cover"
              style={coverRotation ? { transform: `rotate(${coverRotation}deg)${coverIsTransverse ? ' scale(1.5)' : ''}` } : undefined}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {roll._count.photos > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded font-mono text-xs tabular-nums bg-black/60 text-white">
            {roll._count.photos} fr
          </div>
        )}
      </div>

      <div className={cn(preferences.gridDensity === 'compact' ? 'p-3' : 'p-3 sm:p-4')}>
        <h2 className="font-medium text-foreground truncate text-[15px] leading-5">{roll.name}</h2>

        {preferences.showFrameMetadataInGrid && (
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground tabular-nums">
            {[
              roll.filmStock,
              roll.filmFormat,
              roll.iso ? `ISO ${roll.iso}${roll.pushPull && roll.pushPull !== '0' ? ` ${roll.pushPull}` : ''}` : null,
            ].filter(Boolean).join(' · ') || '\u00a0'}
          </p>
        )}

        {preferences.showTagsOnCards && roll.tags && roll.tags.length > 0 && (
          <div className="mt-2 hidden sm:flex flex-wrap gap-1">
            {roll.tags.slice(0, 3).map(tag => (
              <span key={tag.name} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {tag.name}
              </span>
            ))}
            {roll.tags.length > 3 && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                +{roll.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {preferences.gridDensity !== 'compact' && (
          <div className="mt-2 text-[13px] text-muted-foreground tabular-nums">
            {roll.dateShotStart
              ? formatDate(roll.dateShotStart)
              : formatDate(roll.createdAt)}
          </div>
        )}
      </div>
    </Link>
  )
}
