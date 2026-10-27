import { useEffect, useState, type ComponentProps } from 'react'
import { listChapters } from '../../services/chapters'
import { BookCard } from './BookCard'
import { aggregateBookWordCount } from './book-word-count'

/** Counts are derived from a validated native chapter-list snapshot, never live drafts. */
export function CountedBookCard({
  active,
  countsVersion,
  ...props
}: Omit<ComponentProps<typeof BookCard>, 'wordCount'> & {
  active: boolean
  countsVersion: number
}) {
  const [snapshot, setSnapshot] = useState<{
    bookId: string
    version: number
    count: number | null
  } | null>(null)
  const bookId = props.book.id
  useEffect(() => {
    if (!active) return
    let current = true
    void listChapters(bookId).then(
      (chapters) => {
        if (current)
          setSnapshot({
            bookId,
            version: countsVersion,
            count: aggregateBookWordCount(bookId, chapters),
          })
      },
      () => {
        if (current)
          setSnapshot({ bookId, version: countsVersion, count: null })
      },
    )
    return () => {
      current = false
    }
  }, [bookId, countsVersion, active])
  const wordCount =
    snapshot?.bookId === bookId && snapshot.version === countsVersion
      ? snapshot.count
      : null
  return <BookCard {...props} wordCount={wordCount} />
}
