'use client'

import { useState, useEffect } from 'react'

export default function LoginPage() {
  const [test, setTest] = useState(false)
  
  useEffect(() => {
    setTest(true)
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 antialiased font-sans">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Finance Portal</h1>
        <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-[10px]">
          {test ? 'Hooks Active' : 'Initializing...'}
        </p>
      </div>
    </div>
  )
}
