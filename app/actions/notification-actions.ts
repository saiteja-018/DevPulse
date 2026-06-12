'use server'

import prisma from '@/lib/prisma'
import redis from '@/lib/redis'
import { getUserFromSession } from '@/lib/auth'
import { REDIS_TTL } from '@/lib/constants'

/**
 * Marks a specific notification as read.
 * Verifies the notification belongs to the current user.
 */
export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) return { success: false }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    })

    if (!notification || notification.userId !== currentUser.id) {
      return { success: false }
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })

    // Invalidate unread count cache
    await redis.del(`notif:unread:${currentUser.id}`)

    return { success: true }
  } catch {
    return { success: false }
  }
}

/**
 * Marks all unread notifications as read for the current user.
 * Returns how many were updated.
 */
export async function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) return { updatedCount: 0 }

    const result = await prisma.notification.updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: { isRead: true },
    })

    // Invalidate cache
    await redis.del(`notif:unread:${currentUser.id}`)

    return { updatedCount: result.count }
  } catch {
    return { updatedCount: 0 }
  }
}

/**
 * Returns the unread notification count for the current user.
 * Checks Redis cache first (key: notif:unread:{userId}, TTL: 30s).
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) return 0

    const cacheKey = `notif:unread:${currentUser.id}`

    // Check cache first
    const cached = await redis.get<number>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Query database
    const count = await prisma.notification.count({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
    })

    // Store in cache
    await redis.set(cacheKey, count, { ex: REDIS_TTL.UNREAD_NOTIFICATIONS })

    return count
  } catch {
    return 0
  }
}
