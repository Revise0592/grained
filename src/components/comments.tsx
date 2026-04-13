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
    ? 'w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 resize-none'
    : 'w-full bg-background border border-input rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none'

  const textClass = dark ? 'text-white/70' : 'text-foreground'
  const mutedClass = dark ? 'text-white/30' : 'text-muted-foreground'
  const btnClass = dark
    ? 'p-1.5 text-white/30 hover:text-accent transition-colors'
    : 'p-1.5 text-muted-foreground hover:text-destructive transition-colors'
  const submitClass = dark
    ? 'p-1.5 text-white/40 hover:text-accent disabled:opacity-30 transition-colors'
    : 'p-1.5 text-muted-foreground hover:text-accent disabled:opacity-30 transition-colors'

  return (
    <div className="space-y-4">
      {comments.length === 0 && (
        <p className={cn('text-xs', mutedClass)}>No comments yet.</p>
      )}

      {comments.map(comment => (
        <div key={comment.id} className="group space-y-1">
          <div className="flex items-start gap-2">
            <p className={cn('text-xs flex-1 leading-relaxed', textClass)}>{comment.body}</p>
            <button
              onClick={() => deleteComment(comment.id)}
              className={cn('opacity-0 group-hover:opacity-100 shrink-0', btnClass)}
              aria-label="Delete comment"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <p className={cn('text-[10px]', mutedClass)}>{formatDate(comment.createdAt)}</p>
        </div>
      ))}

      <form onSubmit={submit} className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className={cn('flex-1', inputClass)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
          }}
        />
        <button type="submit" disabled={submitting || !body.trim()} className={submitClass}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
