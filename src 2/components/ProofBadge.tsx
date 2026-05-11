import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProofBadgeProps {
  status: 'verified' | 'unverified'
  showIcon?: boolean
}

export default function ProofBadge({ status, showIcon = true }: ProofBadgeProps) {
  const isVerified = status === 'verified'
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      isVerified 
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
    )}>
      {showIcon && (
        isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />
      )}
      {isVerified ? 'Verified' : 'Needs Proof'}
    </span>
  )
}
