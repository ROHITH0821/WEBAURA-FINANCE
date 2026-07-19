import { createClient } from '@/lib/supabaseServer'
import { createStaticClient } from '@/lib/supabaseServer'
import ProjectEditClient from './project-edit-client'

export const dynamic = 'force-dynamic'

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolved = await Promise.resolve(params)
  const id = String(resolved?.id || '')

  const supabase = await createClient()
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = String(user?.email || '').toLowerCase()
  const { data: me } = await admin.from('admin_users').select('role,is_active').eq('email', email).maybeSingle()

  if (!me || me.is_active === false || me.role !== 'super_admin') {
    return (
      <div className="glass-card bg-white p-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Access denied</p>
        <p className="mt-3 text-sm font-bold text-slate-700">Only super admin can edit projects.</p>
      </div>
    )
  }

  const { data: project } = await admin.from('projects').select('*').eq('id', id).single()
  const { data: founders } = await admin.from('admin_users').select('email, full_name, is_active').eq('is_active', true)
  const { data: agencies } = await admin
    .from('agencies')
    .select('id,name,is_active,notes,created_at')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (!project) {
    return (
      <div className="glass-card bg-white p-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Not found</p>
      </div>
    )
  }

  return <ProjectEditClient project={project} founders={founders || []} agencies={agencies || []} />
}

