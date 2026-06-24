import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LLMProvider } from '@/lib/api/types'
import { DEFAULT_USER_ID } from '@/lib/constants'

interface AppSettings {
  userId: string
  selectedProvider: LLMProvider
  apiKey: string
}

interface GenerationState {
  isGenerating: boolean
  currentPrompt: string
  generatedCode: string | null
  componentName: string | null
  validationErrors: string[]
}

interface BuildState {
  activeBuildId: string | null
  buildStatus: string | null
}

interface AppStore {
  // Settings
  settings: AppSettings
  setUserId: (userId: string) => void
  setProvider: (provider: LLMProvider) => void
  setApiKey: (apiKey: string) => void

  // Generation state
  generation: GenerationState
  setIsGenerating: (isGenerating: boolean) => void
  setCurrentPrompt: (prompt: string) => void
  setGeneratedCode: (code: string | null, componentName: string | null) => void
  setValidationErrors: (errors: string[]) => void
  clearGeneration: () => void

  // Build state
  build: BuildState
  setActiveBuild: (buildId: string | null) => void
  setBuildStatus: (status: string | null) => void
  clearBuild: () => void

  // Reset all
  reset: () => void
}

const defaultSettings: AppSettings = {
  // Backend seeds this demo user with build credits; the spec's random id
  // would break the build flow (no user-creation endpoint exists yet).
  userId: DEFAULT_USER_ID,
  selectedProvider: 'openai',
  apiKey: '',
}

const defaultGeneration: GenerationState = {
  isGenerating: false,
  currentPrompt: '',
  generatedCode: null,
  componentName: null,
  validationErrors: [],
}

const defaultBuild: BuildState = {
  activeBuildId: null,
  buildStatus: null,
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Settings
      settings: defaultSettings,
      setUserId: (userId) =>
        set((state) => ({
          settings: { ...state.settings, userId },
        })),
      setProvider: (provider) =>
        set((state) => ({
          settings: { ...state.settings, selectedProvider: provider },
        })),
      setApiKey: (apiKey) =>
        set((state) => ({
          settings: { ...state.settings, apiKey },
        })),

      // Generation
      generation: defaultGeneration,
      setIsGenerating: (isGenerating) =>
        set((state) => ({
          generation: { ...state.generation, isGenerating },
        })),
      setCurrentPrompt: (prompt) =>
        set((state) => ({
          generation: { ...state.generation, currentPrompt: prompt },
        })),
      setGeneratedCode: (code, componentName) =>
        set((state) => ({
          generation: {
            ...state.generation,
            generatedCode: code,
            componentName,
          },
        })),
      setValidationErrors: (errors) =>
        set((state) => ({
          generation: { ...state.generation, validationErrors: errors },
        })),
      clearGeneration: () =>
        set(() => ({
          generation: defaultGeneration,
        })),

      // Build
      build: defaultBuild,
      setActiveBuild: (buildId) =>
        set((state) => ({
          build: { ...state.build, activeBuildId: buildId },
        })),
      setBuildStatus: (status) =>
        set((state) => ({
          build: { ...state.build, buildStatus: status },
        })),
      clearBuild: () =>
        set(() => ({
          build: defaultBuild,
        })),

      // Reset
      reset: () =>
        set(() => ({
          settings: defaultSettings,
          generation: defaultGeneration,
          build: defaultBuild,
        })),
    }),
    {
      name: 'wally-storage',
      // Persist settings EXCEPT apiKey — it's session-only per the UI copy
      partialize: (state) => ({
        settings: {
          userId: state.settings.userId,
          selectedProvider: state.settings.selectedProvider,
        },
      }),
    }
  )
)
