'use client'

import type { ReactNode } from 'react'
import { useWebSocket } from '@/store/useWebSocket'
import { useAppStore } from '@/store/useAppStore'

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const userId = useAppStore((state) => state.settings.userId)
  useWebSocket(userId, true)

  return <>{children}</>
}
