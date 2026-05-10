import { createClient, createStaticClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import NewPaymentClient from './new-payment-client'

export const dynamic = 'force-dynamic'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export default async function NewPaymentPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolved = await Promise.resolve(params)
  const id = String(resolved?.id || '')

  // If someone navigates to `/projects/undefined/payment/new`, bounce safely.
  if (!id || id === 'undefined' || !isUuid(id)) {
    redirect('/projects')
  }

  const supabase = await createClient()
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myEmail = String(user?.email || '')

  const [{ data: project }, { data: founders }] = await Promise.all([
    admin.from('projects').select('client_name, project_code').eq('id', id).maybeSingle(),
    admin.from('admin_users').select('email, full_name, is_active').eq('is_active', true),
  ])

  const founderOptions =
    (founders || [])
      .filter((f: any) => Boolean(f?.email))
      .map((f: any) => ({ email: String(f.email), name: String(f.full_name || f.email) })) ?? []

  // Ensure current user is selectable even if missing in table (bootstrap edge case)
  if (myEmail && !founderOptions.some((f) => String(f.email).toLowerCase() === myEmail.toLowerCase())) {
    founderOptions.unshift({ email: myEmail, name: myEmail })
  }

  return (
    <NewPaymentClient
      projectId={id}
      project={project}
      founders={founderOptions}
      defaultReceivedBy={myEmail}
    />
  )
}
