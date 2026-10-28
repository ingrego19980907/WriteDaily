import { BookDeadline } from '../library/BookDeadline'
import { WritingPace } from '../library/WritingPace'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { listChapters, reorderChapters } from '../../services/chapters'
import { ChapterOrderControls } from './ChapterOrderControls'
import type { Book } from '../library/book'
import { BookProgress } from '../library/BookProgress'
import { DailyGoal } from '../library/DailyGoal'
import { aggregateBookWordCount } from '../library/book-word-count'
import type { ChapterSummary } from './chapter'
import { chapterErrorCode, chapterFailure } from './chapter-errors'
import { ChapterTitleDialog } from './ChapterTitleDialog'
import { DeleteChapter } from './DeleteChapter'

const ChapterEditorDialog = lazy(() =>
  import('./ChapterEditorDialog').then((module) => ({
    default: module.ChapterEditorDialog,
  })),
)

const copy = en.chapters

/** Mount with key=book.id so requests and unfinished titles stay book-scoped. */
export function ChapterManager({
  book,
  onBack,
}: {
  book: Book
  onBack: () => void
}) {
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState('')
  const [desktopOnly, setDesktopOnly] = useState(false)
  const [notice, setNotice] = useState('')
  const [orderFailure, setOrderFailure] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const orderPending = useRef(false)
  const request = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const retry = useRef<HTMLButtonElement>(null)

  const load = useCallback(() => {
    const current = ++request.current
    return listChapters(book.id).then(
      (result) => {
        if (current !== request.current) return false
        setChapters(result)
        setLoaded(true)
        setFailure('')
        setOrderFailure('')
        setDesktopOnly(false)
        setLoading(false)
        return true
      },
      (error: unknown) => {
        if (current !== request.current) return false
        setDesktopOnly(chapterErrorCode(error) === 'desktop_required')
        setFailure(
          chapterErrorCode(error) === 'not_found'
            ? copy.missingList
            : chapterFailure(error, copy.loadFailure),
        )
        setLoading(false)
        return false
      },
    )
  }, [book.id])

  useEffect(() => {
    void load()
    return () => {
      request.current += 1
    }
  }, [load])

  const bookWordCount =
    loaded && !loading && !failure
      ? aggregateBookWordCount(book.id, chapters)
      : null
  const disabled = loading || pending || !loaded || Boolean(failure)
  function operationPending(next: boolean) {
    setPending(next)
    if (next) setNotice('')
  }
  async function moveChapter(id: string, targetIndex: number) {
    if (disabled || orderPending.current) return
    const from = chapters.findIndex((chapter) => chapter.id === id)
    if (
      from < 0 ||
      from === targetIndex ||
      targetIndex < 0 ||
      targetIndex >= chapters.length
    )
      return
    const next = [...chapters]
    next.splice(targetIndex, 0, ...next.splice(from, 1))
    orderPending.current = true
    setPending(true)
    setOrderFailure('')
    setNotice(copy.orderSaving)
    const token = ++request.current
    try {
      const committed = await reorderChapters(book.id, {
        expected: chapters.map(({ id, revision }) => ({ id, revision })),
        chapterIds: next.map((chapter) => chapter.id),
      })
      if (token !== request.current) return
      setChapters(committed)
      setNotice(copy.orderSaved)
      // The moved control may become disabled at a boundary; focus its row.
      requestAnimationFrame(() =>
        document.getElementById(`chapter-${id}`)?.focus(),
      )
    } catch (error: unknown) {
      if (token !== request.current) return
      setNotice('')
      setOrderFailure(
        chapterErrorCode(error) === 'conflict'
          ? copy.orderConflict
          : chapterFailure(error, copy.orderFailure),
      )
    } finally {
      orderPending.current = false
      if (token === request.current) setPending(false)
    }
  }
  function saved(chapter: ChapterSummary, created: boolean) {
    setChapters((previous) =>
      created
        ? [...previous, chapter]
        : previous.map((item) => (item.id === chapter.id ? chapter : item)),
    )
    setNotice(
      created ? copy.created(chapter.title) : copy.renamed(chapter.title),
    )
    // Reconcile membership/order after a committed write; a failed read keeps the
    // committed row and blocks further writes until a successful retry.
    setLoading(true)
    void load()
  }

  return (
    <section className="space-y-4" aria-label={book.title}>
      <Card className="space-y-4">
        <h2 className="font-writing text-writing break-words">{book.title}</h2>
        <p className="text-secondary">
          {book.targetWordCount === null
            ? en.library.noTarget
            : en.library.wordTarget(
                new Intl.NumberFormat('en').format(book.targetWordCount),
              )}
        </p>
        <DailyGoal value={book.dailyWordGoal} />
        <BookDeadline
          value={book.deadline}
          completed={book.completedAt !== null}
        />
        <p aria-label={en.library.bookWordCount} className="text-secondary">
          {bookWordCount === null
            ? en.library.wordCountUnavailable
            : en.library.savedBookWords(
                new Intl.NumberFormat('en').format(bookWordCount),
              )}
        </p>
        {book.targetWordCount !== null && bookWordCount !== null && (
          <BookProgress
            wordCount={bookWordCount}
            targetWordCount={book.targetWordCount}
          />
        )}
        <WritingPace
          wordCount={bookWordCount}
          targetWordCount={book.targetWordCount}
          deadline={book.deadline}
          completed={book.completedAt !== null}
        />
        <Button variant="secondary" onClick={onBack}>
          {en.library.backToLibrary}
        </Button>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 ref={heading} tabIndex={-1} className="font-writing text-writing">
          {copy.heading}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <ChapterTitleDialog
            bookId={book.id}
            disabled={disabled}
            onPending={operationPending}
            onSaved={saved}
            onCommittedClose={() => heading.current?.focus()}
          />
          <Button
            variant="ghost"
            className="h-11 w-11 shrink-0 p-2"
            aria-label={copy.refresh}
            title={copy.refresh}
            disabled={loading || pending}
            onClick={() => {
              setLoading(true)
              void load()
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M20 5v5h-5M20 10a8 8 0 1 0-1 8" />
            </svg>
          </Button>
        </div>
      </div>
      {chapters.length > 1 && (
        <p className="text-secondary text-sm">{copy.orderHint}</p>
      )}
      {orderFailure && (
        <p role="alert" className="text-error break-words">
          {orderFailure}
        </p>
      )}
      <p className="text-secondary">{copy.pending}</p>
      <p role="status" className="break-words">
        {notice}
      </p>
      <div aria-busy={loading} className="space-y-4">
        {loading && <p role="status">{copy.loading}</p>}
        {failure && (
          <Card className="space-y-3">
            <p role="alert" className="text-error">
              {failure}
            </p>
            {!desktopOnly && (
              <Button
                ref={retry}
                variant="secondary"
                disabled={loading || pending}
                onClick={() => {
                  setLoading(true)
                  void load().then((success) => {
                    requestAnimationFrame(() => {
                      if (
                        document.activeElement === retry.current ||
                        document.activeElement === document.body
                      ) {
                        if (success) heading.current?.focus()
                        else retry.current?.focus()
                      }
                    })
                  })
                }}
              >
                {copy.retry}
              </Button>
            )}
          </Card>
        )}
        {loaded && !loading && !failure && chapters.length === 0 && (
          <Card>
            <p>{copy.empty}</p>
          </Card>
        )}
        {chapters.length > 0 && (
          <ol aria-label={copy.heading} className="space-y-3">
            {chapters.map((chapter, index) => (
              <li
                key={chapter.id}
                onDragOver={(event) => {
                  if (!disabled && dragging && dragging !== chapter.id) {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDropTarget(chapter.id)
                  }
                }}
                onDrop={(event) => {
                  if (!dragging || disabled) return
                  event.preventDefault()
                  const id = dragging
                  setDragging(null)
                  setDropTarget(null)
                  void moveChapter(id, index)
                }}
                className={
                  dropTarget === chapter.id
                    ? 'outline-2 outline-accent-strong rounded-xl'
                    : ''
                }
              >
                <Card
                  role="group"
                  aria-labelledby={`chapter-${chapter.id}`}
                  className="space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3
                      id={`chapter-${chapter.id}`}
                      tabIndex={-1}
                      className="min-w-0 flex-1 font-writing text-writing break-words"
                    >
                      {chapter.title}
                    </h3>
                    <ChapterOrderControls
                      title={chapter.title}
                      disabled={disabled}
                      first={index === 0}
                      last={index === chapters.length - 1}
                      onMove={(direction) =>
                        void moveChapter(chapter.id, index + direction)
                      }
                      onDragStart={(event) => {
                        if (disabled || orderPending.current) {
                          event.preventDefault()
                          return
                        }
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', chapter.id)
                        setDragging(chapter.id)
                      }}
                      onDragEnd={() => {
                        setDragging(null)
                        setDropTarget(null)
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Suspense
                      fallback={
                        <Button variant="secondary" disabled>
                          {copy.open}
                        </Button>
                      }
                    >
                      <ChapterEditorDialog
                        bookId={book.id}
                        chapter={chapter}
                        chapters={chapters}
                        disabled={disabled}
                        onPending={operationPending}
                        onSaved={(committed) => {
                          setChapters((previous) =>
                            previous.map((item) =>
                              item.id === committed.id ? committed : item,
                            ),
                          )
                          setNotice(copy.textSaved(committed.title))
                        }}
                      />
                    </Suspense>
                    <ChapterTitleDialog
                      bookId={book.id}
                      chapter={chapter}
                      disabled={disabled}
                      onPending={operationPending}
                      onSaved={saved}
                      onCommittedClose={() => heading.current?.focus()}
                    />
                    <DeleteChapter
                      bookId={book.id}
                      chapter={chapter}
                      disabled={disabled}
                      onPending={operationPending}
                      onCommittedClose={() => heading.current?.focus()}
                      onDeleted={(remaining, deleted) => {
                        request.current += 1
                        setChapters(remaining)
                        setNotice(copy.deleted(deleted.title))
                      }}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
