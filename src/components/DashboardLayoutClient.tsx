'use client'

import { ReactNode, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/SidebarStable'
import Header from '@/components/Header'
import { Menu, X } from 'lucide-react'

export default function DashboardLayoutClient({ 
  children, 
  isSuperAdmin 
}: { 
  children: ReactNode
  isSuperAdmin: boolean
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900 antialiased font-jakarta">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar isSuperAdmin={isSuperAdmin} />
        {/* Mobile Close Button */}
        <button 
          className="absolute top-4 right-4 p-2 lg:hidden text-slate-400 hover:text-slate-900"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden relative w-full">
        <header className="sticky top-0 z-20 flex items-center bg-white border-b border-slate-200">
          {/* Hamburger Menu */}
          <button 
            className="p-4 lg:hidden text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1">
            <Header />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-[#fcfcfc] relative">
          {/* Subtle Soft Texture Overlay */}
          <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
          
          <div className="relative z-10 mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
