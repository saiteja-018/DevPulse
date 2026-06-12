export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'rust',
  'go',
  'java',
  'csharp',
  'cpp',
  'c',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'scala',
  'r',
  'sql',
  'html',
  'css',
  'bash',
  'yaml',
  'json',
  'markdown',
  'dockerfile',
  'terraform',
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const RATE_LIMIT_MAX_REQUESTS = 100
export const RATE_LIMIT_WINDOW_SECONDS = 60

export const REDIS_TTL = {
  SUBMISSIONS_CACHE: 60,
  SUBMISSION_CACHE: 120,
  LEADERBOARD_CACHE: 300,
  UNREAD_NOTIFICATIONS: 30,
} as const

export const REPUTATION_POINTS = {
  SUBMISSION_CREATED: 5,
  REVIEW_GIVEN: 10,
  UPVOTE_RECEIVED: 2,
  DOWNVOTE_RECEIVED: -1,
} as const

export const PROTECTED_ROUTES = ['/feed', '/submit', '/profile', '/review', '/leaderboard'] as const
