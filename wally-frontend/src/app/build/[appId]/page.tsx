'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp, useCreateBuild, useBuild } from '@/lib/api/hooks'
import { useAppStore } from '@/store/useAppStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BuildProgress } from './components/BuildProgress'
import { BuildLogs } from './components/BuildLogs'
import { DownloadButton } from './components/DownloadButton'
import { motion } from 'framer-motion'

export default function BuildPage() {
  const params = useParams()
  const router = useRouter()
  const appId = params.appId as string

  const userId = useAppStore((state) => state.settings.userId)
  const activeBuildId = useAppStore((state) => state.build.activeBuildId)
  const setActiveBuild = useAppStore((state) => state.setActiveBuild)

  const { data: app, isLoading: appLoading } = useApp(appId)
  const createBuild = useCreateBuild()
  const { data: build } = useBuild(activeBuildId)

  const [showLogs, setShowLogs] = useState(false)

  const handleStartBuild = async () => {
    try {
      const newBuild = await createBuild.mutateAsync({
        app_id: appId,
        user_id: userId,
        version: '1.0.0',
      })
      setActiveBuild(newBuild.id)
    } catch (error) {
      alert(
        'Failed to start build: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  }

  useEffect(() => {
    return () => {
      // Clear active build when leaving page
      setActiveBuild(null)
    }
  }, [setActiveBuild])

  if (appLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-clay-200 border-t-clay-600 rounded-full animate-spin mb-4" />
          <p className="text-ink-600">Loading app...</p>
        </div>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <p className="text-red-600">App not found</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-clay-600 hover:text-clay-800 mb-4 transition-colors"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Gallery
          </button>

          <h1 className="text-4xl font-display font-bold text-clay-800 mb-2">
            {app.name}
          </h1>
          <p className="text-ink-600">
            {app.description || 'Building your Android app'}
          </p>
        </motion.div>

        {/* Build Status */}
        {!activeBuildId ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card variant="bordered" className="text-center py-12">
              <div className="inline-block p-8 rounded-full bg-earth-100 mb-6">
                <svg
                  className="w-16 h-16 text-earth-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-display font-semibold text-clay-900 mb-3">
                Ready to Build
              </h2>
              <p className="text-ink-600 mb-8 max-w-md mx-auto">
                Click the button below to start compiling your Flutter app into
                an installable APK. This process takes about 15 minutes.
              </p>
              <Button
                size="lg"
                onClick={handleStartBuild}
                isLoading={createBuild.isPending}
              >
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
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Start Building APK
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Build Progress */}
            <BuildProgress build={build} />

            {/* Actions */}
            {build?.status === 'SUCCESS' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  variant="bordered"
                  className="bg-green-50/50 border-green-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">
                          Build Complete!
                        </h3>
                        <p className="text-sm text-green-700">
                          Your APK is ready to download
                        </p>
                      </div>
                    </div>
                    <DownloadButton buildId={activeBuildId} />
                  </div>
                </Card>
              </motion.div>
            )}

            {build?.status === 'FAILED' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  variant="bordered"
                  className="bg-red-50/50 border-red-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-900 mb-2">
                        Build Failed
                      </h3>
                      <p className="text-sm text-red-700 mb-4">
                        The build process encountered an error. Check the logs
                        for details.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveBuild(null)}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Build Logs Toggle */}
            {(build?.status === 'FAILED' || build?.status === 'SUCCESS') && (
              <div className="text-center">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-sm text-clay-600 hover:text-clay-800 underline"
                >
                  {showLogs ? 'Hide' : 'Show'} Build Logs
                </button>
              </div>
            )}

            {showLogs && <BuildLogs buildId={activeBuildId} />}
          </div>
        )}
      </div>
    </div>
  )
}