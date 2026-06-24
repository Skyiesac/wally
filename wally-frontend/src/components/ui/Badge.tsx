import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { BUILD_STATUS_COLORS } from '@/lib/constants'
import type { BuildStatus } from '@/lib/api/types'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | BuildStatus
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-earth-100 text-earth-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    ...BUILD_STATUS_COLORS,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
