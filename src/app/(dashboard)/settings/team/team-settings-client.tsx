'use client'

import { useMemo, useState, useTransition } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { addTeamMemberAction, setTeamMemberActiveAction, setTeamMemberNameAction } from '@/lib/team-actions'

interface TeamMember {
  email: string
  full_name: string | null
  role: 'super_admin' | 'founder' | 'admin'
  is_active: boolean
}

export default function TeamSettingsClient(props: { myEmail: string; members: TeamMember[] }) {
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const rows = useMemo(() => {
    return [...props.members].sort((a, b) => {
      if (a.role === b.role) return String(a.email).localeCompare(String(b.email))
      return a.role === 'super_admin' ? -1 : 1
    })
  }, [props.members])

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="glass-card bg-white p-6 md:p-10">
        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 md:mb-3">Core Administration Team</p>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">Team</h2>
            <p className="mt-2 text-xs md:text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">
              Rohith stays <span className="font-black text-slate-900">SUPER ADMIN</span>. You can add founders and revoke access anytime.
            </p>
          </div>
        </div>

        <div className="mt-6 md:mt-8 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_200px_240px] gap-0 bg-slate-50/60 border-b border-slate-200">
            <div className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Identity Node</div>
            <div className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Access Role</div>
            <div className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Actions</div>
          </div>

          {rows.map((m) => {
            const isSelf = String(m.email || '').toLowerCase() === props.myEmail
            const isSuper = m.role === 'super_admin'
            const isEditing = editingEmail === String(m.email)

            return (
              <div key={m.email} className="grid grid-cols-1 md:grid-cols-[1.4fr_200px_240px] gap-0 border-b border-slate-100 last:border-b-0">
                <div className="px-6 md:px-8 py-5 md:py-7">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{m.full_name || m.email}</p>
                  <p className="mt-1 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-tight truncate">{m.email}</p>
                </div>

                <div className="px-6 md:px-8 py-2 md:py-7 flex items-center">
                  <span
                    className={`inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.25em] border ${
                      isSuper ? 'bg-[#f7f7dc] border-slate-900 text-slate-900' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {isSuper ? 'SUPER ADMIN' : 'ADMIN'}
                  </span>
                </div>

                <div className="px-6 md:px-8 py-5 md:py-7 flex items-center justify-start md:justify-end gap-6">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (isEditing) {
                        setEditingEmail(null)
                        setEditName('')
                        return
                      }
                      setEditingEmail(String(m.email))
                      setEditName(String(m.full_name || ''))
                    }}
                    className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    Modify
                  </button>

                  {!isSuper && !isSelf && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await setTeamMemberActiveAction(m.email, false)
                          if (r.ok === false) window.alert(r.error)
                        })
                      }
                      className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="md:col-span-3 px-6 md:px-8 pb-6 md:pb-8">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                        <div className="w-full">
                          <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Display Name</label>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                            placeholder="Founder name"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await setTeamMemberNameAction(m.email, editName.trim() || null)
                              if (r.ok === false) window.alert(r.error)
                              setEditingEmail(null)
                              setEditName('')
                            })
                          }
                          className="h-[46px] px-8 rounded-xl bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-30 w-full sm:w-auto"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 md:mt-8 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Add Founder Email</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@webauraindia.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
              />
            </div>
            <button
              type="button"
              disabled={pending || !email.trim()}
              onClick={() =>
                startTransition(async () => {
                  const res = await addTeamMemberAction(email.trim(), name.trim() || null)
                  if (res.ok === false) window.alert(res.error)
                  setEmail('')
                  setName('')
                })
              }
              className="h-[46px] px-8 rounded-xl bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-30 flex items-center justify-center gap-2 w-full md:w-auto"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

