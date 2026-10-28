import { useEffect, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { bookErrorCode, listBooks } from '../../services/books'
import type { Book } from '../library/book'

const copy = en.editorEntry
export function EditorBookPicker({
  onOpenBook,
  openingId,
  openFailure,
  onCancelOpen,
}: {
  onOpenBook: (book: Book) => void
  openingId: string | null
  openFailure: string
  onCancelOpen: () => void
}) {
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<{
    version: number
    books: Book[]
    error?: string
  } | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    let current = true
    void listBooks().then(
      (books) => {
        if (current) setResult({ version, books })
      },
      (error) => {
        if (current)
          setResult({
            version,
            books: [],
            error:
              bookErrorCode(error) === 'desktop_required'
                ? copy.desktop
                : copy.failure,
          })
      },
    )
    return () => {
      current = false
    }
  }, [version])
  const loading = result?.version !== version
  const failure = !loading ? result?.error : undefined
  const books = result?.books ?? []
  const selected = books.find((book) => book.id === selectedId)
  const feedback = (
    <>
      {loading && <p role="status">{en.library.loading}</p>}
      {failure && <p role="alert">{failure}</p>}
      {!loading && !failure && books.length === 0 && <p>{copy.empty}</p>}
    </>
  )
  return (
    <Card className="space-y-3 min-w-0 break-words">
      <h2 ref={heading} tabIndex={-1} className="font-writing text-writing">
        {copy.title}
      </h2>
      <p className="text-secondary">{copy.hint}</p>
      {!open && feedback}
      {(open || (!failure && books.length > 0)) && (
        <Modal
          open={open}
          onOpenChange={(value) => {
            setOpen(value)
            onCancelOpen()
            if (value) {
              setSelectedId('')
              setVersion((value) => value + 1)
            }
          }}
          trigger={
            <Button ref={trigger} disabled={loading}>
              {copy.start}
            </Button>
          }
          title={copy.choose}
          closeLabel={en.library.close}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (trigger.current?.isConnected && !trigger.current.disabled)
              trigger.current.focus()
            else heading.current?.focus()
          }}
        >
          <div className="space-y-4 min-w-0">
            {feedback}
            {!loading && !failure && books.length > 0 && (
              <div className="space-y-2">
                <label
                  htmlFor="editor-book-choice"
                  className="block font-semibold"
                >
                  {copy.book}
                </label>
                <select
                  id="editor-book-choice"
                  value={selected?.id ?? ''}
                  disabled={openingId !== null}
                  className="w-full min-w-0 rounded-control border border-border bg-surface p-3"
                  onChange={(event) => {
                    setSelectedId(event.target.value)
                    onCancelOpen()
                  }}
                >
                  <option value="">{copy.placeholder}</option>
                  {books.map((book, index) => (
                    <option key={book.id} value={book.id}>
                      {copy.option(book.title, index + 1)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {openFailure && <p role="alert">{openFailure}</p>}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  loading || !!failure || !selected || openingId !== null
                }
                onClick={() => {
                  if (selected) onOpenBook(selected)
                }}
              >
                {openingId ? en.library.opening : copy.open}
              </Button>
              <Button
                variant="secondary"
                disabled={loading || openingId !== null}
                onClick={() => {
                  onCancelOpen()
                  setVersion((value) => value + 1)
                }}
              >
                {copy.reload}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {!open && failure && (
        <Button
          variant="secondary"
          onClick={() => setVersion((value) => value + 1)}
        >
          {en.library.retry}
        </Button>
      )}
    </Card>
  )
}
