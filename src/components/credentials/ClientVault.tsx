'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Pencil, Loader2 } from 'lucide-react'
import type { ClientCredentialsRow } from '@/types/client-credentials'
import { saveClientCredentials, logCredentialAccess } from '@/lib/credentials-actions'
import { useToast } from '@/components/Toast'
import PasswordField from '@/components/credentials/PasswordField'
import ExpiryBadge from '@/components/credentials/ExpiryBadge'

const SECTION_KEYS = ['contact', 'domain', 'hosting', 'email', 'website', 'integrations'] as const

const LABEL_CLASS = 'text-[11px] font-bold uppercase tracking-wider text-slate-700'
const VALUE_CLASS = 'text-sm font-bold text-slate-900'
const INPUT_CLASS =
  'w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200'

function allSectionsOpen(): Record<string, boolean> {
  return Object.fromEntries(SECTION_KEYS.map((k) => [k, true]))
}

function emptyCredentials(projectId: string, clientName: string, websiteUrl: string): ClientCredentialsRow {
  return {
    id: '',
    created_at: '',
    updated_at: '',
    project_id: projectId,
    added_by: '',
    updated_by: null,
    client_name: clientName,
    website_url: websiteUrl,
    domain_auto_renew: false,
    client_email: null,
    client_phone: null,
    client_whatsapp: null,
    client_alternate_phone: null,
    client_business_name: null,
    client_gst_number: null,
    client_address: null,
    client_city: null,
    client_poc_name: null,
    domain_name: null,
    domain_registrar: null,
    domain_registrar_email: null,
    domain_registrar_password: null,
    domain_expiry_date: null,
    dns_provider: null,
    dns_login_email: null,
    dns_login_password: null,
    hosting_provider: null,
    hosting_plan: null,
    hosting_login_email: null,
    hosting_login_password: null,
    hosting_expiry_date: null,
    hosting_renewal_cost: null,
    server_ip: null,
    cpanel_url: null,
    cpanel_username: null,
    cpanel_password: null,
    ftp_host: null,
    ftp_username: null,
    ftp_password: null,
    ssh_key: null,
    business_email: null,
    business_email_password: null,
    email_provider: null,
    google_workspace_admin: null,
    google_workspace_password: null,
    staging_url: null,
    cms_type: null,
    cms_admin_url: null,
    cms_username: null,
    cms_password: null,
    github_repo_url: null,
    github_username: null,
    vercel_project_url: null,
    env_variables: null,
    analytics_account: null,
    search_console_email: null,
    razorpay_account: null,
    whatsapp_business_number: null,
    google_maps_api_key: null,
    other_integrations: null,
    internal_notes: null,
    project_status_notes: null,
    last_accessed_by: null,
    last_accessed_at: null,
  }
}

function Field({
  label,
  value,
  editMode,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | null | undefined
  editMode?: boolean
  onChange?: (v: string) => void
  type?: string
}) {
  if (editMode) {
    return (
      <div className="space-y-1">
        <p className={LABEL_CLASS}>{label}</p>
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
    )
  }
  const empty = !value || !String(value).trim()
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
      <p className={LABEL_CLASS}>{label}</p>
      <p className={`mt-1.5 break-words ${empty ? 'text-sm font-semibold italic text-slate-400' : VALUE_CLASS}`}>
        {empty ? 'Not set' : value}
      </p>
    </div>
  )
}

function LinkField({
  label,
  href,
  editMode,
  value,
  onChange,
}: {
  label: string
  href?: string | null
  editMode?: boolean
  value?: string | null
  onChange?: (v: string) => void
}) {
  if (editMode) {
    return <Field label={label} value={value} editMode onChange={onChange} />
  }
  const url = href || value
  return (
    <div className="space-y-1">
      <p className={LABEL_CLASS}>{label}</p>
      {url ? (
        <a
          href={url.startsWith('http') ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-block break-all text-sm font-bold text-sky-800 hover:underline"
        >
          {value || url}
        </a>
      ) : (
        <p className="mt-1.5 text-sm font-semibold italic text-slate-400">Not set</p>
      )}
    </div>
  )
}

function VaultSection({
  title,
  sectionKey,
  open,
  onToggle,
  editAll,
  onEditSection,
  children,
}: {
  title: string
  sectionKey: string
  open: boolean
  onToggle: () => void
  editAll: boolean
  onEditSection: () => void
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm">
      <div
        className={`group flex cursor-pointer items-center justify-between gap-4 px-4 py-4 transition-colors md:px-5 ${
          open ? 'border-b-2 border-slate-100 bg-[#f7f7dc]/30' : 'hover:bg-slate-50'
        }`}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
          <h4 className="truncate text-base font-black tracking-tight text-slate-900">{title}</h4>
        </div>
        {!editAll ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEditSection()
            }}
            className="flex items-center gap-1 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 opacity-0 transition-all hover:border-slate-900 hover:text-slate-900 group-hover:opacity-100"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        ) : null}
      </div>
      {open ? <div className="px-4 pb-5 pt-4 md:px-5">{children}</div> : null}
    </div>
  )
}

export default function ClientVault({
  projectId,
  defaultClientName,
  defaultWebsiteUrl,
  hasRecord,
  expandAllOnLoad = false,
  hideProjectHeader = false,
  startInEditMode = false,
  projectDisplayName,
  projectCode,
}: {
  projectId: string
  defaultClientName: string
  defaultWebsiteUrl: string
  hasRecord: boolean
  /** Open every section and load credential data on mount (admin detail page). */
  expandAllOnLoad?: boolean
  /** Hide duplicate title bar when the parent page already shows project header. */
  hideProjectHeader?: boolean
  /** Open all fields as inputs immediately (first-time setup). */
  startInEditMode?: boolean
  projectDisplayName?: string
  projectCode?: string
}) {
  const { pushToast } = useToast()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    expandAllOnLoad ? allSectionsOpen() : {},
  )
  const [editAll, setEditAll] = useState(startInEditMode)
  const [sectionEdit, setSectionEdit] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState<ClientCredentialsRow>(() =>
    emptyCredentials(projectId, defaultClientName, defaultWebsiteUrl || 'https://'),
  )

  const isEditing = editAll || Object.values(sectionEdit).some(Boolean)

  const fetchFull = useCallback(async () => {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch(`/api/credentials/${projectId}?full=1`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load credentials')
      if (json.credentials) {
        setForm(json.credentials as ClientCredentialsRow)
      } else if (!hasRecord) {
        setForm(emptyCredentials(projectId, defaultClientName, defaultWebsiteUrl || 'https://'))
      }
      setLoaded(true)
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : 'Could not load vault', 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, loaded, hasRecord, defaultClientName, defaultWebsiteUrl, pushToast])

  const toggleSection = (key: string) => {
    const next = !openSections[key]
    setOpenSections((s) => ({ ...s, [key]: next }))
    if (next) void fetchFull()
  }

  useEffect(() => {
    if (editAll || expandAllOnLoad) void fetchFull()
  }, [editAll, expandAllOnLoad, fetchFull])

  const set = (key: keyof ClientCredentialsRow, value: string | boolean | number | null) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveClientCredentials(projectId, form)
    setSaving(false)
    if (!result.ok) {
      pushToast(result.error || 'Save failed', 'error')
      return
    }
    pushToast('Client vault saved', 'success')
    setEditAll(false)
    setSectionEdit({})
    setLoaded(true)
  }

  const saveNotesBlur = async (field: 'internal_notes' | 'project_status_notes', value: string) => {
    if (editAll || sectionEdit.integrations) return
    const result = await saveClientCredentials(projectId, { [field]: value })
    if (result.ok) pushToast('Notes saved', 'success')
  }

  const editMode = (section: string) => editAll || Boolean(sectionEdit[section])

  const envCopyAll = async () => {
    if (!form.env_variables) return
    try {
      await navigator.clipboard.writeText(form.env_variables)
      await logCredentialAccess({ projectId, actionType: 'copied', fieldName: 'env_variables' })
      pushToast('Env block copied', 'success')
    } catch {
      pushToast('Copy failed', 'error')
    }
  }

  const allExpanded = SECTION_KEYS.every((k) => openSections[k])

  return (
    <div className="space-y-3">
      {!hideProjectHeader && projectDisplayName ? (
        <div className="rounded-xl border-2 border-slate-200 bg-[#f7f7dc]/50 px-4 py-3.5">
          <p className="font-mono text-xs font-black text-slate-600">{projectCode || 'Project'}</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-900">{projectDisplayName}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-slate-800">
          {isEditing
            ? 'Editing — fill fields and save when done.'
            : expandAllOnLoad || allExpanded
              ? 'Passwords stay hidden until you reveal or copy.'
              : 'Expand a section to view or edit.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setOpenSections(allSectionsOpen())
              void fetchFull()
            }}
            className="rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-100"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setOpenSections({})}
            className="rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-100"
          >
            Collapse all
          </button>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                setEditAll(true)
                setOpenSections(allSectionsOpen())
                void fetchFull()
              }}
              className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800"
            >
              Edit all
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditAll(false)
                setSectionEdit({})
              }}
              className="rounded-lg border-2 border-slate-300 bg-white px-5 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-bold text-slate-700">Loading credentials…</span>
        </div>
      ) : null}

      <VaultSection
        title="Client Contact"
        sectionKey="contact"
        open={Boolean(openSections.contact)}
        onToggle={() => toggleSection('contact')}
        editAll={editAll}
        onEditSection={() => {
          setSectionEdit((s) => ({ ...s, contact: true }))
          void fetchFull()
          setOpenSections((o) => ({ ...o, contact: true }))
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Field label="Client name" value={form.client_name} editMode={editMode('contact')} onChange={(v) => set('client_name', v)} />
          <Field label="Email" value={form.client_email} editMode={editMode('contact')} onChange={(v) => set('client_email', v)} />
          <Field label="Phone" value={form.client_phone} editMode={editMode('contact')} onChange={(v) => set('client_phone', v)} />
          <Field label="WhatsApp" value={form.client_whatsapp} editMode={editMode('contact')} onChange={(v) => set('client_whatsapp', v)} />
          <Field label="Alternate phone" value={form.client_alternate_phone} editMode={editMode('contact')} onChange={(v) => set('client_alternate_phone', v)} />
          <Field label="Business name" value={form.client_business_name} editMode={editMode('contact')} onChange={(v) => set('client_business_name', v)} />
          <Field label="GST number" value={form.client_gst_number} editMode={editMode('contact')} onChange={(v) => set('client_gst_number', v)} />
          <Field label="City" value={form.client_city} editMode={editMode('contact')} onChange={(v) => set('client_city', v)} />
          <Field label="Address" value={form.client_address} editMode={editMode('contact')} onChange={(v) => set('client_address', v)} />
          <Field label="Point of contact" value={form.client_poc_name} editMode={editMode('contact')} onChange={(v) => set('client_poc_name', v)} />
        </div>
      </VaultSection>

      <VaultSection
        title="Domain Details"
        sectionKey="domain"
        open={Boolean(openSections.domain)}
        onToggle={() => toggleSection('domain')}
        editAll={editAll}
        onEditSection={() => {
          setSectionEdit((s) => ({ ...s, domain: true }))
          void fetchFull()
          setOpenSections((o) => ({ ...o, domain: true }))
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <LinkField label="Domain" value={form.domain_name} href={form.domain_name ? `https://${form.domain_name}` : null} editMode={editMode('domain')} onChange={(v) => set('domain_name', v)} />
          <Field label="Registrar" value={form.domain_registrar} editMode={editMode('domain')} onChange={(v) => set('domain_registrar', v)} />
          <Field label="Registrar email" value={form.domain_registrar_email} editMode={editMode('domain')} onChange={(v) => set('domain_registrar_email', v)} />
          <PasswordField projectId={projectId} fieldName="domain_registrar_password" label="Registrar password" value={form.domain_registrar_password} editMode={editMode('domain')} onChange={(v) => set('domain_registrar_password', v)} />
          <div className="space-y-1">
            <p className={LABEL_CLASS}>Domain expiry</p>
            {editMode('domain') ? (
              <input type="date" value={form.domain_expiry_date || ''} onChange={(e) => set('domain_expiry_date', e.target.value || null)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{form.domain_expiry_date || '—'}</span>
                <ExpiryBadge date={form.domain_expiry_date} />
              </div>
            )}
          </div>
          <Field label="DNS provider" value={form.dns_provider} editMode={editMode('domain')} onChange={(v) => set('dns_provider', v)} />
          <Field label="DNS login email" value={form.dns_login_email} editMode={editMode('domain')} onChange={(v) => set('dns_login_email', v)} />
          <PasswordField projectId={projectId} fieldName="dns_login_password" label="DNS password" value={form.dns_login_password} editMode={editMode('domain')} onChange={(v) => set('dns_login_password', v)} />
        </div>
      </VaultSection>

      <VaultSection
        title="Hosting Details"
        sectionKey="hosting"
        open={Boolean(openSections.hosting)}
        onToggle={() => toggleSection('hosting')}
        editAll={editAll}
        onEditSection={() => {
          setSectionEdit((s) => ({ ...s, hosting: true }))
          void fetchFull()
          setOpenSections((o) => ({ ...o, hosting: true }))
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Field label="Provider" value={form.hosting_provider} editMode={editMode('hosting')} onChange={(v) => set('hosting_provider', v)} />
          <Field label="Plan" value={form.hosting_plan} editMode={editMode('hosting')} onChange={(v) => set('hosting_plan', v)} />
          <Field label="Login email" value={form.hosting_login_email} editMode={editMode('hosting')} onChange={(v) => set('hosting_login_email', v)} />
          <PasswordField projectId={projectId} fieldName="hosting_login_password" label="Login password" value={form.hosting_login_password} editMode={editMode('hosting')} onChange={(v) => set('hosting_login_password', v)} />
          <div className="space-y-1">
            <p className={LABEL_CLASS}>Hosting expiry</p>
            {editMode('hosting') ? (
              <input type="date" value={form.hosting_expiry_date || ''} onChange={(e) => set('hosting_expiry_date', e.target.value || null)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{form.hosting_expiry_date || '—'}</span>
                <ExpiryBadge date={form.hosting_expiry_date} />
              </div>
            )}
          </div>
          <Field label="Renewal cost (₹)" value={form.hosting_renewal_cost != null ? String(form.hosting_renewal_cost) : ''} editMode={editMode('hosting')} onChange={(v) => set('hosting_renewal_cost', v ? Number(v) : null)} />
          <Field label="Server IP" value={form.server_ip} editMode={editMode('hosting')} onChange={(v) => set('server_ip', v)} />
          <LinkField label="cPanel URL" value={form.cpanel_url} href={form.cpanel_url} editMode={editMode('hosting')} onChange={(v) => set('cpanel_url', v)} />
          <Field label="cPanel username" value={form.cpanel_username} editMode={editMode('hosting')} onChange={(v) => set('cpanel_username', v)} />
          <PasswordField projectId={projectId} fieldName="cpanel_password" label="cPanel password" value={form.cpanel_password} editMode={editMode('hosting')} onChange={(v) => set('cpanel_password', v)} />
          <Field label="FTP host" value={form.ftp_host} editMode={editMode('hosting')} onChange={(v) => set('ftp_host', v)} />
          <Field label="FTP username" value={form.ftp_username} editMode={editMode('hosting')} onChange={(v) => set('ftp_username', v)} />
          <PasswordField projectId={projectId} fieldName="ftp_password" label="FTP password" value={form.ftp_password} editMode={editMode('hosting')} onChange={(v) => set('ftp_password', v)} />
          <div className="sm:col-span-2">
            <PasswordField projectId={projectId} fieldName="ssh_key" label="SSH key" value={form.ssh_key} editMode={editMode('hosting')} onChange={(v) => set('ssh_key', v)} monospace />
          </div>
        </div>
      </VaultSection>

      <VaultSection
        title="Email and Workspace"
        sectionKey="email"
        open={Boolean(openSections.email)}
        onToggle={() => toggleSection('email')}
        editAll={editAll}
        onEditSection={() => {
          setSectionEdit((s) => ({ ...s, email: true }))
          void fetchFull()
          setOpenSections((o) => ({ ...o, email: true }))
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Field label="Business email" value={form.business_email} editMode={editMode('email')} onChange={(v) => set('business_email', v)} />
          <PasswordField projectId={projectId} fieldName="business_email_password" label="Email password" value={form.business_email_password} editMode={editMode('email')} onChange={(v) => set('business_email_password', v)} />
          <Field label="Email provider" value={form.email_provider} editMode={editMode('email')} onChange={(v) => set('email_provider', v)} />
          <Field label="Google Workspace admin" value={form.google_workspace_admin} editMode={editMode('email')} onChange={(v) => set('google_workspace_admin', v)} />
          <PasswordField projectId={projectId} fieldName="google_workspace_password" label="Workspace password" value={form.google_workspace_password} editMode={editMode('email')} onChange={(v) => set('google_workspace_password', v)} />
        </div>
      </VaultSection>

      <VaultSection
        title="Website and CMS"
        sectionKey="website"
        open={Boolean(openSections.website)}
        onToggle={() => toggleSection('website')}
        editAll={editAll}
        onEditSection={() => {
          setSectionEdit((s) => ({ ...s, website: true }))
          void fetchFull()
          setOpenSections((o) => ({ ...o, website: true }))
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <LinkField label="Website URL" value={form.website_url} href={form.website_url} editMode={editMode('website')} onChange={(v) => set('website_url', v)} />
          <LinkField label="Staging URL" value={form.staging_url} href={form.staging_url} editMode={editMode('website')} onChange={(v) => set('staging_url', v)} />
          <Field label="CMS type" value={form.cms_type} editMode={editMode('website')} onChange={(v) => set('cms_type', v)} />
          <LinkField label="CMS admin URL" value={form.cms_admin_url} href={form.cms_admin_url} editMode={editMode('website')} onChange={(v) => set('cms_admin_url', v)} />
          <Field label="CMS username" value={form.cms_username} editMode={editMode('website')} onChange={(v) => set('cms_username', v)} />
          <PasswordField projectId={projectId} fieldName="cms_password" label="CMS password" value={form.cms_password} editMode={editMode('website')} onChange={(v) => set('cms_password', v)} />
          <LinkField label="GitHub repo" value={form.github_repo_url} href={form.github_repo_url} editMode={editMode('website')} onChange={(v) => set('github_repo_url', v)} />
          <Field label="GitHub username" value={form.github_username} editMode={editMode('website')} onChange={(v) => set('github_username', v)} />
          <LinkField label="Vercel project" value={form.vercel_project_url} href={form.vercel_project_url} editMode={editMode('website')} onChange={(v) => set('vercel_project_url', v)} />
          <div className="sm:col-span-2 space-y-2">
            <div className="flex justify-between items-center">
              <p className={LABEL_CLASS}>Env variables</p>
              {!editMode('website') && form.env_variables ? (
                <button type="button" onClick={envCopyAll} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900">
                  Copy all
                </button>
              ) : null}
            </div>
            {editMode('website') ? (
              <textarea
                value={form.env_variables || ''}
                onChange={(e) => set('env_variables', e.target.value)}
                rows={8}
                className="w-full font-mono text-xs rounded-lg border border-slate-200 p-3"
              />
            ) : (
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 text-emerald-300 p-4 text-[11px] font-mono whitespace-pre-wrap">
                {form.env_variables || '—'}
              </pre>
            )}
          </div>
        </div>
      </VaultSection>

      <VaultSection
        title="Integrations and Notes"
        sectionKey="integrations"
        open={Boolean(openSections.integrations)}
        onToggle={() => toggleSection('integrations')}
        editAll={editAll}
        onEditSection={() => {
          setSectionEdit((s) => ({ ...s, integrations: true }))
          void fetchFull()
          setOpenSections((o) => ({ ...o, integrations: true }))
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Field label="Analytics" value={form.analytics_account} editMode={editMode('integrations')} onChange={(v) => set('analytics_account', v)} />
          <Field label="Search Console email" value={form.search_console_email} editMode={editMode('integrations')} onChange={(v) => set('search_console_email', v)} />
          <Field label="Razorpay" value={form.razorpay_account} editMode={editMode('integrations')} onChange={(v) => set('razorpay_account', v)} />
          <Field label="WhatsApp Business" value={form.whatsapp_business_number} editMode={editMode('integrations')} onChange={(v) => set('whatsapp_business_number', v)} />
          <Field label="Google Maps API key" value={form.google_maps_api_key} editMode={editMode('integrations')} onChange={(v) => set('google_maps_api_key', v)} />
          <div className="sm:col-span-2">
            <Field label="Other integrations" value={form.other_integrations} editMode={editMode('integrations')} onChange={(v) => set('other_integrations', v)} />
          </div>
          <div className="sm:col-span-2">
            <p className={`${LABEL_CLASS} mb-1`}>Internal notes</p>
            <textarea
              defaultValue={form.internal_notes || ''}
              onBlur={(e) => {
                set('internal_notes', e.target.value)
                void saveNotesBlur('internal_notes', e.target.value)
              }}
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-3 text-xs"
              disabled={editMode('integrations')}
            />
          </div>
          <div className="sm:col-span-2">
            <p className={`${LABEL_CLASS} mb-1`}>Project status notes</p>
            <textarea
              defaultValue={form.project_status_notes || ''}
              onBlur={(e) => {
                set('project_status_notes', e.target.value)
                void saveNotesBlur('project_status_notes', e.target.value)
              }}
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-3 text-xs"
              disabled={editMode('integrations')}
            />
          </div>
        </div>
      </VaultSection>

      {isEditing ? (
        <div className="sticky bottom-4 z-20 flex justify-end pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-xl bg-slate-900 px-10 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-slate-400/40 hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save all changes'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
