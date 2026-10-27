import { useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Modal, type ModalProps } from '../../components/ui/Modal'
import { BookCover } from './BookCover'
import type { Book } from './book'

const copy = en.library

export function BookCoverDialog({
  book,
  onSaved,
  onCloseAutoFocus,
}: {
  book: Book
  onSaved: (book: Book) => void
  onCloseAutoFocus?: ModalProps['onCloseAutoFocus']
}) {
  const [open, setOpen] = useState(false)
  const pending = useRef(false)
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!pending.current) setOpen(next)
      }}
      onCloseAutoFocus={onCloseAutoFocus}
      trigger={<Button variant="secondary">{copy.manageCover}</Button>}
      title={copy.manageCover}
      closeLabel={copy.close}
    >
      <BookCover
        book={book}
        onSaved={onSaved}
        onPendingChange={(value) => {
          pending.current = value
        }}
      />
    </Modal>
  )
}
