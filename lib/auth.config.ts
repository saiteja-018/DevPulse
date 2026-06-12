import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  providers: [],
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dummy_secret_for_build',
  trustHost: true,
} satisfies NextAuthConfig
