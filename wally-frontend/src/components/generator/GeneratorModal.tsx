'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import {
  useBuild,
  useBuildLogs,
  useCreateApp,
  useCreateBuild,
  useGenerateCode,
} from '@/lib/api/hooks'
import type { GenerationResponse } from '@/lib/api/types'
import {
  BUILD_STATUS_COLORS,
  BUILD_STATUS_LABELS,
  DEFAULT_USER_ID,
  LLM_PROVIDERS,
} from '@/lib/constants'

type Step = 'form' | 'generating' | 'review' | 'saving' | 'build'

const STEPS = [
  { n: 1, label: 'Describe' },
  { n: 2, label: 'Review' },
  { n: 3, label: 'Build' },
]

// Prompt input thresholds: match the backend's max_length and cap the
// auto-growing box so the scroll can't extend without bound.
const PROMPT_MAX_LENGTH = 2000
const PROMPT_MAX_HEIGHT = 176
const PROMPT_MIN_HEIGHT = 88

export default function GeneratorModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>('form')
  const [prompt, setPrompt] = useState('')
  const [appName, setAppName] = useState('')
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerationResponse | null>(null)
  const [buildId, setBuildId] = useState<string | null>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const generate = useGenerateCode()
  const createApp = useCreateApp()
  const createBuild = useCreateBuild()
  const build = useBuild(buildId)
  // Fetch logs only once the build has failed, so error_log is fresh
  const logs = useBuildLogs(build.data?.status === 'FAILED' ? buildId : null)

  const reset = () => {
    setStep('form')
    setPrompt('')
    setAppName('')
    setProvider('openai')
    setApiKey('')
    setError(null)
    setResult(null)
    setBuildId(null)
  }

  // Grow the prompt box with its content, capped at a max height threshold
  useEffect(() => {
    const el = promptRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.max(Math.min(el.scrollHeight, PROMPT_MAX_HEIGHT), PROMPT_MIN_HEIGHT)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > PROMPT_MAX_HEIGHT ? 'auto' : 'hidden'
  }, [prompt])

  // Close on Escape + lock body scroll while open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        reset()
        onClose()
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const handleGenerate = () => {
    setError(null)
    if (prompt.trim().length < 10) {
      setError('Prompt must be at least 10 characters.')
      return
    }
    if (apiKey.trim().length < 10) {
      setError('Please paste an API key (at least 10 characters).')
      return
    }
    setStep('generating')
    generate.mutate(
      {
        prompt: prompt.trim(),
        provider: provider as 'openai' | 'anthropic' | 'gemini',
        api_key: apiKey.trim(),
        user_id: DEFAULT_USER_ID,
      },
      {
        onSuccess: (res) => {
          setResult(res)
          if (res.success) {
            setError(null)
            setStep('review')
          } else {
            setError(res.errors.join('\n') || 'Generation failed after several attempts.')
            setStep('form')
          }
        },
        onError: (e) => {
          setError(e.message || 'Generation failed — is the API running?')
          setStep('form')
        },
      }
    )
  }

  const handleSaveAndBuild = () => {
    if (!result?.generated_code) return
    setError(null)
    setStep('saving')
    createApp.mutate(
      {
        name: appName.trim() || 'My Wally App',
        description: '',
        prompt: prompt.trim(),
        generated_code: result.generated_code,
        component_name: result.validation?.component_name ?? '',
        user_id: DEFAULT_USER_ID,
      },
      {
        onSuccess: (app) => {
          createBuild.mutate(
            { app_id: app.id, user_id: DEFAULT_USER_ID, version: '1.0.0' },
            {
              onSuccess: (b) => {
                setBuildId(b.id)
                setStep('build')
              },
              onError: (e) => {
                setError(e.message || 'Could not start the build.')
                setStep('review')
              },
            }
          )
        },
        onError: (e) => {
          setError(e.message || 'Could not save the app.')
          setStep('review')
        },
      }
    )
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const stepIndex = STEPS.findIndex((s) =>
    s.n === (step === 'form' ? 1 : step === 'generating' || step === 'review' ? 2 : 3)
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Wally generator"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl paper-card animate-slide-up max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-earth-200/60">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-clay-900">Wally</span>
            <span className="text-xs text-ink-400 font-serif italic">AI app generator</span>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-400 hover:text-clay-800 hover:bg-earth-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-3 px-6 pt-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    i <= stepIndex ? 'bg-clay-600 text-white' : 'bg-earth-200 text-ink-400'
                  }`}
                >
                  {s.n}
                </span>
                <span className={`text-xs font-medium ${i <= stepIndex ? 'text-clay-800' : 'text-ink-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < stepIndex ? 'bg-clay-400' : 'bg-earth-200'}`} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          {step === 'form' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-clay-900 mb-1.5">
                  What should we build?
                </label>
                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  maxLength={PROMPT_MAX_LENGTH}
                  placeholder="e.g. A to-do list app with checkboxes, a notes screen, and a counter on the home page…"
                  className="w-full rounded-xl border border-earth-300 bg-white/70 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-clay-400 transition-shadow resize-none min-h-[88px]"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-ink-400">
                  <span>Prompt grows as you type, then scrolls past {PROMPT_MAX_HEIGHT}px</span>
                  <span className="tabular-nums">
                    {prompt.length.toLocaleString()} / {PROMPT_MAX_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-clay-900 mb-1.5">App name</label>
                  <input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="My Wally App"
                    className="w-full rounded-xl border border-earth-300 bg-white/70 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-clay-400 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-clay-900 mb-1.5">Model</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full rounded-xl border border-earth-300 bg-white/70 px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-clay-400 transition-shadow"
                  >
                    {LLM_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-clay-900 mb-1.5">API key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-…"
                  autoComplete="off"
                  className="w-full rounded-xl border border-earth-300 bg-white/70 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-clay-400 transition-shadow"
                />
                <p className="mt-1.5 text-xs text-ink-400">
                  Sent only to the Wally API for this request — never stored.
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-line animate-fade-in">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generate.isPending}
                className="watercolor-btn w-full disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {generate.isPending ? 'Wally is painting your app…' : 'Generate code'}
              </button>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-earth-200" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-clay-500 animate-spin" />
              </div>
              <p className="font-display text-lg text-clay-900">Painting your app…</p>
              <p className="text-sm text-ink-500 font-serif italic mt-1">
                Generating, validating, and refining the Flutter code
              </p>
            </div>
          )}

          {step === 'review' && result?.generated_code && (
            <div className="space-y-4 animate-fade-in">
              {/* Validation summary */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Code generated
                </span>
                {result.validation?.component_name && (
                  <span className="rounded-full bg-sand-100 border border-sand-300/60 px-3 py-1 text-xs font-medium text-sand-700">
                    {result.validation.component_name}
                  </span>
                )}
                {result.attempts > 1 && (
                  <span className="rounded-full bg-earth-100 border border-earth-300/60 px-3 py-1 text-xs font-medium text-earth-700">
                    Refined {result.attempts - 1}×
                  </span>
                )}
                {result.validation?.warnings.map((w, i) => (
                  <span key={`w${i}`} className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700">
                    ⚠ {w}
                  </span>
                ))}
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
                  {error}
                </div>
              )}

              {/* Code preview */}
              <div className="rounded-xl border border-earth-200 bg-ink-900 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  <span className="ml-2 text-xs text-ink-300">generated_app.dart</span>
                </div>
                <pre className="px-4 py-3 max-h-56 overflow-y-auto text-xs leading-relaxed text-earth-100 font-mono">
                  {result.generated_code}
                </pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveAndBuild}
                  disabled={createApp.isPending || createBuild.isPending}
                  className="watercolor-btn flex-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {createApp.isPending || createBuild.isPending
                    ? 'Saving & queueing build…'
                    : 'Save app & start build'}
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-3 rounded-full border-2 border-earth-300 text-ink-500 font-medium hover:bg-earth-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {step === 'build' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg text-clay-900">Build in progress</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Build #{build.data?.build_number} · {build.data?.version ?? '1.0.0'} · status updates every 5s
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                    BUILD_STATUS_COLORS[build.data?.status ?? 'QUEUED'] ?? BUILD_STATUS_COLORS.QUEUED
                  }`}
                >
                  {build.data?.status === 'BUILDING' || build.data?.status === 'QUEUED' ? (
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : null}
                  {BUILD_STATUS_LABELS[build.data?.status ?? 'QUEUED'] ?? 'Queued'}
                </span>
              </div>

              {/* Progress bar */}
              {(build.data?.status === 'QUEUED' || build.data?.status === 'BUILDING') && (
                <div className="h-1.5 rounded-full bg-earth-200 overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-clay-500 animate-pulse" />
                </div>
              )}

              {build.data?.status === 'SUCCESS' && build.data.apk_url && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 animate-fade-in">
                  <p className="font-medium mb-2">Your APK is ready 🎉</p>
                  <a
                    href={apiClient.getDownloadURL(buildId!)}
                    className="inline-flex items-center gap-2 watercolor-btn !py-2.5 !px-5 text-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M8 3v7M5 7l3 3 3-3M3 12.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Download APK
                  </a>
                </div>
              )}

              {build.data?.status === 'FAILED' && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-fade-in">
                  <p className="font-medium mb-1">Build failed</p>
                  <p className="text-xs whitespace-pre-line font-mono">
                    {logs.data?.error_log || 'No error log available.'}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
                  {error}
                </div>
              )}

              <button
                onClick={reset}
                className="px-5 py-3 rounded-full border-2 border-earth-300 text-ink-500 font-medium hover:bg-earth-100 transition-colors"
              >
                Build another app
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
