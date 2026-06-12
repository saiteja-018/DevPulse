import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { apiSuccess, apiError } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        apiError(validation.error.issues[0].message, 'VALIDATION_ERROR'),
        { status: 400 },
      )
    }

    const { email, username, displayName, password } = validation.data

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })

    if (existing) {
      const field = existing.email === email ? 'email' : 'username'
      return NextResponse.json(
        apiError(`This ${field} is already taken`, 'DUPLICATE_USER'),
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      apiSuccess({
        ...user,
        createdAt: user.createdAt.toISOString(),
      }),
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/auth/register error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}
