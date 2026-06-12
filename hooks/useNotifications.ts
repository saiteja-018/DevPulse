'use client'

import { useState, useEffect, useCallback } from 'react'
import Pusher from 'pusher-js'
import { markNotificationRead, markAllNotificationsRead } from '@/app/actions/notification-actions'
import { NotificationData } from '@/types'

let pusherClient: Pusher | null = null

function getPusherClient(): Pusher {
  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'us2',
      authEndpoint: '/api/pusher/auth',
    })
  }
  return pusherClient
}

/**
 * Hook for managing real-time notifications.
 * Listens to the private-user-{userId} Pusher channel.
 * Supports optimistic updates for markRead and markAllRead.
 */
export function useNotifications(userId: string): {
  notifications: NotificationData[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
} {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch initial notifications
  useEffect(() => {
    if (!userId) return

    const fetchInitial = async () => {
      try {
        const res = await fetch('/api/notifications?limit=20')
        const data = await res.json()
        if (data.data?.notifications) {
          setNotifications(data.data.notifications)
          setUnreadCount(data.data.notifications.filter((n: NotificationData) => !n.isRead).length)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchInitial()
  }, [userId])

  // Subscribe to real-time Pusher channel
  useEffect(() => {
    if (!userId) return

    const pusher = getPusherClient()
    const channel = pusher.subscribe(`private-user-${userId}`)

    channel.bind('new-notification', (data: Partial<NotificationData> & { type: string }) => {
      // Add the new notification to the top of the list
      const newNotification: NotificationData = {
        id: data.id ?? `temp-${Date.now()}`,
        type: data.type as NotificationData['type'],
        message: data.message ?? 'You have a new notification',
        isRead: false,
        createdAt: new Date().toISOString(),
        userId,
        metadata: data.metadata ?? null,
      }

      setNotifications((prev) => [newNotification, ...prev])
      setUnreadCount((prev) => prev + 1)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${userId}`)
    }
  }, [userId])

  /**
   * Optimistically marks a single notification as read.
   */
  const markRead = useCallback(
    (id: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      // Server action
      markNotificationRead(id).then((result) => {
        if (!result.success) {
          // Revert optimistic update on failure
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
          )
          setUnreadCount((prev) => prev + 1)
        }
      })
    },
    [],
  )

  /**
   * Optimistically marks all notifications as read.
   */
  const markAllRead = useCallback(() => {
    const previousNotifications = notifications
    const previousUnreadCount = unreadCount

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)

    // Server action
    markAllNotificationsRead().then((result) => {
      if (result.updatedCount === 0 && previousUnreadCount > 0) {
        // Revert on unexpected failure
        setNotifications(previousNotifications)
        setUnreadCount(previousUnreadCount)
      }
    })
  }, [notifications, unreadCount])

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  }
}
