'use client'

import Link from 'next/link'
import { Camera, Image as ImageIcon } from 'lucide-react'
import { cn, imageUrl } from '@/lib/utils'
import { formatDateForDisplay, type CardDensity, type DateDisplayFormat } from '@/lib/display-settings'
import type { Roll, Photo } from '@prisma/client'

type RollWithMeta = Roll & {
  photos: Pick<Photo, 'id' | 'path' | 'filename' | 'rotation'>[]
  _count: { photos: number; comments: number }
}

export function RollCard({
  roll,
  cardDensity,
  dateDisplayFormat,
}: {
  roll: RollWithMeta
  cardDensity: CardDensity
  dateDisplayFormat: DateDisplayFormat
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

      <div className={cn(cardDensity === 'compact' ? 'p-2.5' : 'p-3.5')}>
        <h3 className={cn('font-medium text-foreground truncate leading-tight', cardDensity === 'compact' ? 'text-xs' : 'text-sm')}>
          {roll.name}
        </h3>

        <div className={cn('mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground', cardDensity === 'compact' ? 'text-[11px]' : 'text-xs')}>
          {roll.filmStock && (
            <span className="flex items-center gap-1 truncate">
              <Camera className="h-3 w-3 shrink-0" />
              {roll.filmStock}
            </span>
          )}
          {roll.filmFormat && <span className="shrink-0">{roll.filmFormat}</span>}
          {roll.iso && (
            <span className="shrink-0">ISO {roll.iso}{roll.pushPull && roll.pushPull !== '0' ? ` ${roll.pushPull}` : ''}</span>
          )}
        </div>

        <div className="mt-2 text-xs text-muted-foreground/70">
          {roll.dateShotStart
            ? formatDateForDisplay(roll.dateShotStart, dateDisplayFormat)
            : formatDateForDisplay(roll.createdAt, dateDisplayFormat)}
        </div>
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
