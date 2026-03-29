import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, desc, eq, isNull, or } from 'drizzle-orm'
import { authOptions } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import MarkAllReadButton from './MarkAllReadButton'

const TYPE_ICONS: Record<string, string> = {
  staleness_critical: '🔴',
  staleness_warning: '🟡',
  certification_deadline: '📅',
  assignment: '📌',
}

const TYPE_LABELS: Record<string, string> = {
  staleness_critical: 'Critically Stale',
  staleness_warning: 'Stale Warning',
  certification_deadline: 'Certification Deadline',
  assignment: 'Assignment',
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  const agencyId: string | null = user.agencyId ?? null
  const userId: string = user.email ?? user.id ?? 'unknown'

  if (!agencyId) {
    redirect('/dashboard')
  }

  const scopeCondition = or(
    and(eq(notifications.agencyId, agencyId), isNull(notifications.userId)),
    eq(notifications.userId, userId)
  )

  const items = await db
    .select()
    .from(notifications)
    .where(scopeCondition)
    .orderBy(desc(notifications.createdAt))
    .limit(100)

  const unreadCount = items.filter((n) => !n.readAt).length

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-12 text-center">
          <p className="text-3xl mb-2">🔔</p>
          <p className="text-base font-medium text-gray-700">No notifications yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Notifications appear here when records become stale or the certification deadline approaches.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
          {items.map((n) => {
            const isUnread = !n.readAt
            return (
              <div
                key={n.id}
                className={`px-5 py-4 ${isUnread ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-xl leading-none mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                      {isUnread && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                    {n.applicationId && (
                      <Link
                        href={`/dashboard/applications/${n.applicationId}`}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View application →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
