import { vi } from 'vitest'

// Mock Prisma client globally for tests
vi.mock('@/lib/prisma', () => ({
  default: {
    submission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    vote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (fn: unknown) => {
      if (typeof fn === 'function') {
        return fn({
          submission: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
          review: { create: vi.fn() },
          user: { update: vi.fn() },
          notification: { create: vi.fn() },
          vote: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        })
      }
      return fn
    }),
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}))

// Mock Redis
vi.mock('@/lib/redis', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  },
}))

// Mock next-auth
vi.mock('@/lib/auth', () => ({
  getUserFromSession: vi.fn().mockResolvedValue(null),
  getServerSession: vi.fn().mockResolvedValue(null),
  validateCredentials: vi.fn().mockResolvedValue(null),
  auth: vi.fn().mockResolvedValue(null),
}))
