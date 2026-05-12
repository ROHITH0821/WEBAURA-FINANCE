'use server'

import { revalidateTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import { requireSuperAdmin } from '@/lib/admin-gates'

type ActionResult = { ok: true } | { ok: false; error: string }
const revalidate = (tag: string) => (revalidateTag as any)(tag)

export async function updateProjectAction(projectId: string, patch: any): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = createStaticClient()
  const allowed: Record<string, any> = {
    project_name: patch.project_name ?? null,
    client_name: patch.client_name,
    client_email: patch.client_email ?? null,
    client_phone: patch.client_phone ?? null,
    project_type: patch.project_type,
    agreed_value: patch.agreed_value != null ? Number(patch.agreed_value) : undefined,
    payment_structure: patch.payment_structure,
    advance_amount: patch.advance_amount === '' || patch.advance_amount == null ? null : Number(patch.advance_amount),
    status: patch.status,
    project_lead: patch.project_lead,
    notes: patch.notes ?? null,
  }

  // strip undefined
  for (const k of Object.keys(allowed)) if (allowed[k] === undefined) delete allowed[k]

  try {
    const { error } = await supabase.from('projects').update(allowed).eq('id', projectId)
    if (error) {
      console.error('Update project error:', error)
      return { ok: false, error: error.message }
    }

    try {
      revalidate('projects')
      revalidate('finance-summary')
      revalidate('audit')
    } catch (revalidateErr) {
      console.warn('Revalidation warning:', revalidateErr)
    }

    return { ok: true }
  } catch (err: any) {
    console.error('CRITICAL ERROR in updateProjectAction:', err)
    return { ok: false, error: err?.message || 'System error during update' }
  }
}

export async function deleteProjectAction(projectId: string, confirmCode: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = createStaticClient()
  const { data: proj, error: readErr } = await supabase.from('projects').select('project_code').eq('id', projectId).single()
  if (readErr || !proj) return { ok: false, error: readErr?.message || 'Project not found' }

  if (String(confirmCode || '').trim() !== String(proj.project_code || '').trim()) {
    return { ok: false, error: 'Project code confirmation does not match.' }
  }

  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) return { ok: false, error: error.message }

  revalidate('projects')
  revalidate('finance-summary')
  revalidate('audit')
  return { ok: true }
}

