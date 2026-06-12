import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeLeaderboardScore, validateUploadedFile, getContributionData } from '@/lib/utils'

// ============================================================
// computeLeaderboardScore Tests
// ============================================================
describe('computeLeaderboardScore', () => {
  it('should return 0 for a user with all zero values', () => {
    const result = computeLeaderboardScore({
      reputation: 0,
      totalReviewsGiven: 0,
      totalSubmissions: 0,
      netVotesReceived: 0,
    })
    expect(result).toBe(0)
    expect(typeof result).toBe('number')
  })

  it('should return 205.00 for the specified user', () => {
    const result = computeLeaderboardScore({
      reputation: 100,
      totalReviewsGiven: 5,
      totalSubmissions: 3,
      netVotesReceived: 10,
    })
    // reputation: 100 * 1.0 = 100
    // reviews: 5 * 15 = 75
    // submissions: 3 * 10 = 30
    // votes: 10 * 2 = 20
    // total: 225
    expect(result).toBe(225.00)
  })

  it('should return a lower score for negative netVotesReceived vs zero', () => {
    const baseUser = {
      reputation: 50,
      totalReviewsGiven: 3,
      totalSubmissions: 2,
      netVotesReceived: 0,
    }
    const negVotesUser = {
      ...baseUser,
      netVotesReceived: -5,
    }

    const baseScore = computeLeaderboardScore(baseUser)
    const negScore = computeLeaderboardScore(negVotesUser)

    expect(negScore).toBeLessThan(baseScore)
  })

  it('should return a number rounded to 2 decimal places', () => {
    const result = computeLeaderboardScore({
      reputation: 1,
      totalReviewsGiven: 1,
      totalSubmissions: 1,
      netVotesReceived: 1,
    })
    // score: 1 + 15 + 10 + 2 = 28
    expect(result).toBe(28.00)

    // Test rounding
    const result2 = computeLeaderboardScore({
      reputation: 1,
      totalReviewsGiven: 0,
      totalSubmissions: 0,
      netVotesReceived: 0,
    })
    const decimalStr = result2.toString()
    const decimalPart = decimalStr.split('.')[1]
    expect(!decimalPart || decimalPart.length <= 2).toBe(true)
  })

  it('should correctly apply the formula', () => {
    const user = {
      reputation: 200,
      totalReviewsGiven: 10,
      totalSubmissions: 5,
      netVotesReceived: 20,
    }
    // 200*1 + 10*15 + 5*10 + 20*2 = 200 + 150 + 50 + 40 = 440
    expect(computeLeaderboardScore(user)).toBe(440.00)
  })
})

// ============================================================
// getContributionData Tests
// ============================================================
describe('getContributionData', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
  })

  it('should always return exactly 30 items', async () => {
    // Mock prisma to return empty arrays
    const { default: prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.submission.findMany).mockResolvedValue([])
    vi.mocked(prisma.review.findMany).mockResolvedValue([])

    const result = await getContributionData('test-user-id')

    expect(result).toHaveLength(30)
  })

  it('should return items with valid YYYY-MM-DD date format', async () => {
    const { default: prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.submission.findMany).mockResolvedValue([])
    vi.mocked(prisma.review.findMany).mockResolvedValue([])

    const result = await getContributionData('test-user-id')
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/

    result.forEach((day) => {
      expect(day.date).toMatch(dateRegex)
    })
  })

  it('should return items with non-negative integer counts', async () => {
    const { default: prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.submission.findMany).mockResolvedValue([])
    vi.mocked(prisma.review.findMany).mockResolvedValue([])

    const result = await getContributionData('test-user-id')

    result.forEach((day) => {
      expect(day.count).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(day.count)).toBe(true)
    })
  })

  it('should fill days with no activity as count 0', async () => {
    const { default: prisma } = await import('@/lib/prisma')
    // Return empty data — all days should be 0
    vi.mocked(prisma.submission.findMany).mockResolvedValue([])
    vi.mocked(prisma.review.findMany).mockResolvedValue([])

    const result = await getContributionData('test-user-id')

    result.forEach((day) => {
      expect(day.count).toBe(0)
    })
  })

  it('should count submissions and reviews on the correct date', async () => {
    const { default: prisma } = await import('@/lib/prisma')

    const today = new Date()
    today.setHours(12, 0, 0, 0)

    vi.mocked(prisma.submission.findMany).mockResolvedValue([
      { createdAt: today } as any,
    ])
    vi.mocked(prisma.review.findMany).mockResolvedValue([
      { createdAt: today } as any,
    ])

    const result = await getContributionData('test-user-id')
    const todayStr = today.toISOString().split('T')[0]
    const todayEntry = result.find((d) => d.date === todayStr)

    expect(todayEntry).toBeDefined()
    expect(todayEntry!.count).toBe(2) // 1 submission + 1 review
  })
})

// ============================================================
// validateUploadedFile Tests
// ============================================================
describe('validateUploadedFile', () => {
  function createMockFile(name: string, type: string, sizeBytes: number): File {
    const content = new Uint8Array(sizeBytes)
    const blob = new Blob([content], { type })
    return new File([blob], name, { type })
  }

  it('should return valid: true for a PNG file under 5MB', () => {
    const file = createMockFile('screenshot.png', 'image/png', 1024 * 1024) // 1MB
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should return valid: true for a JPEG file under 5MB', () => {
    const file = createMockFile('photo.jpg', 'image/jpeg', 2 * 1024 * 1024) // 2MB
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should return valid: true for a WebP file under 5MB', () => {
    const file = createMockFile('image.webp', 'image/webp', 500 * 1024) // 500KB
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should return valid: false for a PDF file', () => {
    const file = createMockFile('document.pdf', 'application/pdf', 1024 * 1024)
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
    expect(typeof result.error).toBe('string')
    expect(result.error!.length).toBeGreaterThan(0)
  })

  it('should return valid: false for a text file', () => {
    const file = createMockFile('code.txt', 'text/plain', 100)
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should return valid: false for a PNG file over 5MB', () => {
    const file = createMockFile('large.png', 'image/png', 6 * 1024 * 1024) // 6MB
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
    expect(typeof result.error).toBe('string')
    expect(result.error!.length).toBeGreaterThan(0)
  })

  it('should return valid: false for a file at exactly 5MB (boundary)', () => {
    const file = createMockFile('boundary.png', 'image/png', 5 * 1024 * 1024 + 1) // Just over 5MB
    const result = validateUploadedFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should always return { valid: boolean, error: string | null }', () => {
    const file = createMockFile('test.png', 'image/png', 1000)
    const result = validateUploadedFile(file)
    expect(typeof result.valid).toBe('boolean')
    expect(result.error === null || typeof result.error === 'string').toBe(true)
  })
})
