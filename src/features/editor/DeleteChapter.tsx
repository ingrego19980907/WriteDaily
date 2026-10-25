import { useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { deleteChapter, getChapter } from '../../services/chapters'
import type { ChapterSummary } from './chapter'
import { chapterErrorCode, chapterFailure } from './chapter-errors'

const copy = en.chapters

export function DeleteChapter({
  bookId,
  chapter,
  disabled,
  onPending,
  onDeleted,
  onCommittedClose,
}: {
  bookId: string
  chapter: ChapterSummary
  disabled: boolean
  onPending: (pending: boolean) => void
  onDeleted: (remaining: ChapterSummary[], deleted: ChapterSummary) => void
  onCommittedClose: () => void
}) {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState(chapter)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [failure, setFailure] = useState('')
  const inFlight = useRef(false)
  const committedClose = useRef(false)
  const acknowledgement = useRef<HTMLInputElement>(null)
  function busy(next: boolean) {
    inFlight.current = next
    setPending(next)
    onPending(next)
  }
  function changeOpen(next: boolean) {
    if (inFlight.current) return
    if (next) {
      setSnapshot(chapter)
      setConfirmed(false)
      setBlocked(false)
      setConflict(false)
      setFailure('')
    }
    setOpen(next)
  }
  async function reload() {
    if (inFlight.current) return
    busy(true)
    setReloading(true)
    try {
      const current = await getChapter(bookId, snapshot.id)
      setSnapshot(current)
      setConfirmed(false)
      setBlocked(false)
      setConflict(false)
      setFailure('')
      requestAnimationFrame(() => acknowledgement.current?.focus())
    } catch (error) {
      setFailure(chapterFailure(error, copy.reloadFailure))
    } finally {
      busy(false)
      setReloading(false)
    }
  }
  async function remove() {
    if (!confirmed || blocked || inFlight.current || disabled) return
    busy(true)
    setFailure('')
    try {
      const remaining = await deleteChapter(
        bookId,
        snapshot.id,
        snapshot.revision,
      )
      committedClose.current = true
      setOpen(false)
      onDeleted(remaining, snapshot)
    } catch (error) {
      const code = chapterErrorCode(error)
      setConfirmed(false)
      setBlocked(
        [
          'conflict',
          'not_found',
          'invalid_stored_data',
          'limit_reached',
        ].includes(String(code)),
      )
      setConflict(code === 'conflict')
      setFailure(
        code === 'conflict'
          ? copy.deleteConflict
          : chapterFailure(error, copy.deleteFailure),
      )
    } finally {
      busy(false)
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={changeOpen}
      onCloseAutoFocus={(event) => {
        if (committedClose.current) {
          event.preventDefault()
          committedClose.current = false
          onCommittedClose()
        }
      }}
      trigger={
        <Button variant="secondary" disabled={disabled}>
          {copy.delete}
        </Button>
      }
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
            ref={acknowledgement}
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
            {reloading ? copy.reloading : copy.reloadDelete}
          </Button>
        )}
        <Button
          disabled={!confirmed || pending || blocked || disabled}
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
