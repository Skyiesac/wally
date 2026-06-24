import { SelectHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
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
        <select
          ref={ref}
          id={controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 border-earth-200 bg-white/80',
            'focus:outline-none focus:border-clay-400 focus:ring-4 focus:ring-clay-100',
            'transition-all duration-200',
            'text-ink-900',
            'shadow-sm hover:shadow-md',
            'cursor-pointer',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-100',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
