import { useRef, useState, type FormEvent } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  createChapter,
  getChapter,
  renameChapter,
} from '../../services/chapters'
import {
  validateChapterDetails,
  type ChapterSummary,
  type ChapterDetailsIssue,
} from './chapter'
import {
  chapterErrorCode,
  chapterFailure,
  chapterTitleError,
} from './chapter-errors'

const copy = en.chapters

export function ChapterTitleDialog({
  bookId,
  chapter,
  disabled,
  onPending,
  onSaved,
  onCommittedClose,
}: {
  bookId: string
  chapter?: ChapterSummary
  disabled: boolean
  onPending: (pending: boolean) => void
  onSaved: (chapter: ChapterSummary, created: boolean) => void
  onCommittedClose: () => void
}) {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState(chapter)
  const [title, setTitle] = useState(chapter?.title ?? '')
  const [issue, setIssue] = useState<ChapterDetailsIssue['code'] | null>(null)
  const [failure, setFailure] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [pending, setPending] = useState(false)
  const [reloading, setReloading] = useState(false)
  const inFlight = useRef(false)
  const committedClose = useRef(false)
  const input = useRef<HTMLInputElement>(null)

  function busy(next: boolean) {
    inFlight.current = next
    setPending(next)
    onPending(next)
  }

  async function reload() {
    if (!snapshot || inFlight.current) return
    busy(true)
    setReloading(true)
    try {
      const current = await getChapter(bookId, snapshot.id)
      setSnapshot(current)
      // Explicitly advance only the token; never replace an unsaved title draft.
      setBlocked(false)
      setConflict(false)
      setFailure('')
      requestAnimationFrame(() => input.current?.focus())
    } catch (error) {
      setFailure(chapterFailure(error, copy.reloadFailure))
    } finally {
      busy(false)
      setReloading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || blocked || disabled) return
    const result = validateChapterDetails({ title })
    setFailure('')
    if (!result.success) {
      setIssue(result.issues[0].code)
      input.current?.focus()
      return
    }
    setIssue(null)
    busy(true)
    try {
      const committed = snapshot
        ? await renameChapter(bookId, snapshot.id, {
            expectedRevision: snapshot.revision,
            details: result.data,
          })
        : await createChapter(bookId, result.data)
      setSnapshot(chapter ? committed : undefined)
      setTitle(chapter ? committed.title : '')
      committedClose.current = true
      setOpen(false)
      onSaved(committed, !chapter)
    } catch (error) {
      const nativeIssue = chapterTitleError(error)
      if (nativeIssue) {
        setIssue(nativeIssue)
        requestAnimationFrame(() => input.current?.focus())
      } else {
        const code = chapterErrorCode(error)
        setConflict(code === 'conflict')
        setBlocked(
          [
            'conflict',
            'not_found',
            'invalid_stored_data',
            'limit_reached',
          ].includes(String(code)),
        )
        setFailure(
          code === 'conflict'
            ? copy.conflict
            : chapterFailure(
                error,
                chapter ? copy.renameFailure : copy.createFailure,
              ),
        )
      }
    } finally {
      busy(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (inFlight.current) return
        if (
          next &&
          chapter &&
          title === snapshot?.title &&
          (!blocked || chapter.revision !== snapshot?.revision)
        ) {
          setSnapshot(chapter)
          setTitle(chapter.title)
          setIssue(null)
          setBlocked(false)
          setFailure('')
        }
        setOpen(next)
      }}
      onCloseAutoFocus={(event) => {
        if (committedClose.current) {
          event.preventDefault()
          committedClose.current = false
          onCommittedClose()
        }
      }}
      trigger={
        <Button variant={chapter ? 'secondary' : 'primary'} disabled={disabled}>
          {chapter ? copy.rename : copy.create}
        </Button>
      }
      title={chapter ? copy.rename : copy.create}
      description={chapter ? copy.renameDescription : copy.createDescription}
      closeLabel={copy.close}
    >
      <form
        noValidate
        aria-busy={pending}
        className="space-y-4"
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        {issue && (
          <p role="alert" className="text-error">
            {copy.validationSummary}
          </p>
        )}
        <Input
          ref={input}
          name="title"
          label={copy.title}
          hint={copy.titleHint}
          required
          value={title}
          disabled={pending}
          error={issue ? copy.errors[issue] : undefined}
          onChange={(event) => {
            setTitle(event.target.value)
            setIssue(null)
          }}
        />
        <p className="text-secondary">{copy.draft}</p>
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
            {reloading ? copy.reloading : copy.reload}
          </Button>
        )}
        <Button type="submit" disabled={pending || blocked || disabled}>
          {pending
            ? snapshot
              ? copy.saving
              : copy.creating
            : chapter
              ? copy.save
              : copy.create}
        </Button>
      </form>
    </Modal>
  )
}
