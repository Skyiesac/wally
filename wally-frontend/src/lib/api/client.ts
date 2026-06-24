import { API_BASE_URL } from '../constants'
import type {
  GenerateRequest,
  GenerationResponse,
  CreateAppRequest,
  RefineAppRequest,
  BuildRequest,
  App,
  Build,
} from './types'

class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // Generation endpoints
  async generateCode(request: GenerateRequest): Promise<GenerationResponse> {
    return this.request<GenerationResponse>('/api/generation/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // App endpoints
  async createApp(request: CreateAppRequest): Promise<App> {
    return this.request<App>('/api/apps', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async listApps(userId: string): Promise<App[]> {
    return this.request<App[]>(`/api/apps?user_id=${userId}`)
  }

  async getApp(appId: string): Promise<App> {
    return this.request<App>(`/api/apps/${appId}`)
  }

  async refineApp(appId: string, request: RefineAppRequest): Promise<GenerationResponse> {
    return this.request<GenerationResponse>(`/api/apps/${appId}/refine`, {
      method: 'PUT',
      body: JSON.stringify(request),
    })
  }

  async deleteApp(appId: string): Promise<{ message: string }> {
    return this.request(`/api/apps/${appId}`, {
      method: 'DELETE',
    })
  }

  // Build endpoints
  async createBuild(request: BuildRequest): Promise<Build> {
    return this.request<Build>('/api/builds', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getBuild(buildId: string): Promise<Build> {
    return this.request<Build>(`/api/builds/${buildId}`)
  }

  async getBuildLogs(buildId: string): Promise<{ build_log: string; error_log: string }> {
    return this.request(`/api/builds/${buildId}/logs`)
  }

  getDownloadURL(buildId: string): string {
    return `${this.baseURL}/api/builds/${buildId}/download`
  }
}

export const apiClient = new APIClient()
