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
  LLM_PROVIDERS,
} from '@/lib/constants'

const DEFAULT_USER_ID_VALUE = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'user-demo-001'

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

type PreviewElement = {
  id: string
  type: 'text' | 'stat' | 'list' | 'input' | 'progress' | 'image' | 'button'
  label: string
  value?: string
  items?: string[]
}

type PreviewAction = {
  id: string
  label: string
  effect: 'navigate' | 'append' | 'toggle' | 'increment' | 'decrement'
  target: string
}

type PreviewScreen = {
  id: string
  title: string
  subtitle?: string
  elements: PreviewElement[]
  actions: PreviewAction[]
}

type PreviewSpec = {
  app_name: string
  theme?: {
    primary_color?: string
    accent_color?: string
  }
  screens: PreviewScreen[]
}

type GenerationResponseWithPreview = GenerationResponse & {
  preview?: PreviewSpec | null
}

function AppPreview({ preview, appName }: { preview: PreviewSpec | null | undefined; appName: string }) {
  const screens = preview?.screens ?? []
  const [activeScreenId, setActiveScreenId] = useState(screens[0]?.id ?? '')
  const [values, setValues] = useState<Record<string, string | number | boolean | string[]>>({})
  const activeScreen = screens.find((screen) => screen.id === activeScreenId) ?? screens[0]
  const title = appName.trim() || preview?.app_name || activeScreen?.title || 'Preview'
  const primaryColor = preview?.theme?.primary_color || '#7c3f2d'
  const accentColor = preview?.theme?.accent_color || '#f0ebe3'

  useEffect(() => {
    setActiveScreenId(screens[0]?.id ?? '')
    setValues({})
  }, [preview])

  const readValue = (element: PreviewElement) => values[element.id] ?? element.value ?? ''
  const readItems = (element: PreviewElement) => {
    const value = values[element.id]
    return Array.isArray(value) ? value : element.items ?? []
  }

  const applyAction = (action: PreviewAction) => {
    if (action.effect === 'navigate') {
      const target = screens.find((screen) => screen.id === action.target)
      if (target) setActiveScreenId(target.id)
      return
    }
    const targetElement =
      activeScreen?.elements.find((element) => element.id === action.target) ??
      activeScreen?.elements.find((element) => element.type === 'list') ??
      activeScreen?.elements[0]
    if (!targetElement) return

    setValues((current) => {
      const next = { ...current }
      const currentValue = next[targetElement.id] ?? targetElement.value ?? ''
      if (action.effect === 'append') {
        const items = Array.isArray(currentValue) ? currentValue : targetElement.items ?? []
        next[targetElement.id] = [...items, `${action.label} ${items.length + 1}`]
      }
      if (action.effect === 'toggle') {
        next[targetElement.id] = !(typeof currentValue === 'boolean' ? currentValue : false)
      }
      if (action.effect === 'increment' || action.effect === 'decrement') {
        const numberValue = Number.parseInt(String(currentValue || 0), 10) || 0
        next[targetElement.id] = action.effect === 'increment' ? numberValue + 1 : Math.max(0, numberValue - 1)
      }
      return next
    })
  }

  const renderElement = (element: PreviewElement) => {
    if (element.type === 'list') {
      const items = readItems(element)
      return (
        <div key={element.id} className="space-y-2">
          {element.label && <p className="text-xs font-semibold text-ink-500">{element.label}</p>}
          {items.map((item, index) => (
            <div key={`${element.id}-${index}`} className="rounded-lg border border-earth-200 bg-white p-3 text-sm text-ink-700">
              {item}
            </div>
          ))}
        </div>
      )
    }
    if (element.type === 'stat') {
      return (
        <div key={element.id} className="rounded-lg border border-earth-200 bg-white p-3">
          <p className="text-xs text-ink-400">{element.label}</p>
          <p className="mt-1 text-2xl font-bold text-clay-800">{readValue(element)}</p>
        </div>
      )
    }
    if (element.type === 'input') {
      return (
        <label key={element.id} className="block">
          <span className="text-xs font-semibold text-ink-500">{element.label}</span>
          <input
            value={String(readValue(element))}
            onChange={(event) => setValues((current) => ({ ...current, [element.id]: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-earth-300 bg-white px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-clay-400"
          />
        </label>
      )
    }
    if (element.type === 'progress') {
      const percent = Math.min(100, Math.max(0, Number.parseInt(String(readValue(element)), 10) || 0))
      return (
        <div key={element.id} className="rounded-lg border border-earth-200 bg-white p-3">
          <div className="flex justify-between text-xs text-ink-500">
            <span>{element.label}</span>
            <span>{percent}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-earth-200">
            <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: primaryColor }} />
          </div>
        </div>
      )
    }
    if (element.type === 'image') {
      return (
        <div key={element.id} className="rounded-lg border border-earth-200 bg-white p-3">
          <div className="h-24 rounded-md" style={{ background: `linear-gradient(135deg, ${accentColor}, ${primaryColor})` }} />
          <p className="mt-2 text-sm font-semibold text-ink-700">{element.label}</p>
        </div>
      )
    }
    if (element.type === 'button') {
      const buttonAction =
        activeScreen?.actions.find((action) => action.target === element.id) ??
        activeScreen?.actions.find((action) => action.effect !== 'navigate') ??
        activeScreen?.actions[0]
      return (
        <button
          key={element.id}
          type="button"
          onClick={() => buttonAction && applyAction(buttonAction)}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}40` }}
        >
          {element.label || 'Tap me'}
        </button>
      )
    }
    return (
      <div key={element.id} className="rounded-lg border border-earth-200 bg-white p-3">
        <p className="text-sm font-semibold text-ink-800">{element.label}</p>
        {element.value && <p className="mt-1 text-xs leading-relaxed text-ink-500">{readValue(element)}</p>}
      </div>
    )
  }

  if (!activeScreen) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Preview was not returned by the backend. Generate again so the backend can create an app preview.
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[2rem] border-[9px] border-ink-900 bg-ink-900 shadow-paper">
        <div className="overflow-hidden rounded-[1.45rem] bg-earth-50">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: primaryColor }}>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/70">Preview</p>
              <h3 className="max-w-[170px] truncate text-base font-semibold text-white">{title}</h3>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
              {screens.length}
            </div>
          </div>

          <div className="flex min-h-[380px] flex-col px-4 py-4">
            {screens.length > 1 && (
              <div className="mb-4 grid rounded-full bg-earth-200 p-1 text-xs font-medium text-ink-600" style={{ gridTemplateColumns: `repeat(${screens.length}, minmax(0, 1fr))` }}>
                {screens.map((screen) => (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setActiveScreenId(screen.id)}
                    className={`truncate rounded-full px-2 py-2 transition-colors ${activeScreen.id === screen.id ? 'bg-white text-clay-800 shadow-paper' : ''}`}
                  >
                    {screen.title}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-lg font-bold text-clay-900">{activeScreen.title}</h4>
              {activeScreen.subtitle && <p className="mt-1 text-xs leading-relaxed text-ink-500">{activeScreen.subtitle}</p>}
            </div>

            <div className="flex-1 space-y-3">{activeScreen.elements.map(renderElement)}</div>

            {activeScreen.actions.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-earth-200 pt-4">
                {activeScreen.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => applyAction(action)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}40` }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-400">
        Interactive preview — tap the buttons inside the phone to try the app
      </p>
    </div>
  )
}

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
        user_id: DEFAULT_USER_ID_VALUE,
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
        user_id: DEFAULT_USER_ID_VALUE,
      },
      {
        onSuccess: (app) => {
          createBuild.mutate(
            { app_id: app.id, user_id: DEFAULT_USER_ID_VALUE, version: '1.0.0' },
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

              <AppPreview
                appName={appName}
                preview={(result as GenerationResponseWithPreview | null)?.preview ?? null}
              />

              {/* Raw Dart code stays hidden by default — the visual preview is the star */}
              <details className="rounded-xl border border-earth-200 bg-white/60">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-ink-500 transition-colors hover:text-clay-800">
                  View generated code (optional)
                </summary>
                <pre className="max-h-64 overflow-auto border-t border-earth-200 px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-700">
                  {result.generated_code}
                </pre>
              </details>

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

              {build.data?.status === 'SUCCESS' && buildId && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 animate-fade-in">
                  <p className="font-medium mb-2">Your APK is ready</p>
                  <a
                    href={apiClient.getDownloadURL(buildId!)}
                    download={`${appName.trim() || 'wally-app'}.apk`}
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
