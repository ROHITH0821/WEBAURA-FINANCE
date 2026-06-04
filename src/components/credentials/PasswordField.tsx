'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { logCredentialAccess } from '@/lib/credentials-actions'

const LABEL_CLASS = 'text-[11px] font-bold uppercase tracking-wider text-slate-700'
const INPUT_CLASS =
  'w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200'

export default function PasswordField({
  projectId,
  fieldName,
  value,
  editMode,
  onChange,
  label,
  monospace,
}: {
  projectId: string
  fieldName: string
  value: string | null | undefined
  editMode?: boolean
  onChange?: (v: string) => void
  label?: string
  monospace?: boolean
}) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  if (editMode) {
    return (
      <div className="space-y-1.5">
        {label ? <p className={LABEL_CLASS}>{label}</p> : null}
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${INPUT_CLASS} ${monospace ? 'font-mono' : ''}`}
          autoComplete="off"
        />
      </div>
    )
  }

  const display = revealed ? value || '—' : value ? '••••••••••••' : '—'
  const empty = !value || !String(value).trim()

  const onReveal = async () => {
    const next = !revealed
    setRevealed(next)
    if (next && value) {
      await logCredentialAccess({ projectId, actionType: 'viewed', fieldName })
    }
  }

  const onCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      await logCredentialAccess({ projectId, actionType: 'copied', fieldName })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
      {label ? <p className={LABEL_CLASS}>{label}</p> : null}
      <div className={`flex items-center gap-2 ${label ? 'mt-1.5' : ''}`}>
        <span
          className={`flex-1 break-all text-sm font-bold text-slate-900 ${monospace ? 'font-mono whitespace-pre-wrap' : ''} ${empty ? 'font-semibold italic text-slate-400' : ''}`}
        >
          {empty ? 'Not set' : display}
        </span>
        {value ? (
          <>
            <button
              type="button"
              onClick={onReveal}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:border-slate-400 hover:text-slate-900"
              aria-label={revealed ? 'Hide' : 'Reveal'}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:border-slate-400 hover:text-slate-900"
              aria-label="Copy"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
