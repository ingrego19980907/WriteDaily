import { CoverImage } from './CoverImage'
import { CoverDraftPreview } from './CoverDraftPreview'
import './book-card.css'
import { useId, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { bookErrorCode, getBook, setCover } from '../../services/books'
import type { Book } from './book'

const copy = en.library
const MAX_BYTES = 5 * 1024 * 1024

export function BookCover({
  book,
  onSaved,
  showPreview = true,
  onPendingChange,
}: {
  onPendingChange?: (pending: boolean) => void
  showPreview?: boolean
  book: Book
  onSaved: (book: Book) => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState('')
  const [conflict, setConflict] = useState(false)
  const [status, setStatus] = useState('')
  async function save(remove = false) {
    if (inFlight.current || conflict || (!remove && !file)) return
    if (!remove && file && (file.size === 0 || file.size > MAX_BYTES)) {
      setFailure(file.size === 0 ? copy.coverInvalid : copy.coverTooLarge)
      return
    }
    inFlight.current = true
    onPendingChange?.(true)
    setPending(true)
    setFailure('')
    setStatus('')
    try {
      const bytes = remove
        ? null
        : Array.from(new Uint8Array(await file!.arrayBuffer()))
      const result = await setCover(book.id, book.updatedAt, bytes)
      onSaved(result.book)
      setFile(null)
      if (input.current) input.current.value = ''
      setStatus(
        `${remove ? copy.coverRemoved : copy.coverSaved}${result.cleanupPending ? ` ${copy.coverCleanupPending}` : ''}`,
      )
    } catch (error) {
      const code = bookErrorCode(error)
      setConflict(code === 'conflict' || code === 'not_found')
      setFailure(
        code === 'invalid_image'
          ? copy.coverInvalid
          : code === 'image_too_large'
            ? copy.coverTooLarge
            : code === 'conflict' || code === 'not_found'
              ? copy.coverConflict
              : code === 'desktop_required'
                ? copy.desktop
                : copy.coverFailure,
      )
    } finally {
      inFlight.current = false
      onPendingChange?.(false)
      setPending(false)
    }
  }

  async function reload() {
    if (inFlight.current) return
    inFlight.current = true
    onPendingChange?.(true)
    setPending(true)
    try {
      onSaved(await getBook(book.id))
      setConflict(false)
      setFailure('')
    } catch {
      setFailure(copy.coverConflict)
    } finally {
      inFlight.current = false
      onPendingChange?.(false)
      setPending(false)
    }
  }

  return (
    <div className="book-cover-controls space-y-2" aria-busy={pending}>
      <p role="status" aria-atomic="true" className="cover-status">
        {status && (
          <>
            <svg
              className="cover-status__icon"
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 20 20"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="10" cy="10" r="8" />
              <path d="m6 10 2.5 2.5L14 7" />
            </svg>
            <span>{status}</span>
          </>
        )}
      </p>
      {showPreview &&
        (file &&
        file.size > 0 &&
        file.size <= MAX_BYTES &&
        ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ? (
          <CoverDraftPreview
            file={file}
            fallback={book.coverPath ? <CoverImage book={book} /> : null}
          />
        ) : book.coverPath ? (
          <CoverImage book={book} />
        ) : null)}
      <label htmlFor={id} className="cover-picker">
        <svg
          className="cover-picker__icon"
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 32 32"
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 28H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11l7 7v7" />
          <path d="M19 4v7h7M21 24h10M26 19v10" />
        </svg>
        <span className="cover-picker__title">{copy.coverChoose}</span>
        <span id={`${id}-hint`} className="cover-picker__hint">
          {copy.coverHint}
        </span>
        {file && <span className="cover-picker__filename">{file.name}</span>}
        <input
          id={id}
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={pending}
          aria-label={copy.cover}
          aria-describedby={`${id}-hint${failure ? ` ${id}-error` : ''}`}
          aria-invalid={
            failure === copy.coverInvalid || failure === copy.coverTooLarge
              ? true
              : undefined
          }
          className="cover-picker__input"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null)
            setFailure('')
            setStatus('')
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!file || pending || conflict}
          onClick={() => {
            void save()
          }}
        >
          {pending ? copy.coverSaving : copy.coverSave}
        </Button>
        {book.coverPath && (
          <Button
            variant="ghost"
            disabled={pending || conflict}
            onClick={() => {
              void save(true)
            }}
          >
            {copy.coverRemove}
          </Button>
        )}
        {conflict && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              void reload()
            }}
          >
            {copy.coverReload}
          </Button>
        )}
      </div>
      {failure && (
        <p id={`${id}-error`} role="alert" className="text-error">
          {failure}
        </p>
      )}
    </div>
  )
}
