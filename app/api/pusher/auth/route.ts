import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? 'us2',
  useTLS: true,
})

// ============================================================
// POST /api/pusher/auth
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.formData()
    const socketId = body.get('socket_id') as string
    const channelName = body.get('channel_name') as string

    // Only allow users to subscribe to their own private channel
    if (channelName.startsWith('private-user-')) {
      const channelUserId = channelName.replace('private-user-', '')
      if (channelUserId !== currentUser.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName, {
      user_id: currentUser.id,
      user_info: {
        username: currentUser.username,
        displayName: currentUser.displayName,
      },
    })

    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('POST /api/pusher/auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
