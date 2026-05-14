import { createStaticClient } from '@/lib/supabaseServer'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DebugDbPage() {
  const admin = createStaticClient()
  
  const [
    { data: users },
    { data: expenses }
  ] = await Promise.all([
    admin.from('admin_users').select('*'),
    admin.from('expense_requests').select('*').order('request_date', { ascending: false }).order('id', { ascending: false })
  ])

  return (
    <div className="p-10 space-y-10 font-mono text-[10px]">
      <section>
        <h2 className="text-xl font-bold mb-4">ADMIN USERS</h2>
        <div className="overflow-auto border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Role</th>
                <th className="p-2 border">Active</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.email}>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.role}</td>
                  <td className="p-2 border">{String(u.is_active)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">EXPENSE REQUESTS</h2>
        <div className="overflow-auto border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Requested By</th>
                <th className="p-2 border">Amount</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Request date</th>
              </tr>
            </thead>
            <tbody>
              {expenses?.map((e: any) => (
                <tr key={e.id}>
                  <td className="p-2 border">{e.id.slice(0, 8)}</td>
                  <td className="p-2 border">[{e.requested_by}]</td>
                  <td className="p-2 border">{formatCurrency(e.amount)}</td>
                  <td className="p-2 border">{e.status}</td>
                  <td className="p-2 border">{e.created_at ?? e.request_date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
