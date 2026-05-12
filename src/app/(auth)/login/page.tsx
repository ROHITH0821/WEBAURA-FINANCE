'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ArrowRight, Mail, ShieldCheck, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(prev => prev - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [resendTimer])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const cleanEmail = email.trim().toLowerCase()
      
      // 1. Check authorization first
      const authRes = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      })

      const authData = await authRes.json()
      if (!authRes.ok) {
        setError(authData.error || 'Access denied')
        setLoading(false)
        return
      }

      // 2. Trigger custom OTP from the server (handled in /api/auth/otp)
      // No need to call supabase.auth.signInWithOtp here anymore
      
      setStep('otp')
      setResendTimer(60)
    } catch (err) {
      setError('Failed to send access code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const cleanEmail = email.trim().toLowerCase()
      
      // 3. Verify the 6-digit code via our API
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: otp.trim() })
      })

      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) {
        setError(verifyData.error || 'Verification failed')
        setLoading(false)
        return
      }

      // 4. Log in using the token hash (Redirect-less)
      if (verifyData.tokenHash) {
        const { error: loginError } = await supabase.auth.verifyOtp({
          token_hash: verifyData.tokenHash,
          type: 'magiclink'
        })

        if (loginError) {
          setError(`Login failed: ${loginError.message}`)
          setLoading(false)
          return
        }
      } else if (verifyData.actionLink) {
        // Fallback to action link if hash is not available
        window.location.href = verifyData.actionLink
        return
      }

      // Success!
      window.location.href = '/'
    } catch (err) {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 relative overflow-hidden antialiased font-jakarta text-slate-900">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="relative w-16 h-16 mb-6">
            <img
              src="/webaura-mark-light.png"
              alt="WebAura"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2 uppercase">
            Finance Portal
          </h1>
          <p className="text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">
            Internal Finance Management
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-8 md:p-10">
          <div className="bg-yellow-50 border border-yellow-100/50 rounded-2xl p-4 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-yellow-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-900 uppercase tracking-wider">Secure Environment Access</p>
            </div>
          </div>

          <form onSubmit={step === 'email' ? handleSendOtp : handleVerifyOtp} className="space-y-6">
            {step === 'email' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Corporate Email
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@webauraindia.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Verification Code
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 focus:bg-white transition-all text-sm font-medium tracking-[0.5em]"
                    maxLength={6}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-wider ml-1 transition-colors"
                >
                  Edit email address
                </button>
              </div>
            )}

            {error && (
              <p className="text-[10px] font-black text-red-500 uppercase tracking-wider leading-relaxed px-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-slate-900/10"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {step === 'email' ? 'Send Access Code' : 'Verify & Enter Portal'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            © 2026 WebAura India. Authorized Personnel Only.
          </p>
        </div>
      </div>
    </div>
  )
}
