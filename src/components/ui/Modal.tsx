import type { ReactElement, ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './Button'
import './modal.css'

export type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement
  title: string
  description?: string
  closeLabel: string
  children: ReactNode
}

export function Modal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  closeLabel,
  children,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-content"
          {...(!description ? { 'aria-describedby': undefined } : {})}
        >
          <div className="modal-header">
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" className="shrink-0">
                {closeLabel}
              </Button>
            </Dialog.Close>
          </div>
          <div className="modal-body">
            {description && (
              <Dialog.Description className="text-secondary">
                {description}
              </Dialog.Description>
            )}
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
