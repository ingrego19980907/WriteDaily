import { useId, useRef, useState, type FormEvent } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { createPortal } from 'react-dom'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal, type ModalProps } from '../../components/ui/Modal'
import {
  bookErrorCode,
  bookValidationIssues,
  createBook,
  getBook,
  setCover,
  updateBook,
} from '../../services/books'
import {
  validateBookDetails,
  type Book,
  type BookValidationIssue,
} from './book'
import { CoverDraftPreview } from './CoverDraftPreview'
import { CoverPicker } from './CoverPicker'
import { coverFileError } from './cover-file'
import './create-book.css'

const empty = {
  title: '',
  targetWordCount: '',
  dailyWordGoal: '',
  deadline: '',
}
const copy = en.library

function fields(book?: Book) {
  return book
    ? {
        title: book.title,
        targetWordCount: book.targetWordCount?.toString() ?? '',
        dailyWordGoal: book.dailyWordGoal?.toString() ?? '',
        deadline: book.deadline ?? '',
      }
    : empty
}

export function BookDetailsDialog({
  book,
  onSaved,
  onCloseAutoFocus,
  trigger,
  additionalTriggerTarget,
}: {
  book?: Book
  onSaved?: (book: Book) => void
  onCloseAutoFocus?: ModalProps['onCloseAutoFocus']
  trigger?: ModalProps['trigger']
  additionalTriggerTarget?: HTMLDivElement | null
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(() => fields(book))
  const [snapshot, setSnapshot] = useState(book)
  const [issues, setIssues] = useState<BookValidationIssue[]>([])
  const [failure, setFailure] = useState('')
  const [saved, setSaved] = useState('')
  const [pending, setPending] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [reloading, setReloading] = useState(false)
  const inFlight = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const coverId = useId()
  const coverInput = useRef<HTMLInputElement>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverFailure, setCoverFailure] = useState('')
  // A cover is a separate existing commit. Keep its book identity for safe retries.
  const [createdBook, setCreatedBook] = useState<Book | null>(null)
  const [cleanupPending, setCleanupPending] = useState(false)
  const additionalTrigger = useRef<HTMLButtonElement | null>(null)

  function finish(committed: Book) {
    setSaved(committed.title)
    setValues(snapshot ? fields(committed) : empty)
    if (snapshot) setSnapshot(committed)
    setCreatedBook(null)
    setCoverFile(null)
    setCoverFailure('')
    if (coverInput.current) coverInput.current.value = ''
    setOpen(false)
    onSaved?.(committed)
  }

  async function replaceDraft() {
    if (!snapshot || inFlight.current) return
    inFlight.current = true
    setReloading(true)
    setPending(true)
    try {
      const latest = await getBook(snapshot.id)
      setSnapshot(latest)
      setValues(fields(latest))
      setIssues([])
      setConflict(false)
      setFailure('')
    } catch (error) {
      setFailure(
        bookErrorCode(error) === 'not_found'
          ? copy.missing
          : copy.reloadFailure,
      )
    } finally {
      inFlight.current = false
      setPending(false)
      setReloading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || conflict) return
    const count = (value: string) =>
      value.trim() === ''
        ? null
        : /^\d+$/.test(value.trim())
          ? Number(value)
          : NaN
    const result = validateBookDetails({
      ...values,
      targetWordCount: count(values.targetWordCount),
      dailyWordGoal: count(values.dailyWordGoal),
      deadline: formRef.current?.querySelector<HTMLInputElement>(
        '[name="deadline"]',
      )?.validity.badInput
        ? 'invalid'
        : values.deadline || null,
    })
    setFailure('')
    setSaved('')
    setCleanupPending(false)
    if (!result.success) {
      setIssues(result.issues)
      const field = result.issues[0]?.field
      formRef.current
        ?.querySelector<HTMLInputElement>(`[name="${field}"]`)
        ?.focus()
      return
    }
    setIssues([])
    if (!snapshot && coverFileError(coverFile)) {
      setCoverFailure(coverFileError(coverFile))
      coverInput.current?.focus()
      return
    }
    inFlight.current = true
    setPending(true)
    try {
      let committed =
        createdBook ??
        (snapshot
          ? await updateBook(snapshot.id, snapshot.updatedAt, result.data)
          : await createBook(result.data))
      if (!snapshot && coverFile) {
        setCreatedBook(committed)
        setCoverFailure('')
        try {
          const bytes = Array.from(
            new Uint8Array(await coverFile.arrayBuffer()),
          )
          const result = await setCover(
            committed.id,
            committed.updatedAt,
            bytes,
          )
          committed = result.book
          setCleanupPending(result.cleanupPending)
        } catch (error) {
          // Publish the already committed book, never delete it or create it twice.
          if (!createdBook) onSaved?.(committed)
          const code = bookErrorCode(error)
          setCoverFailure(
            code === 'invalid_image'
              ? copy.coverInvalid
              : code === 'image_too_large'
                ? copy.coverTooLarge
                : code === 'conflict' || code === 'not_found'
                  ? copy.createCoverConflict
                  : code === 'desktop_required'
                    ? copy.desktop
                    : copy.coverFailure,
          )
          requestAnimationFrame(() => coverInput.current?.focus())
          return
        }
      }
      finish(committed)
    } catch (error) {
      const code = bookErrorCode(error)
      const nativeIssues = bookValidationIssues(error)
      if (nativeIssues.length) {
        setIssues(nativeIssues)
        requestAnimationFrame(() =>
          formRef.current
            ?.querySelector<HTMLInputElement>(
              `[name="${nativeIssues[0].field}"]`,
            )
            ?.focus(),
        )
        return
      }
      setConflict(code === 'conflict' || code === 'not_found')
      setFailure(
        code === 'desktop_required'
          ? copy.desktop
          : code === 'conflict'
            ? copy.conflict
            : code === 'not_found'
              ? copy.missing
              : snapshot
                ? copy.editFailure
                : copy.failure,
      )
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <>
      {!book &&
        additionalTriggerTarget &&
        createPortal(
          <Button
            className="new-book-button"
            aria-haspopup="dialog"
            onClick={(event) => {
              additionalTrigger.current = event.currentTarget
              setOpen(true)
            }}
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            {copy.createFirstBook}
          </Button>,
          additionalTriggerTarget,
        )}
      <Modal
        className={book ? undefined : 'create-book-modal'}
        onCloseAutoFocus={(event) => {
          const source = additionalTrigger.current
          additionalTrigger.current = null
          if (source?.isConnected) {
            event.preventDefault()
            source.focus()
          } else onCloseAutoFocus?.(event)
        }}
        open={open}
        onOpenChange={(next) => {
          if (!inFlight.current) setOpen(next)
        }}
        trigger={
          trigger ?? (
            <Button
              variant={book ? 'secondary' : 'primary'}
              className={book ? undefined : 'new-book-button'}
            >
              {!book && (
                <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
              )}
              {book ? copy.edit : copy.newBook}
            </Button>
          )
        }
        title={book ? copy.edit : copy.createTitle}
        description={book ? copy.editDescription : copy.description}
        closeLabel={copy.close}
      >
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            void submit(event)
          }}
          className={book ? 'space-y-4' : 'create-book-form'}
          aria-busy={pending}
        >
          {!book && (
            <div className="create-book-cover">
              <p className="create-book-cover__label">
                {copy.createCoverLabel}
              </p>
              <div className="create-book-cover__preview">
                {coverFile && !coverFileError(coverFile) ? (
                  <CoverDraftPreview file={coverFile} fallback={null} />
                ) : (
                  <div
                    className="create-book-cover__placeholder"
                    aria-hidden="true"
                  >
                    <BookOpen size={32} strokeWidth={1.4} />
                    <span>{values.title.trim() || copy.newBook}</span>
                  </div>
                )}
              </div>
              <p className="create-book-cover__hint">{copy.createCoverHint}</p>
              <CoverPicker
                id={coverId}
                inputRef={coverInput}
                file={coverFile}
                pending={pending}
                failure={coverFailure}
                invalid={
                  coverFailure === copy.coverInvalid ||
                  coverFailure === copy.coverTooLarge
                }
                onChange={(file) => {
                  setCoverFile(file)
                  setCoverFailure(coverFileError(file))
                }}
              />
              {coverFile && (
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setCoverFile(null)
                    setCoverFailure('')
                    if (coverInput.current) coverInput.current.value = ''
                  }}
                >
                  {copy.coverRemove}
                </Button>
              )}
              {coverFailure && (
                <p id={`${coverId}-error`} role="alert" className="text-error">
                  {coverFailure}
                </p>
              )}
            </div>
          )}
          <div className={book ? 'space-y-4' : 'create-book-fields'}>
            {createdBook && !pending && (
              <p role="status" className="create-book-partial">
                {copy.createCoverPartial}
              </p>
            )}
            {issues.length > 0 && (
              <p role="alert" className="text-error">
                {copy.validationSummary}
              </p>
            )}
            {(Object.keys(empty) as (keyof typeof empty)[]).map((field) => (
              <Input
                key={field}
                name={field}
                label={
                  field === 'title' && !book
                    ? copy.createBookTitle
                    : copy[field]
                }
                type={field === 'deadline' ? 'date' : 'text'}
                inputMode={
                  field === 'targetWordCount' || field === 'dailyWordGoal'
                    ? 'numeric'
                    : undefined
                }
                required={field === 'title'}
                hint={
                  field === 'title'
                    ? copy.titleHint
                    : field === 'targetWordCount'
                      ? copy.totalGoalHint
                      : field === 'dailyWordGoal'
                        ? copy.dailyGoalHint
                        : field === 'deadline'
                          ? copy.deadlineHint
                          : undefined
                }
                min={field === 'deadline' ? '0001-01-01' : undefined}
                max={field === 'deadline' ? '9999-12-31' : undefined}
                value={values[field]}
                disabled={pending || !!createdBook}
                error={
                  issues.find((issue) => issue.field === field)
                    ? copy.errors[
                        issues.find((issue) => issue.field === field)!.code
                      ]
                    : undefined
                }
                onChange={(event) => {
                  setValues((previous) => ({
                    ...previous,
                    [field]: event.target.value,
                  }))
                  setIssues((previous) =>
                    previous.filter((issue) => issue.field !== field),
                  )
                }}
              />
            ))}
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
                  void replaceDraft()
                }}
              >
                {reloading ? copy.reloading : copy.replaceDraft}
              </Button>
            )}
            <div className={book ? undefined : 'create-book-submit'}>
              {createdBook && (
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => finish(createdBook)}
                >
                  {copy.finishWithoutCover}
                </Button>
              )}
              <Button type="submit" disabled={pending || conflict}>
                {pending
                  ? createdBook
                    ? copy.coverSaving
                    : snapshot
                      ? copy.updating
                      : copy.saving
                  : createdBook
                    ? copy.retryCreateCover
                    : snapshot
                      ? copy.save
                      : copy.create}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      <p role="status" className={book ? undefined : 'create-book-status'}>
        {saved ? `${book ? copy.updated : copy.saved} ${saved}` : ''}
        {saved && cleanupPending ? ` ${copy.coverCleanupPending}` : ''}
      </p>
    </>
  )
}
