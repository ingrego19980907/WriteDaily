import { useEffect, useId, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import type { ModalProps } from '../../components/ui/Modal'
import { BookDetailsDialog } from './BookDetailsDialog'
import { DeleteBook } from './DeleteBook'
import { BookCoverDialog } from './BookCoverDialog'
import type { Book } from './book'

const copy = en.library

export function BookActions({
  book,
  onSaved,
  onDeleted,
}: {
  book: Book
  onSaved: (book: Book) => void
  onDeleted: (book: Book, cleanupPending?: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const outside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  const restoreFocus: ModalProps['onCloseAutoFocus'] = (event) => {
    if (trigger.current?.isConnected) {
      event.preventDefault()
      trigger.current.focus()
    }
  }
  return (
    <>
      <div ref={root} className="book-card__menu">
        <Button
          ref={trigger}
          variant="secondary"
          className="book-card__menu-toggle"
          aria-label={copy.actions}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setNotice('')
            setOpen((current) => !current)
          }}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="currentColor"
          >
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </Button>
        <div
          ref={panel}
          id={id}
          hidden={!open}
          role="group"
          aria-label={copy.actions}
          className="book-card__menu-panel"
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              panel.current?.contains(event.target)
            )
              setOpen(false)
          }}
          onKeyDown={(event) => {
            if (
              !open ||
              !panel.current?.contains(event.target as Node) ||
              !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
            )
              return
            const buttons = [
              ...panel.current.querySelectorAll<HTMLElement>(
                ':scope > button:not(:disabled)',
              ),
            ]
            const index = buttons.indexOf(document.activeElement as HTMLElement)
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (index +
                      (event.key === 'ArrowDown' ? 1 : -1) +
                      buttons.length) %
                    buttons.length
            event.preventDefault()
            buttons[next]?.focus()
          }}
        >
          <BookDetailsDialog
            book={book}
            onSaved={(updated) => {
              setNotice(`${copy.updated} ${updated.title}`)
              onSaved(updated)
            }}
            onCloseAutoFocus={restoreFocus}
          />
          <BookCoverDialog
            book={book}
            onSaved={onSaved}
            onCloseAutoFocus={restoreFocus}
          />
          <DeleteBook
            book={book}
            onDeleted={onDeleted}
            onCloseAutoFocus={restoreFocus}
          />
        </div>
      </div>
      <p role="status" className="sr-only">
        {notice}
      </p>
    </>
  )
}
