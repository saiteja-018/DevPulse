import { SubmitForm } from '@/components/forms/SubmitForm'
import prisma from '@/lib/prisma'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Submit Code - DevPulse',
  description: 'Submit your code for peer review on DevPulse',
}

export default async function SubmitPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Submit Code for Review</h1>
        <p className="text-gray-400">Share your code with the community and get valuable feedback</p>
      </div>

      <SubmitForm tags={tags} />
    </div>
  )
}
