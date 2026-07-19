/** True when revenue_addons is missing / not exposed yet (migration not applied or schema cache stale). */
export function isRevenueAddonsUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const e = error as {
    code?: string
    message?: string
    details?: string
    hint?: string
  }

  const code = String(e.code || '')
  const message =
    String(e.message || '') ||
    (error instanceof Error ? String(error.message || '') : '')
  const text = `${message} ${e.details || ''} ${e.hint || ''}`.toLowerCase()

  // Empty `{}` PostgREST errors — treat as schema/cache miss only when there's no usable payload.
  if (!code && !message.trim()) return true

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    code === 'PGRST106'
  ) {
    return true
  }

  if (
    text.includes('does not exist') ||
    text.includes('could not find') ||
    text.includes('schema cache') ||
    text.includes('not find the table')
  ) {
    return true
  }

  return false
}

export function formatSupabaseError(error: unknown): string {
  if (!error) return 'unknown error'
  if (typeof error !== 'object') return String(error)
  const e = error as { code?: string; message?: string; details?: string; hint?: string }
  const message =
    String(e.message || '') || (error instanceof Error ? error.message : '')
  const parts = [e.code, message, e.details, e.hint].filter((p) => Boolean(p && String(p).trim()))
  return parts.length ? parts.join(' | ') : 'unknown supabase error'
}
