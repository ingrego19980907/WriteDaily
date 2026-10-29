import { useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Modal, type ModalProps } from '../../components/ui/Modal'
import { bookErrorCode, deleteBook, getBook } from '../../services/books'
import type { Book } from './book'

const copy = en.library

export function DeleteBook({
  book,
  onDeleted,
  onCloseAutoFocus,
  trigger,
}: {
  book: Book
  onDeleted: (book: Book, cleanupPending?: boolean) => void
  onCloseAutoFocus?: ModalProps['onCloseAutoFocus']
  trigger?: ModalProps['trigger']
}) {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState(book)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [failure, setFailure] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [conflict, setConflict] = useState(false)
  const inFlight = useRef(false)

  function changeOpen(next: boolean) {
    if (inFlight.current) return
    if (next) {
      setSnapshot(book)
      setConfirmed(false)
      setFailure('')
      setBlocked(false)
      setConflict(false)
    }
    setOpen(next)
  }

  async function reload() {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setReloading(true)
    try {
      const latest = await getBook(snapshot.id)
      setSnapshot(latest)
      setConfirmed(false)
      setFailure('')
      setBlocked(false)
      setConflict(false)
    } catch {
      setFailure(copy.deleteReloadFailure)
    } finally {
      inFlight.current = false
      setPending(false)
      setReloading(false)
    }
  }

  async function remove() {
    if (!confirmed || blocked || inFlight.current) return
    inFlight.current = true
    setPending(true)
    setFailure('')
    try {
      const result = await deleteBook(snapshot.id, snapshot.updatedAt)
      setOpen(false)
      if (result?.cleanupPending) onDeleted(snapshot, true)
      else onDeleted(snapshot)
    } catch (error) {
      const code = bookErrorCode(error)
      setBlocked(
        code === 'conflict' ||
          code === 'not_found' ||
          code === 'cover_cleanup_required',
      )
      setConflict(code === 'conflict')
      setConfirmed(false)
      setFailure(
        code === 'conflict'
          ? copy.deleteConflict
          : code === 'not_found'
            ? copy.deleteMissing
            : code === 'cover_cleanup_required'
              ? copy.deleteCover
              : code === 'desktop_required'
                ? copy.desktop
                : copy.deleteFailure,
      )
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <Modal
      onCloseAutoFocus={onCloseAutoFocus}
      open={open}
      onOpenChange={changeOpen}
      trigger={trigger ?? <Button variant="secondary">{copy.delete}</Button>}
      title={copy.delete}
      description={copy.deleteDescription}
      closeLabel={copy.cancel}
    >
      <div className="space-y-4" aria-busy={pending}>
        <p className="font-writing text-writing break-words">
          {snapshot.title}
        </p>
        <label className="flex items-start gap-3 py-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-accent-strong"
            checked={confirmed}
            disabled={pending || blocked}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          {copy.confirmDelete}
        </label>
        {failure && (
          <p role="alert" className="text-error">
            {failure}
          </p>
        )}
        {conflict && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              void reload()
            }}
          >
            {reloading ? copy.reloading : copy.deleteReload}
          </Button>
        )}
        <Button
          disabled={!confirmed || pending || blocked}
          onClick={() => {
            void remove()
          }}
        >
          {pending && !reloading ? copy.deleting : copy.delete}
        </Button>
      </div>
    </Modal>
  )
}
