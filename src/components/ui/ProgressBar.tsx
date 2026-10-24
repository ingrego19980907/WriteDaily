import { useId, type ComponentPropsWithRef } from 'react'
import './progress-bar.css'

export type ProgressBarProps = Omit<
  ComponentPropsWithRef<'div'>,
  | 'children'
  | 'role'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-valuemin'
  | 'aria-valuemax'
  | 'aria-valuenow'
> & {
  label: string
  value?: number | null
  max?: number
}

export function ProgressBar({
  label,
  value,
  max = 100,
  id,
  className = '',
  ...props
}: ProgressBarProps) {
  const generatedId = useId()
  const progressId = id ?? generatedId
  const labelId = `${progressId}-label`
  const maximum = Number.isFinite(max) && max > 0 ? max : 100
  const current =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(maximum, Math.max(0, value))
      : undefined

  return (
    <div className="progress-field">
      <p id={labelId} className="progress-field__label">
        {label}
      </p>
      <div
        {...props}
        id={progressId}
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={maximum}
        aria-valuenow={current}
        className={`progress-bar ${className}`.trim()}
      >
        <div
          aria-hidden="true"
          className={
            current === undefined
              ? 'progress-bar__fill progress-bar__fill--indeterminate'
              : 'progress-bar__fill'
          }
          style={
            current === undefined
              ? undefined
              : { width: `${(current / maximum) * 100}%` }
          }
        />
      </div>
    </div>
  )
}
