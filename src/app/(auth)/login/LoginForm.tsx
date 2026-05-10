'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { sendResendOTP, verifyResendOTP } from '@/lib/auth-actions'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    if (typeof window !== 'undefined' && window.location.hash?.includes('access_token=')) {
      const hash = window.location.hash.replace(/^#/, '')
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth
          .setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (!error) {
              window.history.replaceState({}, '', window.location.pathname + window.location.search)
              router.push('/')
              router.refresh()
            }
          })
          .catch(() => {})
      }
    }

    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          router.push('/')
          router.refresh()
        }
      })
      if (data?.subscription) {
        return () => data.subscription.unsubscribe()
      }
    } catch (e) {
      console.error('Auth state error:', e)
    }
  }, [router])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await sendResendOTP(email)
    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setStep('otp')
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await verifyResendOTP(email, otp)
    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else if (res.redirectUrl) {
      window.location.href = res.redirectUrl
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 relative overflow-hidden antialiased font-jakarta text-slate-900">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-16 h-16 mb-6">
            <Image
              src="/webaura-mark-light.png"
              alt="WebAura"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Finance Portal</h1>
          <p className="text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">Internal Finance Management</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 sm:p-10 rounded-2xl shadow-xl shadow-slate-100">
          <div className="flex items-center gap-3 mb-10 bg-[#f7f7dc] border border-slate-200 rounded-xl p-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-900">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Secure Environment Access</p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-1">Corporate Email</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@webaura.in" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-14 pr-6 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{error}</p>}
              <button 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-5 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-[0.2em] text-[10px] active:scale-[0.98]"
              >
                {loading ? 'Sending Code...' : 'Send Access Code'}
                {!loading && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-1">Verification Code</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-3z" />
                    </svg>
                  </div>
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code" 
                    required
                    maxLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-14 pr-6 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm tracking-[0.5em]"
                  />
                </div>
                <button type="button" onClick={() => setStep('email')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 ml-1">Edit Email Address</button>
              </div>
              {error && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{error}</p>}
              <button 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-5 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-[0.2em] text-[10px] active:scale-[0.98]"
              >
                {loading ? 'Verifying...' : 'Verify & Enter Portal'}
                {!loading && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>
          )}
        </div>
        <p className="text-center mt-12 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">© 2026 WebAura India. Authorized personnel only.</p>
      </div>
    </div>
  )
}
