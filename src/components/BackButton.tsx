'use client'

import { ArrowLeft } from 'lucide-react'
import { useAppRouter } from '@/hooks/useAppRouter'
import { cn } from '@/lib/utils'

export default function BackButton(props: {
  fallbackHref: string
  label?: string
  className?: string
  iconClassName?: string
  'aria-label'?: string
}) {
  const { back } = useAppRouter()

  return (
    <button
      type="button"
      aria-label={props['aria-label'] || props.label || 'Go back'}
      onClick={() => back(props.fallbackHref)}
      className={cn(
        props.label
          ? 'flex items-center gap-3 text-slate-400 transition-colors hover:text-slate-900 group touch-manipulation'
          : 'shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 touch-manipulation',
        props.className,
      )}
    >
      <ArrowLeft
        className={cn(
          'h-5 w-5',
          props.label && 'w-4 h-4 group-hover:-translate-x-1 transition-transform',
          props.iconClassName,
        )}
      />
      {props.label ? (
        <span className="text-[9px] font-black uppercase tracking-widest md:text-[10px]">{props.label}</span>
      ) : null}
    </button>
  )
}
