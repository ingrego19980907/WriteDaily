import { useRef, useState, type FormEvent } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal, type ModalProps } from '../../components/ui/Modal'
import {
  bookErrorCode,
  bookValidationIssues,
  createBook,
  getBook,
  updateBook,
} from '../../services/books'
import {
  validateBookDetails,
  type Book,
  type BookValidationIssue,
} from './book'

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
}: {
  book?: Book
  onSaved?: (book: Book) => void
  onCloseAutoFocus?: ModalProps['onCloseAutoFocus']
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
    if (!result.success) {
      setIssues(result.issues)
      const field = result.issues[0]?.field
      formRef.current
        ?.querySelector<HTMLInputElement>(`[name="${field}"]`)
        ?.focus()
      return
    }
    setIssues([])
    inFlight.current = true
    setPending(true)
    try {
      const committed = snapshot
        ? await updateBook(snapshot.id, snapshot.updatedAt, result.data)
        : await createBook(result.data)
      setSaved(committed.title)
      setValues(snapshot ? fields(committed) : empty)
      if (snapshot) setSnapshot(committed)
      setOpen(false)
      onSaved?.(committed)
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
      <Modal
        onCloseAutoFocus={onCloseAutoFocus}
        open={open}
        onOpenChange={(next) => {
          if (!inFlight.current) setOpen(next)
        }}
        trigger={
          <Button variant={book ? 'secondary' : 'primary'}>
            {book ? copy.edit : copy.create}
          </Button>
        }
        title={book ? copy.edit : copy.create}
        description={book ? copy.editDescription : copy.description}
        closeLabel={copy.close}
      >
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            void submit(event)
          }}
          className="space-y-4"
          aria-busy={pending}
        >
          {issues.length > 0 && (
            <p role="alert" className="text-error">
              {copy.validationSummary}
            </p>
          )}
          {(Object.keys(empty) as (keyof typeof empty)[]).map((field) => (
            <Input
              key={field}
              name={field}
              label={copy[field]}
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
                  : field === 'dailyWordGoal'
                    ? copy.dailyGoalHint
                    : undefined
              }
              value={values[field]}
              disabled={pending}
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
          <Button type="submit" disabled={pending || conflict}>
            {pending
              ? snapshot
                ? copy.updating
                : copy.saving
              : snapshot
                ? copy.save
                : copy.create}
          </Button>
        </form>
      </Modal>
      <p role="status">
        {saved ? `${book ? copy.updated : copy.saved} ${saved}` : ''}
      </p>
    </>
  )
}
