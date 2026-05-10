'use client'

import dynamic from 'next/dynamic'

// Use dynamic import with ssr: false to bypass all server-side rendering during build
const LoginForm = dynamic(() => import('./LoginForm'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 antialiased font-jakarta">
       <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
    </div>
  )
})

export default function LoginPage() {
  return <LoginForm />
}
