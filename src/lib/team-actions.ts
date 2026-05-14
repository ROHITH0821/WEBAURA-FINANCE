'use server'

import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabaseServer'
import { createStaticClient } from '@/lib/supabaseServer'

type ActionResult = { ok: true } | { ok: false; error: string }

const revalidate = (tag: string) => (revalidateTag as any)(tag)

async function requireSuperAdmin(): Promise<{ myEmail: string } | { error: string }> {
  const supabase = await createClient()
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const myEmail = String(user?.email || '').toLowerCase()
  if (!myEmail) return { error: 'Unauthorized' }

  const { data: me } = await admin.from('admin_users').select('role,email').eq('email', myEmail).maybeSingle()
  if (!me || me.role !== 'super_admin') return { error: 'Forbidden' }
  return { myEmail }
}

export async function addTeamMemberAction(email: string, fullName: string | null): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if ('error' in gate) return { ok: false, error: gate.error }

  const admin = createStaticClient()
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) return { ok: false, error: 'Valid email is required.' }

  const { error } = await admin
    .from('admin_users')
    .upsert(
      {
        email: normalized,
        full_name: fullName && fullName.trim() ? fullName.trim() : null,
        role: 'founder',
        is_active: true,
      },
      { onConflict: 'email' },
    )

  if (error) return { ok: false, error: error.message }
  revalidate('founders')
  return { ok: true }
}

export async function setTeamMemberActiveAction(email: string, isActive: boolean): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if ('error' in gate) return { ok: false, error: gate.error }

  const normalized = String(email || '').trim().toLowerCase()
  if (normalized === gate.myEmail) return { ok: false, error: 'You cannot disable yourself.' }

  const admin = createStaticClient()
  const { data: row } = await admin.from('admin_users').select('role,email').eq('email', normalized).maybeSingle()
  if (row?.role === 'super_admin') return { ok: false, error: 'Super admin cannot be disabled.' }

  const { error } = await admin.from('admin_users').update({ is_active: Boolean(isActive) }).eq('email', normalized)
  if (error) return { ok: false, error: error.message }

  revalidate('founders')
  return { ok: true }
}

export async function updateTeamMemberAction(oldEmail: string, newEmail: string, fullName: string | null): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if ('error' in gate) return { ok: false, error: gate.error }

  const normalizedOld = String(oldEmail || '').trim().toLowerCase()
  const normalizedNew = String(newEmail || '').trim().toLowerCase()

  if (!normalizedNew || !normalizedNew.includes('@')) return { ok: false, error: 'Valid new email is required.' }
  if (normalizedOld === gate.myEmail && normalizedOld !== normalizedNew) {
    return { ok: false, error: 'You cannot change your own email from this panel.' }
  }

  const admin = createStaticClient()

  // If email changed, we need to update the primary key
  const { error } = await admin
    .from('admin_users')
    .update({ 
      email: normalizedNew,
      full_name: fullName && fullName.trim() ? fullName.trim() : null 
    })
    .eq('email', normalizedOld)

  if (error) return { ok: false, error: error.message }
  revalidate('founders')
  return { ok: true }
}

export async function deleteTeamMemberAction(email: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if ('error' in gate) return { ok: false, error: gate.error }

  const normalized = String(email || '').trim().toLowerCase()
  if (normalized === gate.myEmail) return { ok: false, error: 'You cannot remove yourself.' }

  const admin = createStaticClient()
  const { data: row } = await admin.from('admin_users').select('role,email').eq('email', normalized).maybeSingle()
  if (row?.role === 'super_admin') return { ok: false, error: 'Super admin cannot be removed.' }

  const { error } = await admin.from('admin_users').delete().eq('email', normalized)
  if (error) return { ok: false, error: error.message }

  revalidate('founders')
  return { ok: true }
}

