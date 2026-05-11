import { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900 antialiased font-jakarta">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <header className="sticky top-0 z-20">
          <Header />
        </header>
        
        <main className="flex-1 overflow-y-auto p-10 bg-[#fcfcfc] relative">
          {/* Subtle Soft Texture Overlay from Admin Panel */}
          <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
          
          <div className="relative z-10 mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
