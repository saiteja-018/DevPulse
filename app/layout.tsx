import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'DevPulse - Developer Collaboration Platform',
    template: '%s | DevPulse',
  },
  description:
    'DevPulse is a platform for developers to submit code for peer review, receive real-time feedback, and track contribution metrics.',
  keywords: ['code review', 'developer collaboration', 'pull requests', 'peer review'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
