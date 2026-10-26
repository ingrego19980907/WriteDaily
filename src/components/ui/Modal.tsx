import type { ComponentProps, ReactElement, ReactNode } from 'react'
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
  onCloseAutoFocus?: ComponentProps<typeof Dialog.Content>['onCloseAutoFocus']
  onEscapeKeyDown?: ComponentProps<typeof Dialog.Content>['onEscapeKeyDown']
  fullScreen?: boolean
  headerActions?: ReactNode
}

export function Modal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  closeLabel,
  children,
  onCloseAutoFocus,
  onEscapeKeyDown,
  fullScreen = false,
  headerActions,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={onEscapeKeyDown}
          className={`modal-content${fullScreen ? ' modal-content--fullscreen' : ''}`}
          {...(!description ? { 'aria-describedby': undefined } : {})}
        >
          <div className="modal-header">
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            {headerActions}
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
