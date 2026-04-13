'use client'

import Link from 'next/link'
import { Camera, Image as ImageIcon } from 'lucide-react'
import { cn, formatDate, imageUrl } from '@/lib/utils'
import type { Roll, Photo } from '@prisma/client'

type RollWithMeta = Roll & {
  photos: Pick<Photo, 'id' | 'path' | 'filename'>[]
  _count: { photos: number; comments: number }
}

export function RollCard({ roll }: { roll: RollWithMeta }) {
  const cover = roll.coverPhotoId
    ? roll.photos.find(p => p.id === roll.coverPhotoId) ?? roll.photos[0]
    : roll.photos[0]

  return (
    <Link
      href={`/rolls/${roll.id}`}
      className="group block rounded-lg overflow-hidden border border-border bg-card hover:border-accent/40 transition-all duration-200 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
    >
      {/* Cover photo */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {cover ? (
          <img
            src={imageUrl(cover.path, true)}
            alt={roll.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {/* Photo count badge */}
        {roll._count.photos > 0 && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
            {roll._count.photos}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="font-medium text-foreground truncate text-sm leading-tight">{roll.name}</h3>

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
            <span className="shrink-0">ISO {roll.iso}{roll.pushPull && roll.pushPull !== '0' ? ` ${roll.pushPull.startsWith('+') ? '' : ''}${roll.pushPull}` : ''}</span>
          )}
        </div>

        <div className="mt-2 text-xs text-muted-foreground/70">
          {roll.dateShotStart
            ? formatDate(roll.dateShotStart)
            : formatDate(roll.createdAt)}
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
