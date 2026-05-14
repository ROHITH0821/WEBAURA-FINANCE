import { createStaticClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function AuditDbPage() {
  const admin = createStaticClient()
  
  const { data: tables, error } = await (admin as any).rpc('get_all_tables_info')

  // If RPC doesn't exist, try querying information_schema directly
  const { data: schemaTables } = await admin.from('information_schema.tables' as any)
    .select('table_schema, table_name')
    .in('table_schema', ['public', 'finance', 'referrals'])

  return (
    <div className="p-10 font-mono text-[10px] space-y-10">
      <h1 className="text-2xl font-black uppercase">Database Schema Audit</h1>
      
      <section>
        <h2 className="text-xl font-bold mb-4 text-emerald-600">SCHEMAS & TABLES</h2>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 border">Schema</th>
                <th className="p-3 border">Table Name</th>
                <th className="p-3 border">Row Count (Approx)</th>
              </tr>
            </thead>
            <tbody>
              {schemaTables?.map((t: any) => (
                <tr key={`${t.table_schema}.${t.table_name}`}>
                  <td className="p-3 border font-bold">{t.table_schema}</td>
                  <td className="p-3 border">{t.table_name}</td>
                  <td className="p-3 border text-slate-400">---</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 text-rose-600">QUICK QUERY: expense_requests</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="font-black uppercase text-[8px]">Querying [finance.expense_requests]</p>
            {await (async () => {
              const { count, error } = await (admin as any).schema('finance').from('expense_requests').select('*', { count: 'exact', head: true })
              return <p className="p-4 bg-slate-100 rounded-lg">Count: {count !== null ? count : 'ERROR'} {error?.message}</p>
            })()}
          </div>
          <div className="space-y-2">
            <p className="font-black uppercase text-[8px]">Querying [public.expense_requests]</p>
            {await (async () => {
              const { count, error } = await (admin as any).schema('public').from('expense_requests').select('*', { count: 'exact', head: true })
              return <p className="p-4 bg-slate-100 rounded-lg">Count: {count !== null ? count : 'ERROR'} {error?.message}</p>
            })()}
          </div>
        </div>
      </section>
    </div>
  )
}
