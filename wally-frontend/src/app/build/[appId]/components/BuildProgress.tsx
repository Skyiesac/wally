'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { motion } from 'framer-motion'
import { formatDate } from '@/lib/utils'
import type { Build } from '@/lib/api/types'

interface BuildProgressProps {
  build: Build | undefined
}

export function BuildProgress({ build }: BuildProgressProps) {
  if (!build) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="inline-block w-12 h-12 border-4 border-clay-200 border-t-clay-600 rounded-full animate-spin" />
          <p className="text-ink-600 mt-4">Loading build status...</p>
        </div>
      </Card>
    )
  }

  const failedEnd = 'FAILED' as const
  const cancelledEnd = 'CANCELLED' as const

  const steps = [
    { id: 'PENDING', label: 'Queued', icon: '⏳' },
    { id: 'QUEUED', label: 'Preparing', icon: '📦' },
    { id: 'BUILDING', label: 'Building', icon: '🔨' },
    { id: 'SUCCESS', label: 'Complete', icon: '✅' },
  ] as const

  // For terminal statuses (FAILED/CANCELLED) cap progress at the BUILDING
  // step so the bar shows how far it got before stopping.
  const terminalStatuses: Record<string, string> = {
    FAILED: failedEnd,
    CANCELLED: cancelledEnd,
  }
  const progressStatus = terminalStatuses[build.status] ?? build.status
  const currentStepIndex = steps.findIndex((s) => s.id === progressStatus)
  const isActive = (index: number) => index <= currentStepIndex
  const isCurrent = (index: number) => index === currentStepIndex

  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (build.status !== 'BUILDING' && build.status !== 'QUEUED' && build.status !== 'PENDING') return
    const update = () => {
      const ms = Date.now() - new Date(build.queued_at).getTime()
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setElapsed(`${m}m ${s}s`)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [build.status, build.queued_at])

  return (
    <Card variant="bordered">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-display font-semibold text-clay-900">
            Build Status
          </h2>
          <Badge variant={build.status}>{build.status}</Badge>
        </div>
        <p className="text-sm text-ink-600">
          Build #{build.build_number} &middot; Started{' '}
          {formatDate(build.queued_at)}
          {elapsed ? ` · Running for ${elapsed}` : ''}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-earth-200">
          <motion.div
            className="h-full bg-clay-600"
            initial={{ width: '0%' }}
            animate={{
              width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 ${
                  isActive(index)
                    ? 'bg-clay-600 text-white'
                    : 'bg-earth-100 text-earth-400'
                } ${
                  isCurrent(index) && build.status === 'BUILDING'
                    ? 'animate-pulse'
                    : ''
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {step.icon}
              </motion.div>
              <span
                className={`text-xs font-medium ${
                  isActive(index) ? 'text-clay-800' : 'text-ink-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Status Message */}
      {build.status === 'BUILDING' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-earth-50 rounded-lg border border-earth-200"
        >
          <p className="text-sm text-ink-700 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-clay-600 rounded-full animate-ping" />
            Compiling Flutter code... This may take 10–15 minutes
          </p>
        </motion.div>
      )}
    </Card>
  )
}