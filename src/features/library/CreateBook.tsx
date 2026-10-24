import { useRef, useState, type FormEvent } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { createBook } from '../../services/books'
import { validateBookDetails, type BookValidationIssue } from './book'

const empty = {
  title: '',
  targetWordCount: '',
  dailyWordGoal: '',
  deadline: '',
}
const copy = en.library

export function CreateBook() {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(empty)
  const [issues, setIssues] = useState<BookValidationIssue[]>([])
  const [failure, setFailure] = useState('')
  const [saved, setSaved] = useState('')
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
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
      deadline: values.deadline || null,
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
      const book = await createBook(result.data)
      setSaved(book.title)
      setValues(empty)
      setOpen(false)
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : null
      setFailure(code === 'desktop_required' ? copy.desktop : copy.failure)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!inFlight.current) setOpen(next)
        }}
        trigger={<Button>{copy.create}</Button>}
        title={copy.create}
        description={copy.description}
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
              hint={field === 'title' ? copy.titleHint : undefined}
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
          <Button type="submit" disabled={pending}>
            {pending ? copy.saving : copy.create}
          </Button>
        </form>
      </Modal>
      <p role="status">{saved ? `${copy.saved} ${saved}` : ''}</p>
    </>
  )
}
