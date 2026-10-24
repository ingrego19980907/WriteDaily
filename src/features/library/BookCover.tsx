import { useEffect, useId, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import {
  bookErrorCode,
  getBook,
  readCover,
  setCover,
} from '../../services/books'
import type { Book } from './book'

const copy = en.library
const MAX_BYTES = 5 * 1024 * 1024

function dataUrl(bytes: number[]) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 4096)
    binary += String.fromCharCode(...bytes.slice(offset, offset + 4096))
  return `data:image/png;base64,${btoa(binary)}`
}

export function BookCover({
  book,
  onSaved,
}: {
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
  const [image, setImage] = useState<{
    path: string
    url: string | null
  } | null>(null)

  useEffect(() => {
    let active = true
    const path = book.coverPath
    if (path) {
      void readCover(book.id, path).then(
        (bytes) => {
          if (active) setImage({ path, url: dataUrl(bytes) })
        },
        () => {
          if (active) setImage({ path, url: null })
        },
      )
    }
    return () => {
      active = false
    }
  }, [book.id, book.coverPath])

  async function save(remove = false) {
    if (inFlight.current || conflict || (!remove && !file)) return
    if (!remove && file && (file.size === 0 || file.size > MAX_BYTES)) {
      setFailure(file.size === 0 ? copy.coverInvalid : copy.coverTooLarge)
      return
    }
    inFlight.current = true
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
      setPending(false)
    }
  }

  async function reload() {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    try {
      onSaved(await getBook(book.id))
      setConflict(false)
      setFailure('')
    } catch {
      setFailure(copy.coverConflict)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  const loaded = image?.path === book.coverPath ? image : null
  return (
    <div className="space-y-2" aria-busy={pending}>
      {book.coverPath &&
        (loaded ? (
          loaded.url ? (
            <img
              src={loaded.url}
              alt={copy.coverAlt}
              className="max-h-64 max-w-full rounded-lg object-contain"
            />
          ) : (
            <p role="alert">{copy.coverReadFailure}</p>
          )
        ) : (
          <p role="status">{copy.coverLoading}</p>
        ))}
      <label htmlFor={id} className="block font-semibold">
        {copy.cover}
      </label>
      <p id={`${id}-hint`} className="text-secondary">
        {copy.coverHint}
      </p>
      <input
        id={id}
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={pending}
        aria-describedby={`${id}-hint`}
        className="block min-h-11 w-full min-w-0 max-w-full text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null)
          setFailure('')
          setStatus('')
        }}
      />
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
        <p role="alert" className="text-error">
          {failure}
        </p>
      )}
      <p role="status">{status}</p>
    </div>
  )
}
