'use client'

import { Card } from '@/components/ui/Card'
import { useBuildLogs } from '@/lib/api/hooks'
import { motion } from 'framer-motion'

interface BuildLogsProps {
  buildId: string
}

export function BuildLogs({ buildId }: BuildLogsProps) {
  const { data: logs, isLoading } = useBuildLogs(buildId)

  if (isLoading) {
    return (
      <Card>
        <p className="text-center text-ink-600">Loading logs...</p>
      </Card>
    )
  }

  const logText =
    logs?.build_log || logs?.error_log || 'No logs available'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <Card variant="bordered">
        <h3 className="text-lg font-semibold text-clay-900 mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Build Logs
        </h3>

        <div className="bg-ink-900 rounded-xl p-4 max-h-96 overflow-auto">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
            {logText}
          </pre>
        </div>
      </Card>
    </motion.div>
  )
}