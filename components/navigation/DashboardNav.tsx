'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { SessionUser } from '@/lib/auth'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationBell } from '@/components/notifications/NotificationBell'

type Props = {
  user: SessionUser
  initialUnreadCount: number
}

const navLinks = [
  { href: '/feed', label: 'Feed' },
  { href: '/submit', label: 'Submit' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export function DashboardNav({ user, initialUnreadCount }: Props) {
  const pathname = usePathname()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user.id)

  // Use initialUnreadCount until real-time data is available
  const displayUnreadCount = notifications.length > 0 ? unreadCount : initialUnreadCount

  return (
    <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2 font-bold text-white">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">
              D
            </span>
            DevPulse
          </Link>

          {/* Nav Links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <NotificationBell
              notifications={notifications}
              unreadCount={displayUnreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />

            <Link
              href={`/profile/${user.username}`}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                {user.displayName[0]}
              </div>
              <span className="hidden sm:block">{user.displayName}</span>
            </Link>

            <button
              id="sign-out-btn"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
