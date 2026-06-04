import { NextResponse } from 'next/server'
import { logCredentialAccess } from '@/lib/credentials-actions'
import type { CredentialAccessAction } from '@/types/client-credentials'

export async function POST(req: Request) {
  let body: { projectId?: string; actionType?: CredentialAccessAction; fieldName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const projectId = String(body.projectId || '').trim()
  const actionType = body.actionType
  if (!projectId || !actionType || !['viewed', 'copied', 'edited'].includes(actionType)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const result = await logCredentialAccess({
    projectId,
    actionType,
    fieldName: body.fieldName,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}
