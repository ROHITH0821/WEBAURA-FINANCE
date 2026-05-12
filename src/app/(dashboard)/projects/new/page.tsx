'use client'

import { useState, useEffect } from 'react'
import * as navigation from 'next/navigation'
import { ArrowLeft, Save, IndianRupee, User, Briefcase, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { refreshFinanceData, createProject } from '@/lib/actions'

export default function NewProjectPage() {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [founders, setFounders] = useState<{email: string, name: string}[]>([])
  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    project_type: 'basic',
    agreed_value: '',
    project_lead: '',
    payment_structure: 'custom',
    notes: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      // 1. Get current user from Supabase session
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = String(user?.email || '').trim().toLowerCase()
      // Default lead = currently logged-in founder (WebAura team member)
      if (userEmail) {
        setFormData((prev) => (prev.project_lead ? prev : { ...prev, project_lead: userEmail }))
      }

      // 2. Fetch founders
      const { data } = await supabase.from('admin_users').select('email, full_name, is_active').eq('is_active', true)
      
      if (data) {
        const foundersList = data
          .filter((f) => Boolean(f?.email))
          .map((f) => ({ email: String(f.email), name: String(f.full_name || f.email) }))
        setFounders(foundersList)

        // 3. If still empty, default to current user or first founder
        const me = foundersList.find((f) => f.email.toLowerCase() === userEmail)
        setFormData((prev) => {
          if (prev.project_lead) return prev
          if (me) return { ...prev, project_lead: me.email }
          if (foundersList.length > 0) return { ...prev, project_lead: foundersList[0].email }
          return prev
        })
      }
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await createProject(formData)

      if (res?.error) throw new Error(res.error)
    } catch (err: any) {
      setError(err.message || 'Failed to initialize project')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router?.back()}
          className="p-2 rounded-full hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Create New Project</h2>
          <p className="text-slate-500 font-medium">Initialize a new financial tracking entry</p>
        </div>
      </div>

      <div className="max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Project Name</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="e.g. Website Revamp"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Client Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Project Type</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  required
                  value={formData.project_type}
                  onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 appearance-none transition-all font-bold text-sm"
                >
                  <option value="basic">basic</option>
                  <option value="business">business</option>
                  <option value="ecommerce">ecommerce</option>
                  <option value="saas">saas</option>
                  <option value="custom">custom</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Payment Structure</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={formData.payment_structure}
                  onChange={(e) => setFormData({ ...formData, payment_structure: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm appearance-none"
                >
                  <option value="full_upfront">full_upfront</option>
                  <option value="fifty_fifty">fifty_fifty</option>
                  <option value="milestone">milestone</option>
                  <option value="custom">custom</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Agreed Value (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="number" 
                  required
                  value={formData.agreed_value}
                  onChange={(e) => setFormData({ ...formData, agreed_value: e.target.value })}
                  placeholder="85000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Project Lead</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  required
                  value={formData.project_lead}
                  onChange={(e) => setFormData({ ...formData, project_lead: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 appearance-none transition-all font-bold text-sm"
                >
                  <option value="">Select Lead</option>
                  {formData.project_lead &&
                    !founders.some((f) => f.email.toLowerCase() === formData.project_lead.toLowerCase()) && (
                      <option value={formData.project_lead}>{formData.project_lead}</option>
                    )}
                  {founders.map((f) => (
                    <option key={f.email} value={f.email}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Notes (optional)</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any internal notes about this project…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="pt-8 border-t border-slate-100 flex gap-6">
            <button 
              type="button" 
              onClick={() => router?.back()}
              className="flex-1 py-5 rounded-xl border border-slate-200 text-slate-400 font-black hover:bg-slate-50 hover:text-slate-900 transition-all uppercase tracking-[0.2em] text-[10px]"
            >
              Discard Changes
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-5 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-[0.2em] text-[10px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Initializing...' : 'Initialize Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
