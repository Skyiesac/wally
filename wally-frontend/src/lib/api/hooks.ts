'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type {
  GenerateRequest,
  CreateAppRequest,
  RefineAppRequest,
  BuildRequest,
} from './types'

// Query keys
export const queryKeys = {
  apps: (userId: string) => ['apps', userId] as const,
  app: (appId: string) => ['app', appId] as const,
  build: (buildId: string) => ['build', buildId] as const,
  buildLogs: (buildId: string) => ['build-logs', buildId] as const,
}

// Apps hooks
export function useApps(userId: string) {
  return useQuery({
    queryKey: queryKeys.apps(userId),
    queryFn: () => apiClient.listApps(userId),
    staleTime: 30000, // 30 seconds
  })
}

export function useApp(appId: string) {
  return useQuery({
    queryKey: queryKeys.app(appId),
    queryFn: () => apiClient.getApp(appId),
    enabled: !!appId,
  })
}

export function useCreateApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateAppRequest) => apiClient.createApp(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps(variables.user_id) })
    },
  })
}

export function useDeleteApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (appId: string) => apiClient.deleteApp(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] })
    },
  })
}

// Generation hooks
export function useGenerateCode() {
  return useMutation({
    mutationFn: (request: GenerateRequest) => apiClient.generateCode(request),
  })
}

export function useRefineApp(appId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: RefineAppRequest) => apiClient.refineApp(appId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.app(appId) })
    },
  })
}

// Build hooks
export function useCreateBuild() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: BuildRequest) => apiClient.createBuild(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.build(data.id) })
    },
  })
}

export function useBuild(buildId: string | null) {
  return useQuery({
    queryKey: queryKeys.build(buildId ?? ''),
    queryFn: () => apiClient.getBuild(buildId ?? ''),
    enabled: !!buildId,
    refetchInterval: (query) => {
      // Poll every 5 seconds while a build is in progress
      const status = query.state.data?.status
      if (status === 'BUILDING' || status === 'QUEUED') {
        return 5000
      }
      return false
    },
  })
}

export function useBuildLogs(buildId: string | null) {
  return useQuery({
    queryKey: queryKeys.buildLogs(buildId ?? ''),
    queryFn: () => apiClient.getBuildLogs(buildId ?? ''),
    enabled: !!buildId,
  })
}
