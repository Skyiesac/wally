import { InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const controlId = id ?? generatedId
    const errorId = `${controlId}-error`

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={controlId} className="block text-sm font-medium text-clay-800">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 border-earth-200 bg-white/80',
            'focus:outline-none focus:border-clay-400 focus:ring-4 focus:ring-clay-100',
            'transition-all duration-200',
            'text-ink-900 placeholder:text-ink-400',
            'shadow-sm hover:shadow-md',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-100',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
