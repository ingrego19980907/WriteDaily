import { useId, type ComponentPropsWithRef } from 'react'
import './input.css'

export type InputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'children' | 'type'
> & {
  label: string
  hint?: string
  error?: string
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'search'
    | 'tel'
    | 'url'
    | 'number'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'month'
    | 'week'
}

export function Input({
  label,
  hint,
  error,
  id,
  type = 'text',
  className = '',
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const descriptionIds = [describedBy, hintId, errorId]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="input-field">
      <label htmlFor={inputId} className="input-field__label">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        type={type}
        className={`input ${className}`.trim()}
        aria-describedby={descriptionIds || undefined}
        aria-invalid={error ? true : invalid}
      />
      {hint && (
        <p id={hintId} className="input-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="input-field__error">
          {error}
        </p>
      )}
    </div>
  )
}
