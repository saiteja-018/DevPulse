'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SUPPORTED_LANGUAGES } from '@/lib/constants'
import { Tag } from '@prisma/client'

type Props = {
  tags: Tag[]
}

export function SubmitForm({ tags }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    codeContent: '',
    language: 'javascript',
    difficultyTag: 'INTERMEDIATE',
  })

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : prev.length < 5
          ? [...prev, tagId]
          : prev,
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (selectedTags.length === 0) {
      setError('Please select at least one tag')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tagIds: selectedTags }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to create submission')
        return
      }

      router.push(`/review/${data.data.id}`)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="submit-title" className="block text-sm font-medium text-gray-300 mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="submit-title"
          type="text"
          required
          minLength={10}
          maxLength={200}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Descriptive title for your code submission"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-gray-600 mt-1">{formData.title.length}/200</p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="submit-description" className="block text-sm font-medium text-gray-300 mb-1.5">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          id="submit-description"
          required
          minLength={20}
          maxLength={2000}
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this code do? What kind of feedback are you looking for?"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
        />
        <p className="text-xs text-gray-600 mt-1">{formData.description.length}/2000</p>
      </div>

      {/* Language + Difficulty */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="submit-language" className="block text-sm font-medium text-gray-300 mb-1.5">
            Language <span className="text-red-400">*</span>
          </label>
          <select
            id="submit-language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="submit-difficulty" className="block text-sm font-medium text-gray-300 mb-1.5">
            Difficulty <span className="text-red-400">*</span>
          </label>
          <select
            id="submit-difficulty"
            value={formData.difficultyTag}
            onChange={(e) => setFormData({ ...formData, difficultyTag: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="EXPERT">Expert</option>
          </select>
        </div>
      </div>

      {/* Code Content */}
      <div>
        <label htmlFor="submit-code" className="block text-sm font-medium text-gray-300 mb-1.5">
          Code <span className="text-red-400">*</span>
        </label>
        <textarea
          id="submit-code"
          required
          minLength={10}
          maxLength={50000}
          rows={16}
          value={formData.codeContent}
          onChange={(e) => setFormData({ ...formData, codeContent: e.target.value })}
          placeholder="Paste your code here..."
          className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-gray-300 font-mono text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
        />
        <p className="text-xs text-gray-600 mt-1">{formData.codeContent.length}/50000</p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tags <span className="text-red-400">*</span>
          <span className="text-gray-500 font-normal ml-2">(1–5 tags, {selectedTags.length} selected)</span>
        </label>
        {tags.length === 0 ? (
          <p className="text-gray-500 text-sm">No tags available. Contact admin to add tags.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                id={`tag-btn-${tag.id}`}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  selectedTags.includes(tag.id)
                    ? 'border-current'
                    : 'border-transparent bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                style={
                  selectedTags.includes(tag.id)
                    ? { backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}60` }
                    : {}
                }
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        id="submit-code-btn"
        type="submit"
        disabled={submitting || selectedTags.length === 0}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </button>
    </form>
  )
}
