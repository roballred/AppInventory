'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { Notification } from '@/lib/db/schema'

const TYPE_ICONS: Record<string, string> = {
  staleness_critical: '🔴',
  staleness_warning: '🟡',
  certification_deadline: '📅',
  assignment: '📌',
}

function timeAgo(date: Date | string): string {
  const d = new Date(date)
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (!res.ok) return
      const data = await res.json()
      setUnreadCount(data.unreadCount ?? 0)
      setItems(data.notifications ?? [])
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Refresh count when window regains focus
    const onFocus = () => fetchNotifications()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    setOpen((v) => !v)
    if (!open) {
      setLoading(true)
      await fetchNotifications()
      setLoading(false)
    }
  }

  async function markAllRead() {
    setMarking(true)
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
      setUnreadCount(0)
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date() })))
    } catch {
      // silently fail
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={marking}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {marking ? 'Marking…' : 'Mark all read'}
                </button>
              )}
              <Link
                href="/dashboard/notifications"
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() => setOpen(false)}
              >
                See all
              </Link>
            </div>
          </div>

          {/* Notification list */}
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-1">🔔</p>
              <p className="text-sm text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {items.map((n) => {
                const isUnread = !n.readAt
                return (
                  <li
                    key={n.id}
                    className={`px-4 py-3 transition-colors ${isUnread ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-base leading-tight mt-0.5" aria-hidden>
                        {TYPE_ICONS[n.type] ?? '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {n.title}
                          </p>
                          {isUnread && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                    {n.applicationId && (
                      <div className="mt-1.5 pl-8">
                        <Link
                          href={`/dashboard/applications/${n.applicationId}`}
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          View application →
                        </Link>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
