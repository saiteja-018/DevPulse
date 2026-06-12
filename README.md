# DevPulse - Developer Collaboration Platform

A full-stack real-time developer collaboration and code review platform built with Next.js 14, PostgreSQL, Redis, and Pusher.

## Features

- 🔐 **Authentication** — GitHub OAuth and email/password via NextAuth.js v5
- 📝 **Code Submissions** — Submit code for peer review with language detection and difficulty tagging
- ⭐ **Reviews** — Leave detailed reviews with ratings and line references
- 👍 **Voting** — Upvote/downvote submissions with toggle support
- 🏆 **Leaderboard** — Public leaderboard with composite scoring
- 🔔 **Real-time Notifications** — Pusher-powered live notifications for reviews and votes
- 📊 **Contribution Graphs** — 30-day activity visualization on profiles
- 🚀 **Redis Caching** — Intelligent caching with TTL and invalidation strategies
- 🛡️ **Rate Limiting** — Sliding window rate limiting via Upstash Ratelimit

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript strict mode)
- **Database**: PostgreSQL via Prisma ORM
- **Cache/Rate Limiting**: Upstash Redis
- **Authentication**: NextAuth.js v5 (GitHub OAuth + Credentials)
- **Real-time**: Pusher
- **File Storage**: Vercel Blob
- **Validation**: Zod
- **Client State**: TanStack Query v5
- **Styling**: Tailwind CSS
- **Testing**: Vitest

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Accounts for: GitHub OAuth, Upstash Redis, Pusher, Vercel Blob

### 1. Clone and Install

```bash
git clone <repository-url>
cd DevPulse
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/devpulse`) |
| `NEXTAUTH_SECRET` | Random secret (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your app URL (e.g., `http://localhost:3000`) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read-write token |
| `PUSHER_APP_ID` | Pusher App ID |
| `PUSHER_KEY` | Pusher Key |
| `PUSHER_SECRET` | Pusher Secret |
| `PUSHER_CLUSTER` | Pusher Cluster (e.g., `us2`) |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher Key (client-side) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher Cluster (client-side) |

### 3. Set Up GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set **Homepage URL** to `http://localhost:3000`
4. Set **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`
5. Copy the Client ID and Client Secret to `.env.local`

### 4. Run Database Migrations

```bash
npx prisma migrate deploy
```

### 5. Seed Initial Tags (Optional)

```bash
npx prisma db seed
```

### 6. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Running Tests

```bash
# Run all tests
npx vitest run

# Run with watch mode
npx vitest

# Run with coverage
npx vitest run --coverage
```

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
/app
  /api              # API routes (Route Handlers)
  /(auth)           # Authentication pages (login, register)
  /(dashboard)      # Protected dashboard pages
  /actions          # Server Actions
/components
  /forms            # Form components
  /navigation       # Navigation components
  /notifications    # Notification components
  /profile          # Profile components
  /review           # Review components
  /submission       # Submission components
/hooks              # Custom React hooks
/lib                # Shared utilities and configurations
/prisma             # Database schema and migrations
/tests              # Vitest unit tests
/types              # TypeScript type definitions
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/submissions` | List/create submissions |
| GET/PATCH/DELETE | `/api/submissions/[id]` | Single submission operations |
| POST/PATCH | `/api/reviews` | Create/resolve reviews |
| POST | `/api/votes` | Toggle votes |
| GET | `/api/leaderboard` | Get top 50 leaderboard |
| GET | `/api/notifications` | Get user notifications |
| POST | `/api/upload` | Upload code snapshots |
| POST | `/api/pusher/auth` | Authenticate Pusher channels |

## Redis Key Patterns

| Pattern | Description | TTL |
|---------|-------------|-----|
| `ratelimit:{ip}:{endpoint}` | Rate limit window | 60s |
| `cache:submissions:{hash}` | Submission list cache | 60s |
| `cache:submission:{id}` | Single submission cache | 120s |
| `viewcount:{submissionId}` | View count counter | — |
| `notif:unread:{userId}` | Unread notification count | 30s |

## Real-time Channels

| Channel | Event | Description |
|---------|-------|-------------|
| `private-user-{userId}` | `new-notification` | User notification |
| `submission-{submissionId}` | `new-review` | New review posted |
| `submission-{submissionId}` | `vote-update` | Vote count update |
