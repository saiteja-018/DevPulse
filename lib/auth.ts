import NextAuth, { type NextAuthConfig, type Session } from 'next-auth'
import { type NextRequest } from 'next/server'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { authConfig as baseConfig } from './auth.config'

export type SessionUser = {
  id: string
  email: string
  username: string
  displayName: string
  reputation: number
}

const authConfig: NextAuthConfig = {
  ...baseConfig,
  adapter: PrismaAdapter(prisma) as NextAuthConfig['adapter'],
  session: {
    strategy: 'jwt',
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email ?? `${profile.login}@github.com`,
          image: profile.avatar_url,
          // Custom fields
          githubId: profile.id.toString(),
          username: profile.login,
          displayName: profile.name ?? profile.login,
          avatarUrl: profile.avatar_url,
        }
      },
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await validateCredentials(
          credentials.email as string,
          credentials.password as string,
        )

        if (!user) return null

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          image: user.avatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle GitHub OAuth - create/update user with githubId
      if (account?.provider === 'github' && profile) {
        const githubProfile = profile as unknown as {
          id: number
          login: string
          name?: string
          avatar_url: string
          email?: string
        }

        const githubId = githubProfile.id.toString()
        const email = githubProfile.email ?? user.email ?? `${githubProfile.login}@github.com`

        // Check if user already exists by githubId or email
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ githubId }, { email }],
          },
        })

        if (!existingUser) {
          // Create new user
          const baseUsername = githubProfile.login.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
          let username = baseUsername
          let suffix = 0

          // Ensure unique username
          while (await prisma.user.findUnique({ where: { username } })) {
            suffix++
            username = `${baseUsername}${suffix}`
          }

          await prisma.user.create({
            data: {
              email,
              username,
              displayName: githubProfile.name ?? githubProfile.login,
              avatarUrl: githubProfile.avatar_url,
              githubId,
            },
          })
        } else if (!existingUser.githubId) {
          // Update existing user with githubId
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              githubId,
              avatarUrl: existingUser.avatarUrl ?? githubProfile.avatar_url,
            },
          })
        }
      }

      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }

      // Always refresh user data from DB
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            reputation: true,
            avatarUrl: true,
          },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.email = dbUser.email
          token.username = dbUser.username
          token.displayName = dbUser.displayName
          token.reputation = dbUser.reputation
          token.picture = dbUser.avatarUrl
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as unknown as Record<string, unknown>).username = token.username
        ;(session.user as unknown as Record<string, unknown>).displayName = token.displayName
        ;(session.user as unknown as Record<string, unknown>).reputation = token.reputation
      }
      return session
    },
  },
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)

// ============================================================
// Exported Auth Functions (required by spec)
// ============================================================

/**
 * Returns the full session object including user id, username, email, and reputation.
 * Returns null if no session exists.
 */
export async function getServerSession(): Promise<Session | null> {
  const session = await auth()
  return session
}

/**
 * Returns a SessionUser from the current session, or null if unauthenticated.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getUserFromSession(req?: NextRequest): Promise<SessionUser | null> {
  try {
    const session = await auth()

    if (!session?.user) return null

    const user = session.user as {
      id?: string
      email?: string | null
      username?: string
      displayName?: string
      reputation?: number
    }

    if (!user.id || !user.email || !user.username) return null

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName ?? user.username,
      reputation: user.reputation ?? 0,
    }
  } catch {
    return null
  }
}

/**
 * Validates email/password credentials against the database.
 * Returns the full Prisma User object on success, null on failure.
 */
export async function validateCredentials(
  email: string,
  password: string,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.passwordHash) return null

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) return null

    return user
  } catch {
    return null
  }
}
