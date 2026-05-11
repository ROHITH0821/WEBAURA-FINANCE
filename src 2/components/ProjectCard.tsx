import Link from 'next/link'
import { FinanceProject } from '@/types/finance'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Briefcase, ArrowUpRight } from 'lucide-react'

export default function ProjectCard({ project }: { project: FinanceProject }) {
  const percentPaid = project.total_received ? (project.total_received / project.agreed_value) : 0
  
  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <div className="glass-card p-8 group-hover:border-slate-900 transition-all duration-300">
        <div className="flex justify-between items-start mb-8">
          <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-slate-900 group-hover:bg-[#f7f7dc] transition-all border border-transparent group-hover:border-slate-200">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg uppercase tracking-[0.2em] group-hover:text-slate-900 group-hover:bg-slate-100 transition-all">
            {project.project_code}
          </div>
        </div>
        
        <div className="mb-8">
          <h4 className="font-black text-slate-900 text-xl group-hover:translate-x-1 transition-transform mb-1 uppercase tracking-tight">{project.client_name}</h4>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{project.project_type}</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Collected</p>
              <p className="text-lg font-black text-slate-900">{formatCurrency(project.total_received || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Contract</p>
              <p className="text-sm font-black text-slate-900">{formatCurrency(project.agreed_value)}</p>
            </div>
          </div>

          <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-slate-900 transition-all duration-1000"
              style={{ width: `${percentPaid * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatPercent(percentPaid)} Paid</span>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  )
}
