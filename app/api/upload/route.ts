import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { validateUploadedFile, apiSuccess, apiError } from '@/lib/utils'
import { put } from '@vercel/blob'

// ============================================================
// POST /api/upload
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession()
    if (!currentUser) {
      return NextResponse.json(apiError('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('snapshot') as File | null
    const submissionId = formData.get('submissionId') as string | null

    if (!file) {
      return NextResponse.json(apiError('No file provided', 'MISSING_FILE'), { status: 400 })
    }

    if (!submissionId) {
      return NextResponse.json(apiError('submissionId is required', 'MISSING_SUBMISSION_ID'), { status: 400 })
    }

    // Verify submission exists and user is the author
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { authorId: true },
    })

    if (!submission) {
      return NextResponse.json(apiError('Submission not found', 'NOT_FOUND'), { status: 404 })
    }

    if (submission.authorId !== currentUser.id) {
      return NextResponse.json(apiError('Forbidden', 'FORBIDDEN'), { status: 403 })
    }

    // Validate file type and size
    const validation = validateUploadedFile(file)
    if (!validation.valid) {
      return NextResponse.json(apiError(validation.error!, 'INVALID_FILE'), { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`snapshots/${submissionId}/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })

    // Create CodeSnapshot record
    const snapshot = await prisma.codeSnapshot.create({
      data: {
        submissionId,
        imageUrl: blob.url,
      },
    })

    return NextResponse.json(
      apiSuccess({
        snapshotId: snapshot.id,
        imageUrl: snapshot.imageUrl,
      }),
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/upload error:', error)
    return NextResponse.json(apiError('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}
