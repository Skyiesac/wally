'use client'

import { Button } from '@/components/ui/Button'
import { API_BASE_URL } from '@/lib/constants'

interface DownloadButtonProps {
  buildId: string
}

export function DownloadButton({ buildId }: DownloadButtonProps) {
  const downloadUrl = `${API_BASE_URL}/api/builds/${buildId}/download`

  return (
    <a href={downloadUrl} download>
      <Button size="lg">
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download APK
      </Button>
    </a>
  )
}