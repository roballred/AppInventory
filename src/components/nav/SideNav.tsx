'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface NavItem {
  href: string
  label: string
  comingSoon?: boolean
  hidden?: boolean
}

interface SideNavProps {
  role: string
  isDevMode: boolean
}

export default function SideNav({ role, isDevMode }: SideNavProps) {
  const pathname = usePathname()

  const isPlatformAdmin = role === 'platform_admin'
  const isAgencyAdmin = role === 'agency_admin'
  const isSubmitter = role === 'submitter'
  const hasWorkQueue = isSubmitter || isAgencyAdmin

  const navItems: NavItem[] = [
    // Work Queue — first nav item for submitters and agency_admins
    {
      href: '/dashboard/work-queue',
      label: 'Work Queue',
      hidden: !hasWorkQueue,
    },
    // Dashboard — shown to agency_admin, viewer, platform_admin; submitters bypass it
    {
      href: '/dashboard',
      label: 'Dashboard',
      hidden: isSubmitter,
    },
    // Risk Dashboard — agency_admin only
    {
      href: '/dashboard/risk',
      label: 'Risk Dashboard',
      hidden: !isAgencyAdmin,
    },
    { href: '/dashboard/applications', label: 'Applications' },
    {
      href: '/dashboard/certification',
      label: 'Certification',
      hidden: !isAgencyAdmin,
    },
    {
      href: '/admin/certifications',
      label: 'Certifications',
      hidden: !isPlatformAdmin,
    },
    {
      href: '/admin/config',
      label: 'Configuration',
      hidden: !isPlatformAdmin,
    },
    {
      href: '/admin/data-quality',
      label: 'Data Quality',
      hidden: !isPlatformAdmin,
    },
    {
      href: '/admin/portfolio',
      label: 'Portfolio',
      hidden: !isPlatformAdmin,
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      hidden: isPlatformAdmin,
    },
    {
      href: '/dashboard/dev-tools',
      label: '🧪 Testing',
      hidden: !isDevMode,
    },
  ]

  return (
    <nav className="flex flex-col h-full">
      <ul className="flex-1 space-y-1 py-4">
        {navItems
          .filter((item) => !item.hidden)
          .map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                {item.comingSoon ? (
                  <span
                    className={clsx(
                      'flex items-center justify-between px-4 py-2 text-sm rounded-md cursor-not-allowed',
                      'text-gray-400'
                    )}
                    title="Coming soon"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-medium">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={clsx(
                      'flex items-center px-4 py-2 text-sm rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
      </ul>

      {isDevMode && (
        <div className="px-4 py-3 border-t border-gray-200">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Dev mode
          </span>
        </div>
      )}
    </nav>
  )
}
