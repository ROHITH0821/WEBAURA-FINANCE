'use client'

import { useMemo, useState, useTransition } from 'react'
import { Save, Trash2, Loader2, Plus } from 'lucide-react'
import BackButton from '@/components/BackButton'
import { useAppRouter } from '@/hooks/useAppRouter'
import { updateProjectAction, deleteProjectAction } from '@/lib/project-actions'
import { createAgencyAction } from '@/lib/agency-actions'
import { REVENUE_TYPES, REVENUE_TYPE_LABELS, type Agency } from '@/types/finance'

export default function ProjectEditClient(props: { project: any; founders: any[]; agencies: Agency[] }) {
  const { push, refresh } = useAppRouter()
  const [pending, startTransition] = useTransition()
  const [dangerOpen, setDangerOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [agencies, setAgencies] = useState<Agency[]>(props.agencies || [])
  const [showNewAgency, setShowNewAgency] = useState(false)
  const [newAgencyName, setNewAgencyName] = useState('')
  const [agencyBusy, setAgencyBusy] = useState(false)
  const [agencyError, setAgencyError] = useState('')

  const founderOptions = useMemo(() => {
    return (props.founders || [])
      .filter((f) => Boolean(f?.email))
      .map((f) => ({ email: String(f.email), name: String(f.full_name || f.email) }))
  }, [props.founders])

  const [form, setForm] = useState({
    project_name: props.project.project_name || '',
    client_name: props.project.client_name || '',
    client_email: props.project.client_email || '',
    client_phone: props.project.client_phone || '',
    project_type: props.project.project_type || 'basic',
    agreed_value: String(props.project.agreed_value ?? ''),
    payment_structure: props.project.payment_structure || 'custom',
    advance_amount: props.project.advance_amount == null ? '' : String(props.project.advance_amount),
    status: props.project.status || 'active',
    project_lead: props.project.project_lead || '',
    revenue_type: props.project.revenue_type || 'direct_client',
    agency_id: props.project.agency_id || '',
    notes: props.project.notes || '',
  })

  const handleAddAgency = async () => {
    const name = newAgencyName.trim()
    if (!name) return
    setAgencyBusy(true)
    setAgencyError('')
    try {
      const res = await createAgencyAction({ name })
      if (res.ok) {
        setAgencies((prev) => [...prev.filter((a) => a.id !== res.agency.id), res.agency].sort((a, b) => a.name.localeCompare(b.name)))
        setForm((prev) => ({ ...prev, agency_id: res.agency.id }))
        setNewAgencyName('')
        setShowNewAgency(false)
      } else {
        setAgencyError(res.error)
      }
    } finally {
      setAgencyBusy(false)
    }
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <BackButton fallbackHref={`/projects/${props.project.id}`} label="Back" />
      </div>

      <div className="glass-card bg-white p-10">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Project Management</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              {props.project.project_code} — Edit Project
            </h2>
          </div>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await updateProjectAction(props.project.id, form)
                if (r?.ok === false) {
                  window.alert(r.error)
                  return
                }
              })
            }
            className="px-8 py-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-30 flex items-center gap-2"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Field label="Project Name">
            <input
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            />
          </Field>
          <Field label="Client Name">
            <input
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            />
          </Field>
          <Field label="Project Lead">
            <select
              value={form.project_lead}
              onChange={(e) => setForm({ ...form, project_lead: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none"
            >
              {founderOptions.map((f) => (
                <option key={f.email} value={f.email}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Client Email">
            <input
              value={form.client_email}
              onChange={(e) => setForm({ ...form, client_email: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            />
          </Field>
          <Field label="Client Phone">
            <input
              value={form.client_phone}
              onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            />
          </Field>

          <Field label="Project Type">
            <select
              value={form.project_type}
              onChange={(e) => setForm({ ...form, project_type: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none"
            >
              <option value="basic">basic</option>
              <option value="business">business</option>
              <option value="ecommerce">ecommerce</option>
              <option value="saas">saas</option>
              <option value="custom">custom</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none"
            >
              <option value="active">active</option>
              <option value="completed">completed</option>
              <option value="on_hold">on_hold</option>
              <option value="cancelled">cancelled</option>
            </select>
          </Field>

          <Field label="Agreed Value (₹)">
            <input
              type="number"
              value={form.agreed_value}
              onChange={(e) => setForm({ ...form, agreed_value: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            />
          </Field>

          <Field label="Payment Structure">
            <select
              value={form.payment_structure}
              onChange={(e) => setForm({ ...form, payment_structure: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none"
            >
              <option value="full_upfront">full_upfront</option>
              <option value="fifty_fifty">fifty_fifty</option>
              <option value="milestone">milestone</option>
              <option value="custom">custom</option>
            </select>
          </Field>

          <Field label="Advance Amount (optional)">
            <input
              type="number"
              value={form.advance_amount}
              onChange={(e) => setForm({ ...form, advance_amount: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            />
          </Field>

          <Field label="Revenue Type">
            <select
              value={form.revenue_type}
              onChange={(e) => setForm({ ...form, revenue_type: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none"
            >
              {REVENUE_TYPES.map((rt) => (
                <option key={rt} value={rt}>{REVENUE_TYPE_LABELS[rt]}</option>
              ))}
            </select>
          </Field>

          {form.revenue_type === 'agency_digital_marketing' ? (
            <Field label="Agency">
              <select
                value={form.agency_id}
                onChange={(e) => setForm({ ...form, agency_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none"
              >
                <option value="">Select agency</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {showNewAgency ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newAgencyName}
                    onChange={(e) => setNewAgencyName(e.target.value)}
                    placeholder="New agency name"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    disabled={agencyBusy || !newAgencyName.trim()}
                    onClick={handleAddAgency}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40"
                  >
                    {agencyBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewAgency(false); setNewAgencyName('') }}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewAgency(true)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
                >
                  <Plus className="w-3 h-3" />
                  New agency
                </button>
              )}
              {agencyError ? <p className="mt-1 text-[10px] font-bold text-rose-600">{agencyError}</p> : null}
            </Field>
          ) : null}
        </div>

        <div className="mt-8">
          <Field label="Notes">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 resize-none"
            />
          </Field>
        </div>
      </div>

      <div className="glass-card bg-white p-10 border border-rose-100">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 mb-3">Danger Zone</p>
            <p className="text-sm font-bold text-slate-700">
              Deleting a project is permanent. Type the project code to confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDangerOpen((v) => !v)}
            className="px-6 py-3 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Project
            </span>
          </button>
        </div>

        {dangerOpen && (
          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/30 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-3">
              Confirm by typing: {props.project.project_code}
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="flex-1 min-w-[240px] rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-300"
                placeholder={props.project.project_code}
              />
              <button
                type="button"
                disabled={pending || confirm.trim() !== String(props.project.project_code || '').trim()}
                onClick={() =>
                  startTransition(async () => {
                    const r = await deleteProjectAction(props.project.id, confirm.trim())
                    if (r.ok === false) {
                      window.alert(r.error)
                      return
                    }
                    push('/projects')
                    refresh()
                  })
                }
                className="px-7 py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-30"
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  )
}

