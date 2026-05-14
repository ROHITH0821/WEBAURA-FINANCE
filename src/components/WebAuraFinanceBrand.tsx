import Image from 'next/image'
import Link from 'next/link'

type BrandProps = {
  /** Tighter mark + type for the top app bar on small screens. */
  compact?: boolean
  className?: string
  /** e.g. close mobile sidebar after navigating home */
  onNavigate?: () => void
}

/**
 * Brand lockup: geometric **W** mark (`/public/webaura-mark.png`) + WEBAURA / FINANCE type.
 */
export default function WebAuraFinanceBrand({ compact, className, onNavigate }: BrandProps) {
  return (
    <Link
      href="/"
      className={
        `flex items-center gap-2.5 sm:gap-3 min-w-0 shrink touch-manipulation rounded-lg outline-none ` +
        `transition-opacity hover:opacity-90 ` +
        `focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ` +
        (className || '')
      }
      aria-label="WebAura Finance — go to summary"
      onClick={() => onNavigate?.()}
    >
      <Image
        src="/webaura-mark.png"
        alt=""
        width={256}
        height={256}
        priority
        draggable={false}
        unoptimized
        className={
          compact
            ? 'h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9'
            : 'h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11'
        }
        aria-hidden
      />
      <div className="min-w-0 flex flex-col justify-center leading-tight gap-0.5">
        <span className="font-black text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-slate-900 truncate">
          WebAura
        </span>
        <span className="font-normal text-[8px] sm:text-[9px] tracking-[0.28em] uppercase text-slate-500 truncate">
          Finance
        </span>
      </div>
    </Link>
  )
}
