import { NextResponse } from 'next/server'
import { fetchAdminUserByEmail, syncFinanceAdminUserRole } from '@/lib/admin-user-lookup'
import { activeFinanceRole } from '@/lib/finance-role'
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

    await syncFinanceAdminUserRole(email)
    const me = await fetchAdminUserByEmail(email)
    if (!me || me.is_active === false) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE })
    }

    const role = activeFinanceRole(me)
    if (!role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE })
    }

    const admin = createStaticClient()
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
