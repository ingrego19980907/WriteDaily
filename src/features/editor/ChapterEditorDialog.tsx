import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { getChapter } from '../../services/chapters'
import type { Chapter, ChapterSummary } from './chapter'
import { prepareEditorDocument } from './editor-schema'
import { ManuscriptEditor } from './ManuscriptEditor'
import '../../components/ui/input.css'

const copy = en.writing

export function ChapterEditorDialog({
  bookId,
  chapter,
  chapters,
  disabled,
  onPending,
  onSaved,
  dailyWordGoal = null,
}: {
  bookId: string
  chapter: ChapterSummary
  chapters?: readonly ChapterSummary[]
  disabled: boolean
  onPending: (pending: boolean) => void
  onSaved: (chapter: ChapterSummary) => void
  dailyWordGoal?: number | null
}) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState<{
    chapter: Chapter
    document: JSONContent
  } | null>(null)
  const [failure, setFailure] = useState('')
  const [switchFailure, setSwitchFailure] = useState('')
  const [switching, setSwitching] = useState(false)
  const [writingPending, setWritingPending] = useState(false)
  const [failedTarget, setFailedTarget] = useState<string | null>(null)
  const [focusOnReady, setFocusOnReady] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [formattingTarget, setFormattingTarget] =
    useState<HTMLDivElement | null>(null)
  const [footerTarget, setFooterTarget] = useState<HTMLDivElement | null>(null)
  const focusModeRef = useRef(false)
  const focusButton = useRef<HTMLButtonElement>(null)
  const request = useRef(0)
  const canClose = useRef<() => boolean>(() => true)
  const prepareToLeaveRef = useRef<() => Promise<boolean>>(async () => true)
  const switchingRef = useRef(false)
  const writingPendingRef = useRef(false)
  const selectId = useId()
  const hintId = useId()
  const ordered = (chapters ?? [chapter]).filter(
    (item) => item.bookId === bookId,
  )
  const activeIndex = ordered.findIndex(
    (item) => item.id === loaded?.chapter.id,
  )

  const reportWritingPending = useCallback(
    (pending: boolean) => {
      writingPendingRef.current = pending
      setWritingPending(pending)
      onPending(pending || switchingRef.current)
    },
    [onPending],
  )
  useEffect(
    () => () => {
      request.current += 1
    },
    [],
  )

  function close() {
    request.current += 1
    setOpen(false)
    setLoaded(null)
    focusModeRef.current = false
    setFocusMode(false)
  }
  function changeOpen(next: boolean) {
    if (!next) {
      if (switchingRef.current) return
      if (canClose.current()) close()
      return
    }
    const current = ++request.current
    setOpen(true)
    setFailure('')
    setSwitchFailure('')
    setFailedTarget(null)
    setFocusOnReady(false)
    focusModeRef.current = false
    setFocusMode(false)
    setLoaded(null)
    void getChapter(bookId, chapter.id).then(
      (result) => {
        if (request.current !== current) return
        const document =
          result.id === chapter.id && result.bookId === bookId
            ? prepareEditorDocument(result.content)
            : null
        if (document) setLoaded({ chapter: result, document })
        else setFailure(copy.invalid)
      },
      () => {
        if (request.current === current) setFailure(copy.loadFailure)
      },
    )
  }

  async function switchChapter(id: string) {
    if (
      !loaded ||
      focusModeRef.current ||
      id === loaded.chapter.id ||
      switchingRef.current ||
      writingPendingRef.current ||
      !ordered.some((item) => item.id === id)
    )
      return
    const current = ++request.current
    switchingRef.current = true
    setSwitching(true)
    setSwitchFailure('')
    setFailedTarget(null)
    onPending(true)
    try {
      if (!(await prepareToLeaveRef.current()) || request.current !== current)
        return
      const result = await getChapter(bookId, id)
      if (request.current !== current) return
      const document =
        result.id === id && result.bookId === bookId
          ? prepareEditorDocument(result.content)
          : null
      if (!document) {
        setSwitchFailure(copy.invalid)
        setFailedTarget(id)
        return
      }
      setLoaded({ chapter: result, document })
      setFocusOnReady(true)
    } catch {
      if (request.current === current) {
        setSwitchFailure(copy.switchFailure)
        setFailedTarget(id)
      }
    } finally {
      switchingRef.current = false
      if (request.current === current) setSwitching(false)
      onPending(writingPendingRef.current)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={changeOpen}
      trigger={
        <Button variant="secondary" disabled={disabled}>
          {en.chapters.open}
        </Button>
      }
      title={focusMode && loaded ? loaded.chapter.title : copy.title}
      closeLabel={copy.close}
      size="large"
      fullScreen={focusMode}
      onEscapeKeyDown={(event) => {
        if (event.repeat || event.isComposing) {
          event.preventDefault()
        } else if (focusModeRef.current) {
          event.preventDefault()
          focusModeRef.current = false
          setFocusMode(false)
          focusButton.current?.focus()
        }
      }}
      footer={
        focusMode ? (
          <div ref={setFooterTarget} className="chapter-editor-footer" />
        ) : undefined
      }
      headerCenter={
        focusMode && loaded ? (
          <div
            ref={setFormattingTarget}
            className="chapter-editor-formatting-slot"
          />
        ) : undefined
      }
      headerActions={
        loaded && (
          <>
            <Button
              ref={focusButton}
              variant="secondary"
              aria-pressed={focusMode}
              disabled={switching}
              onClick={() => {
                const next = !focusModeRef.current
                focusModeRef.current = next
                setFocusMode(next)
              }}
            >
              {focusMode ? copy.exitFocus : copy.enterFocus}
            </Button>
          </>
        )
      }
    >
      {loaded && (
        <nav
          hidden={focusMode}
          aria-label={copy.navigation}
          className="min-w-0 space-y-3"
          aria-busy={switching}
        >
          <label htmlFor={selectId} className="font-semibold">
            {copy.chooseChapter}
          </label>
          <select
            id={selectId}
            className="input w-full min-w-0"
            value={loaded.chapter.id}
            disabled={switching || writingPending}
            aria-describedby={hintId}
            onChange={(event) => {
              void switchChapter(event.target.value)
            }}
          >
            {ordered.map((item, index) => (
              <option
                key={item.id}
                value={item.id}
              >{`${index + 1}. ${item.title}`}</option>
            ))}
          </select>
          <p id={hintId} className="text-secondary">
            {copy.navigationHint}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={switching || writingPending || activeIndex <= 0}
              onClick={() => {
                const previous = ordered[activeIndex - 1]
                if (previous) void switchChapter(previous.id)
              }}
            >
              {copy.previousChapter}
            </Button>
            <Button
              variant="secondary"
              disabled={
                switching ||
                writingPending ||
                activeIndex < 0 ||
                activeIndex >= ordered.length - 1
              }
              onClick={() => {
                const next = ordered[activeIndex + 1]
                if (next) void switchChapter(next.id)
              }}
            >
              {copy.nextChapter}
            </Button>
          </div>
          {switching && <p role="status">{copy.switching}</p>}
          {switchFailure && (
            <p role="alert" className="text-error">
              {switchFailure}
            </p>
          )}
          {failedTarget && (
            <Button
              variant="secondary"
              disabled={switching || writingPending}
              onClick={() => {
                void switchChapter(failedTarget)
              }}
            >
              {copy.retryChapter}
            </Button>
          )}
        </nav>
      )}
      {failure ? (
        <p role="alert" className="text-error">
          {failure}
        </p>
      ) : loaded ? (
        <ManuscriptEditor
          key={loaded.chapter.id}
          chapter={loaded.chapter}
          dailyWordGoal={dailyWordGoal}
          document={loaded.document}
          canCloseRef={canClose}
          onClose={close}
          onPending={reportWritingPending}
          onSaved={onSaved}
          prepareToLeaveRef={prepareToLeaveRef}
          navigationLocked={switching}
          focusOnReady={focusOnReady}
          preview={!focusMode}
          focusMode={focusMode}
          formattingTarget={formattingTarget}
          footerTarget={footerTarget}
        />
      ) : (
        <p role="status">{copy.loading}</p>
      )}
    </Modal>
  )
}
