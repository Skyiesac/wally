import { TextareaHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
        <textarea
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
            'resize-none',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-100',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
