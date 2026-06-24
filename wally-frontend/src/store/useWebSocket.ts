'use client'

import { useCallback, useEffect, useRef } from 'react'
import { WS_BASE_URL } from '@/lib/constants'
import type { WSMessage } from '@/lib/api/types'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/hooks'
import { useAppStore } from './useAppStore'

const RECONNECT_DELAY_MS = 3000

export function useWebSocket(userId: string, enabled = true) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()
  const setBuildStatus = useAppStore((state) => state.setBuildStatus)

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    if (ws.current) {
      // Null out onclose so a manual close doesn't trigger reconnection
      ws.current.onclose = null
      ws.current.close()
      ws.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!enabled || !userId) return
    // Avoid stacking sockets if a connection is already open/pending
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    const socket = new WebSocket(`${WS_BASE_URL}/ws?user_id=${encodeURIComponent(userId)}`)
    ws.current = socket

    socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'build_started':
            setBuildStatus('BUILDING')
            queryClient.invalidateQueries({ queryKey: queryKeys.build(message.build_id) })
            break

          case 'build_complete':
            setBuildStatus('SUCCESS')
            queryClient.invalidateQueries({ queryKey: queryKeys.build(message.build_id) })
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('Build Complete!', {
                  body: 'Your APK is ready to download',
                })
              }
            }
            break

          case 'build_failed':
            setBuildStatus('FAILED')
            queryClient.invalidateQueries({ queryKey: queryKeys.build(message.build_id) })
            break
        }
      } catch {
        // Ignore malformed messages; the server only sends valid JSON
      }
    }

    socket.onerror = () => {
      // onerror is followed by onclose, which handles the reconnect
    }

    socket.onclose = () => {
      if (ws.current === socket) ws.current = null
      if (enabled) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }
  }, [userId, enabled, queryClient, setBuildStatus])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // Request notification permission once on first load
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }
  }, [])

  return { connect, disconnect }
}
