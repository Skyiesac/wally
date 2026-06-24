export type LLMProvider = 'openai' | 'anthropic' | 'gemini'

export type BuildStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'BUILDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'

export interface ValidationResult {
  is_valid: boolean
  errors: string[]
  warnings: string[]
  component_name: string | null
}

export interface GenerationResponse {
  success: boolean
  generated_code: string | null
  validation: ValidationResult | null
  attempts: number
  errors: string[]
}

export interface App {
  id: string
  name: string
  description: string
  original_prompt: string
  package_name: string
  created_at: string
}

export interface Build {
  id: string
  app_id: string
  status: BuildStatus
  version: string
  build_number: number
  queued_at: string
  apk_url?: string | null
}

export interface GenerateRequest {
  prompt: string
  provider: LLMProvider
  api_key: string
  user_id: string
}

export interface CreateAppRequest {
  name: string
  description: string
  prompt: string
  generated_code: string
  component_name: string
  user_id: string
}

export interface RefineAppRequest {
  refinement_prompt: string
  provider: LLMProvider
  api_key: string
}

export interface BuildRequest {
  app_id: string
  user_id: string
  version: string
}

export interface WSMessage {
  type: 'build_started' | 'build_complete' | 'build_failed'
  build_id: string
  download_url?: string
  error?: string
}
