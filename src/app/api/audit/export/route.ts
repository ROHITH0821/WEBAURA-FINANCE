import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-gates'
import { createStaticClient } from '@/lib/supabaseServer'

function toCsvRow(values: (string | number | null | undefined)[]) {
  return (
    values
      .map((v) => {
        const s = v == null ? '' : String(v)
        const escaped = s.replace(/"/g, '""')
        return `"${escaped}"`
      })
      .join(',') + '\n'
  )
}

export async function GET() {
  const gate = await requireSuperAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createStaticClient()
  const { data, error } = await admin
    .from('finance_audit_log')
    .select('created_at,action_by,action_type,record_type,record_id,notes')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let csv = ''
  csv += toCsvRow(['created_at', 'action_by', 'action_type', 'record_type', 'record_id', 'notes'])
  for (const row of data || []) {
    csv += toCsvRow([
      row.created_at,
      row.action_by,
      row.action_type,
      row.record_type,
      row.record_id,
      row.notes,
    ])
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="finance_audit_log.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

