import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          ref={ref}
          {...props}
        />
        {helperText && !error && (
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
