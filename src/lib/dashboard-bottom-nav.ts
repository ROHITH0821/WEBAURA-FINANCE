import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Briefcase, Receipt, Inbox, User } from 'lucide-react'

/** Sticky mobile bar — keep in sync with sidebar exclusions on small viewports. */
export const dashboardBottomNavItems: ReadonlyArray<{
  name: string
  href: string
  icon: LucideIcon
}> = [
  { name: 'Summary', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Requests', href: '/requests', icon: Inbox },
  { name: 'Profile', href: '/profile', icon: User },
]

export const dashboardBottomNavPathSet = new Set(
  dashboardBottomNavItems.map((i) => i.href.split('#')[0]),
)
