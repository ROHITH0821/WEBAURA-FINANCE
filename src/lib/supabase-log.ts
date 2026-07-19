/** Format PostgREST / Supabase errors for logs (Error.message is often non-enumerable). */
export function formatSupabaseError(error: unknown): string {
  if (!error) return ''
  if (typeof error !== 'object') return String(error)
  const e = error as { code?: string; message?: string; details?: string; hint?: string }
  const message =
    String(e.message || '').trim() ||
    (error instanceof Error ? String(error.message || '').trim() : '')
  const parts = [e.code, message, e.details, e.hint]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
  return parts.join(' | ')
}

/** Log only when the error has a readable message — skips Next overlay `{}` spam. */
export function logSupabaseQueryError(label: string, error: unknown): void {
  const text = formatSupabaseError(error)
  if (!text) return
  console.error(label, text)
}
