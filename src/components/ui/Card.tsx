import type { ComponentPropsWithRef } from 'react'
import './card.css'

export type CardProps = ComponentPropsWithRef<'div'>

export function Card({ className = '', ...props }: CardProps) {
  return <div {...props} className={`card ${className}`.trim()} />
}
