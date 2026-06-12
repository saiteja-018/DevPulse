import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import NextAuth from 'next-auth'
import { authConfig } from './lib/auth.config'

const { auth } = NextAuth(authConfig)
import { PROTECTED_ROUTES } from './lib/constants'

// ============================================================
// Rate Limiting
// ============================================================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '60 s'),
  analytics: false,
})

/**
 * Checks the rate limit for a given IP and endpoint using sliding window algorithm.
 * Redis key pattern: ratelimit:{ip}:{endpoint}
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${ip}:${endpoint}`

  const { success, remaining, reset } = await ratelimit.limit(key)

  return {
    allowed: success,
    remaining,
    resetAt: reset,
  }
}

// ============================================================
// Middleware
// ============================================================

export default auth(async (request) => {
  const { pathname } = request.nextUrl

  // Rate limit all API routes
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1'

    // Normalize endpoint (strip query params, collapse dynamic segments)
    const endpoint = pathname.replace(/\/[a-zA-Z0-9_-]{20,}/, '/:id')

    try {
      const { allowed } = await checkRateLimit(ip, endpoint)

      if (!allowed) {
        return NextResponse.json(
          { error: 'rate_limit_exceeded', retryAfter: 60 },
          { status: 429 },
        )
      }
    } catch {
      // If Redis is unavailable, allow the request through
    }
  }

  // Protect dashboard routes
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  if (isProtected) {
    if (!request.auth?.user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/feed/:path*',
    '/submit/:path*',
    '/profile/:path*',
    '/review/:path*',
    '/leaderboard/:path*',
    '/api/leaderboard/:path*',
    '/api/notifications/:path*',
    '/api/pusher/:path*',
    '/api/reviews/:path*',
    '/api/submissions/:path*',
    '/api/upload/:path*',
    '/api/votes/:path*',
  ],
}
