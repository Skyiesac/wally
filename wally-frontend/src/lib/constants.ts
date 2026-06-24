export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI GPT-4' },
  { value: 'anthropic', label: 'Claude 3' },
  { value: 'gemini', label: 'Google Gemini' },
] as const

export const BUILD_STATUS_LABELS = {
  PENDING: 'Pending',
  QUEUED: 'Queued',
  BUILDING: 'Building',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
} as const

export const BUILD_STATUS_COLORS = {
  PENDING: 'text-sand-500 bg-sand-100',
  QUEUED: 'text-clay-500 bg-clay-100',
  BUILDING: 'text-earth-600 bg-earth-100 animate-pulse',
  SUCCESS: 'text-green-700 bg-green-100',
  FAILED: 'text-red-700 bg-red-100',
  CANCELLED: 'text-ink-500 bg-ink-100',
} as const
