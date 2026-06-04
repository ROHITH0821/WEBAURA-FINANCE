import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireActiveAdmin } from '@/lib/admin-gates'
import { createStaticClient } from '@/lib/supabaseServer'
const METADATA_SELECT =
  'id,project_id,client_name,website_url,domain_name,domain_expiry_date,hosting_provider,hosting_expiry_date,cms_type,updated_at'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> | { projectId: string } },
) {
  const gate = await requireActiveAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 401 })
  }

  const resolved = await Promise.resolve(ctx.params)
  const projectId = String(resolved?.projectId || '').trim()
  if (!projectId) {
    return NextResponse.json({ error: 'Missing project id' }, { status: 400 })
  }

  const url = new URL(req.url)
  const full = url.searchParams.get('full') === '1'

  const supabase = createStaticClient()

  if (!full) {
    const { data, error } = await supabase
      .from('client_credentials')
      .select(METADATA_SELECT)
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ credentials: data })
  }

  const { data, error } = await supabase
    .from('client_credentials')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ credentials: null })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'

  await supabase.from('credentials_access_log').insert({
    accessed_by: gate.email,
    project_id: projectId,
    action_type: 'viewed',
    field_name: '_full_fetch',
    ip_address: ip,
  })

  await supabase
    .from('client_credentials')
    .update({
      last_accessed_by: gate.email,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  return NextResponse.json({ credentials: data })
}
