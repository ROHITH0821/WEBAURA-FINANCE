import { NextResponse } from 'next/server'
import { createClient, createStaticClient } from '@/lib/supabaseServer'

const NO_STORE = { 'Cache-Control': 'no-store, private, must-revalidate' } as const

function projectLabel(p: {
  project_code?: string | null
  client_name?: string | null
  project_name?: string | null
  name?: string | null
}) {
  const title = String(p.project_name || p.name || '').trim()
  const parts = [p.project_code, p.client_name, title].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Project'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const email = String(user?.email || '')
      .trim()
      .toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })
    }

    const admin = createStaticClient()
    const { data: me, error: meErr } = await admin
      .from('admin_users')
      .select('role, is_active')
      .eq('email', email)
      .maybeSingle()

    if (meErr) {
      console.error('expense-form/context admin_users:', meErr)
      return NextResponse.json({ error: meErr.message }, { status: 500, headers: NO_STORE })
    }
    if (!me?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE })
    }

    const role =
      me.role === 'super_admin' ? 'super_admin' : me.role === 'admin' ? 'admin' : 'founder'

    const primary = await admin
      .from('projects')
      .select('id, project_code, client_name, project_name, name')
      .order('created_at', { ascending: false })

    let rows: any[] = primary.data || []
    if (primary.error) {
      const retry = await admin
        .from('projects')
        .select('id, project_code, client_name')
        .order('created_at', { ascending: false })
      if (retry.error) {
        console.error('expense-form/context projects:', retry.error)
        return NextResponse.json(
          { role, projects: [], projectsError: retry.error.message },
          { headers: NO_STORE },
        )
      }
      rows = retry.data || []
    }

    const projects = rows.map((p) => ({
      id: String(p.id),
      label: projectLabel(p),
    }))

    return NextResponse.json({ role, projects }, { headers: NO_STORE })
  } catch (e: any) {
    console.error('expense-form/context:', e)
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500, headers: NO_STORE },
    )
  }
}
