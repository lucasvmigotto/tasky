import { type ReactNode } from 'react'
import { type FieldError } from 'react-hook-form'
import { cn } from '@/shared/lib/cn'

export interface FormFieldProps {
  label: string
  error?: FieldError | string
  children: ReactNode
  className?: string
  required?: boolean
}

function FormField({ label, error, children, className, required }: FormFieldProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  )
}
FormField.displayName = 'FormField'

export { FormField }
