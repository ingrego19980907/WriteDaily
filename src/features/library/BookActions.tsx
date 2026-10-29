import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis, ImagePlus, Pencil, Trash2 } from 'lucide-react'
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
  const actionButtons = () => [
    ...(panel.current?.querySelectorAll<HTMLButtonElement>(
      ':scope > button:not(:disabled)',
    ) ?? []),
  ]
  useLayoutEffect(() => {
    if (!open) return
    const position = () => {
      if (!trigger.current || !panel.current) return
      const anchor = trigger.current.getBoundingClientRect()
      const menu = panel.current.getBoundingClientRect()
      const margin = 8
      const below = window.innerHeight - anchor.bottom - margin - 6
      const above = anchor.top - margin - 6
      const top =
        menu.height <= below || below >= above
          ? anchor.bottom + 6
          : anchor.top - menu.height - 6
      panel.current.style.left = `${Math.max(margin, Math.min(anchor.right - menu.width, window.innerWidth - menu.width - margin))}px`
      panel.current.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - menu.height - margin))}px`
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(position)
    if (trigger.current) observer?.observe(trigger.current)
    if (panel.current) observer?.observe(panel.current)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (event: Event) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target) &&
        !panel.current?.contains(event.target)
      )
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
          variant="ghost"
          className="book-card__menu-toggle"
          aria-label={copy.actions}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setNotice('')
            setOpen((current) => !current)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              const last = event.key === 'ArrowUp'
              setOpen(true)
              requestAnimationFrame(() => {
                if (panel.current?.hidden) return
                const buttons = actionButtons()
                buttons[last ? buttons.length - 1 : 0]?.focus()
              })
            } else if (open && event.key === 'Tab') {
              if (event.shiftKey) setOpen(false)
              else {
                event.preventDefault()
                actionButtons()[0]?.focus()
              }
            }
          }}
        >
          <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
      {createPortal(
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
            if (!open) return
            const buttons = actionButtons()
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            )
            if (
              event.key === 'Tab' &&
              ((event.shiftKey && index === 0) ||
                (!event.shiftKey && index === buttons.length - 1))
            ) {
              event.preventDefault()
              setOpen(false)
              const next = event.shiftKey
                ? trigger.current
                : (root.current
                    ?.closest('[role="article"]')
                    ?.querySelector<HTMLElement>('.book-card__title') ??
                  trigger.current)
              next?.focus()
              return
            }
            if (
              !open ||
              !panel.current?.contains(event.target as Node) ||
              !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
            )
              return
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
            trigger={
              <Button variant="ghost" className="book-card__menu-item">
                <Pencil size={17} strokeWidth={1.6} aria-hidden="true" />
                {copy.edit}
              </Button>
            }
            book={book}
            onSaved={(updated) => {
              setNotice(`${copy.updated} ${updated.title}`)
              onSaved(updated)
            }}
            onCloseAutoFocus={restoreFocus}
          />
          <BookCoverDialog
            trigger={
              <Button variant="ghost" className="book-card__menu-item">
                <ImagePlus size={17} strokeWidth={1.6} aria-hidden="true" />
                {copy.manageCover}
              </Button>
            }
            book={book}
            onSaved={onSaved}
            onCloseAutoFocus={restoreFocus}
          />
          <DeleteBook
            trigger={
              <Button
                variant="ghost"
                className="book-card__menu-item book-card__menu-item--danger"
              >
                <Trash2 size={17} strokeWidth={1.6} aria-hidden="true" />
                {copy.delete}
              </Button>
            }
            book={book}
            onDeleted={onDeleted}
            onCloseAutoFocus={restoreFocus}
          />
        </div>,
        document.body,
      )}
      <p role="status" className="sr-only">
        {notice}
      </p>
    </>
  )
}
