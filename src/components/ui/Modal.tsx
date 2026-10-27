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
  size?: 'default' | 'large'
  fullScreen?: boolean
  headerCenter?: ReactNode
  footer?: ReactNode
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
  size = 'default',
  headerActions,
  headerCenter,
  footer,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={onEscapeKeyDown}
          className={`modal-content${size === 'large' ? ' modal-content--large' : ''}${fullScreen ? ' modal-content--fullscreen' : ''}`}
          {...(!description ? { 'aria-describedby': undefined } : {})}
        >
          <div
            className={`modal-header${headerCenter ? ' modal-header--centered' : ''}`}
          >
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            {headerCenter}
            <div className="modal-header-actions">
              {headerActions}
              <Dialog.Close asChild>
                <Button variant="ghost" className="shrink-0">
                  {closeLabel}
                </Button>
              </Dialog.Close>
            </div>
          </div>
          <div className="modal-body">
            {description && (
              <Dialog.Description className="text-secondary">
                {description}
              </Dialog.Description>
            )}
            {children}
          </div>
          {footer}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
