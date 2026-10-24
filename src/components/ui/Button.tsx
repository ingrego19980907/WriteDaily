import type { ComponentPropsWithRef } from 'react'
import './button.css'

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-variant={variant}
      className={`button ${className}`.trim()}
    />
  )
}
