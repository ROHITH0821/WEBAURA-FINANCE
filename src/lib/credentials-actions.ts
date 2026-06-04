'use server'

import { headers } from 'next/headers'
import { revalidatePath, revalidateTag } from 'next/cache'

const revalidate = (tag: string) => (revalidateTag as (tag: string) => void)(tag)
import { createStaticClient } from '@/lib/supabaseServer'
import { requireActiveAdmin } from '@/lib/admin-gates'
import type { ClientCredentialsRow, CredentialAccessAction } from '@/types/client-credentials'
import { SENSITIVE_CREDENTIAL_FIELDS } from '@/types/client-credentials'

const METADATA_COLUMNS =
  'id,project_id,client_name,website_url,domain_name,domain_expiry_date,hosting_provider,hosting_expiry_date,cms_type,updated_at'

async function clientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
}

export async function logCredentialAccess(params: {
  projectId: string
  actionType: CredentialAccessAction
  fieldName?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = createStaticClient()
  const ip = await clientIp()

  const { error } = await supabase.from('credentials_access_log').insert({
    accessed_by: gate.email,
    project_id: params.projectId,
    action_type: params.actionType,
    field_name: params.fieldName || null,
    ip_address: ip,
  })

  if (error) {
    console.error('logCredentialAccess:', error)
    return { ok: false, error: error.message }
  }

  if (params.actionType === 'viewed' || params.actionType === 'copied') {
    await supabase
      .from('client_credentials')
      .update({
        last_accessed_by: gate.email,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('project_id', params.projectId)
  }

  return { ok: true }
}

export async function getCredentialsMetadata(projectId: string) {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false as const, error: gate.error, data: null }

  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('client_credentials')
    .select(METADATA_COLUMNS)
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) return { ok: false as const, error: error.message, data: null }
  return { ok: true as const, data }
}

function stripSensitive(row: Record<string, unknown>) {
  const out = { ...row }
  for (const key of SENSITIVE_CREDENTIAL_FIELDS) {
    if (key in out) out[key] = null
  }
  return out
}

export async function saveClientCredentials(
  projectId: string,
  payload: Partial<ClientCredentialsRow>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = createStaticClient()
  const ip = await clientIp()

  const { data: existing } = await supabase
    .from('client_credentials')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  const clean: Record<string, unknown> = { ...payload }
  delete clean.id
  delete clean.created_at
  delete clean.updated_at
  delete clean.project_id
  delete clean.added_by

  clean.updated_by = gate.email

  let saved: ClientCredentialsRow | null = null
  let error: { message: string } | null = null

  if (existing) {
    const res = await supabase
      .from('client_credentials')
      .update(clean)
      .eq('project_id', projectId)
      .select()
      .single()
    saved = res.data as ClientCredentialsRow | null
    error = res.error
  } else {
    const websiteUrl = String(clean.website_url || '').trim()
    const clientName = String(clean.client_name || '').trim()
    if (!websiteUrl || !clientName) {
      return { ok: false, error: 'Client name and website URL are required.' }
    }
    const res = await supabase
      .from('client_credentials')
      .insert({
        ...clean,
        project_id: projectId,
        added_by: gate.email,
        client_name: clientName,
        website_url: websiteUrl,
      })
      .select()
      .single()
    saved = res.data as ClientCredentialsRow | null
    error = res.error
  }

  if (error || !saved) {
    return { ok: false, error: error?.message || 'Save failed' }
  }

  await supabase.from('credentials_access_log').insert({
    accessed_by: gate.email,
    project_id: projectId,
    action_type: 'edited',
    field_name: null,
    ip_address: ip,
  })

  await supabase.from('finance_audit_log').insert({
    action_by: gate.email,
    action_type: existing ? 'UPDATE' : 'CREATE',
    record_type: 'client_credentials',
    record_id: saved.id,
    old_value: existing ? stripSensitive(existing as Record<string, unknown>) : null,
    new_value: stripSensitive(saved as unknown as Record<string, unknown>),
    ip_address: ip,
    notes: 'Client vault credentials saved',
  })

  revalidate('credentials')
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')

  return { ok: true }
}

export async function getCredentialsAccessLog() {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false as const, error: gate.error, rows: [] }

  const rohithEmail = 'rapakarohith8@gmail.com'
  if (gate.email !== rohithEmail) {
    return { ok: false as const, error: 'Forbidden', rows: [] }
  }

  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('credentials_access_log')
    .select('id,accessed_at,accessed_by,project_id,action_type,field_name,ip_address')
    .order('accessed_at', { ascending: false })
    .limit(500)

  if (error) return { ok: false as const, error: error.message, rows: [] }
  return { ok: true as const, rows: data || [] }
}
