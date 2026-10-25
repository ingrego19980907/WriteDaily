import { useEffect, useState } from 'react'
import { en } from '../../app/i18n/en'
import { readCover } from '../../services/books'
import type { Book } from './book'

const copy = en.library
function dataUrl(bytes: number[]) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 4096)
    binary += String.fromCharCode(...bytes.slice(offset, offset + 4096))
  return `data:image/png;base64,${btoa(binary)}`
}

export function CoverImage({ book }: { book: Book }) {
  const [image, setImage] = useState<{
    id: string
    path: string
    url: string | null
  } | null>(null)
  useEffect(() => {
    let active = true
    const path = book.coverPath
    if (path)
      void readCover(book.id, path).then(
        (bytes) => {
          if (active) setImage({ id: book.id, path, url: dataUrl(bytes) })
        },
        () => {
          if (active) setImage({ id: book.id, path, url: null })
        },
      )
    return () => {
      active = false
    }
  }, [book.id, book.coverPath])
  const loaded =
    image?.id === book.id && image.path === book.coverPath ? image : null
  const text = !book.coverPath
    ? copy.noCover
    : !loaded
      ? copy.coverLoading
      : copy.coverReadFailure
  return (
    <div
      className={
        loaded?.url && book.coverPath
          ? 'book-cover-image'
          : 'book-cover-image book-cover-image--placeholder'
      }
    >
      {loaded?.url && book.coverPath ? (
        <img
          src={loaded.url}
          alt={copy.coverAlt}
          onError={() =>
            setImage({ id: book.id, path: book.coverPath!, url: null })
          }
        />
      ) : (
        <div className="book-cover-placeholder">
          <svg
            width="48"
            height="56"
            viewBox="0 0 48 56"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 6h25v40H12a6 6 0 0 0 0 8h25M12 6a6 6 0 0 0-6 6v36a6 6 0 0 0 6 6M15 6v40M22 17h9M22 24h9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p role={book.coverPath ? (loaded ? 'alert' : 'status') : undefined}>
            {text}
          </p>
        </div>
      )}
    </div>
  )
}
