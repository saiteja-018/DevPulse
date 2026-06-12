import { getServerSession, getUserFromSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/navigation/DashboardNav'
import { getUnreadNotificationCount } from '@/app/actions/notification-actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  if (!session?.user) redirect('/login')

  const currentUser = await getUserFromSession()
  const unreadCount = await getUnreadNotificationCount()

  return (
    <div className="min-h-screen bg-gray-950">
      <DashboardNav user={currentUser!} initialUnreadCount={unreadCount} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
