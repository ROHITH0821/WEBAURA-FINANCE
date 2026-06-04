'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'warning'
type ToastItem = { id: number; message: string; kind: ToastKind }

type ToastCtx = {
  pushToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

function toastClass(kind: ToastKind): string {
  if (kind === 'success') return 'bg-emerald-600 text-white border-emerald-500'
  if (kind === 'error') return 'bg-rose-600 text-white border-rose-500'
  return 'bg-amber-500 text-black border-amber-400'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const pushToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(90vw,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold shadow-lg ${toastClass(t.kind)}`}
          >
            <span className="min-w-0 flex-1 pt-0.5">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-1 opacity-90 hover:bg-black/10"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
