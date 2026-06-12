import Link from 'next/link'
import { getServerSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getServerSession()

  if (session?.user) {
    redirect('/feed')
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 text-indigo-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Real-time developer collaboration
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight">
          Code better,{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            together
          </span>
        </h1>

        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          DevPulse is where developers submit code for peer review, receive real-time feedback, vote
          on quality, and track contributions on a public leaderboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg shadow-indigo-500/25 text-center"
          >
            Get started for free
          </Link>
          <Link
            href="/leaderboard"
            className="w-full sm:w-auto px-8 py-4 border border-gray-700 text-gray-300 font-semibold rounded-xl hover:border-gray-500 hover:text-white transition-all duration-200 text-center"
          >
            View leaderboard
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full">
        {[
          {
            icon: '⚡',
            title: 'Real-time Reviews',
            desc: 'Get instant feedback via WebSocket notifications without refreshing the page.',
          },
          {
            icon: '🏆',
            title: 'Reputation System',
            desc: 'Earn reputation points for reviews, submissions, and quality upvotes.',
          },
          {
            icon: '📊',
            title: 'Contribution Tracking',
            desc: 'Visual 30-day contribution graphs and a public leaderboard.',
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors"
          >
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-16 text-gray-600 text-sm">
        Built with Next.js 14 · PostgreSQL · Redis · Pusher
      </div>
    </main>
  )
}
