'use client'

import { useState } from 'react'
import { Trash2, Send } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { RollComment, PhotoComment } from '@prisma/client'

type Comment = RollComment | PhotoComment

interface CommentsProps {
  rollId?: string
  photoId?: string
  initialComments: Comment[]
  dark?: boolean
}

export function Comments({ rollId, photoId, initialComments, dark }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const endpoint = rollId ? `/api/rolls/${rollId}/comments` : `/api/photos/${photoId}/comments`

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (res.ok) {
      const comment = await res.json()
      setComments(prev => [...prev, comment])
      setBody('')
    }
    setSubmitting(false)
  }

  const deleteComment = async (id: string) => {
    await fetch(`${endpoint}?commentId=${id}`, { method: 'DELETE' })
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const inputClass = dark
    ? 'w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-base sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 resize-none'
    : 'field resize-none'

  const textClass = dark ? 'text-white/85' : 'text-foreground'
  const mutedClass = dark ? 'text-white/50' : 'text-muted-foreground'
  const btnClass = dark
    ? 'inline-flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-md text-white/50 hover:text-red-400 transition-colors'
    : 'inline-flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors'
  const submitClass = dark
    ? 'btn btn-icon shrink-0 border border-white/15 text-white/80 hover:bg-white/10 disabled:opacity-30'
    : 'btn btn-icon btn-secondary shrink-0 disabled:opacity-40'

  return (
    <div className="space-y-4">
      {comments.length === 0 && (
        <p className={cn('text-sm', mutedClass)}>No comments yet</p>
      )}

      {comments.map(comment => (
        <div key={comment.id} className="group space-y-1">
          <div className="flex items-start gap-2">
            <p className={cn('text-[15px] flex-1 leading-relaxed whitespace-pre-wrap', textClass)}>{comment.body}</p>
            <button
              onClick={() => deleteComment(comment.id)}
              className={cn('-mt-2 -mr-2 shrink-0 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100', btnClass)}
              aria-label="Delete comment"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <p className={cn('text-[13px] tabular-nums', mutedClass)}>{formatDate(comment.createdAt)}</p>
        </div>
      ))}

      <form onSubmit={submit} className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Add a comment…"
          aria-label="Comment"
          rows={2}
          className={cn('flex-1', inputClass)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
          }}
        />
        <button type="submit" disabled={submitting || !body.trim()} aria-label="Post comment" className={submitClass}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
