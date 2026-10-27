import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { EditorContent, useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { saveChapterContent } from '../../services/chapters'
import { protectWritingClose } from '../../services/writing-close'
import type { Chapter, ChapterSummary } from './chapter'
import { chapterErrorCode } from './chapter-errors'
import {
  chapterExtensions,
  contentBoundary,
  serializeEditorDocument,
} from './editor-schema'
import './manuscript.css'
import { FormattingToolbar } from './FormattingToolbar'
import { countChapterWords } from './word-count'
import { SaveStatus, type SaveState } from './SaveStatus'
import { chapterPagination, INITIAL_PAPER } from './pagination'
import { DEFAULT_FONT_SIZE } from './editor-preferences'

const copy = en.writing
const AUTOSAVE_DELAY_MS = 2_000

export function ManuscriptEditor({
  chapter,
  document,
  canCloseRef,
  onClose,
  onSaved,
  onPending,
  prepareToLeaveRef,
  navigationLocked = false,
  focusOnReady = false,
  focusMode = false,
  fontSize = DEFAULT_FONT_SIZE,
  preferencesPendingRef,
  formattingTarget,
  footerTarget,
  preview = false,
}: {
  formattingTarget?: HTMLDivElement | null
  footerTarget?: HTMLDivElement | null
  preview?: boolean
  chapter: Chapter
  document: JSONContent
  canCloseRef: RefObject<() => boolean>
  onClose: () => void
  onSaved: (chapter: ChapterSummary) => void
  onPending: (pending: boolean) => void
  prepareToLeaveRef?: RefObject<() => Promise<boolean>>
  navigationLocked?: boolean
  focusOnReady?: boolean
  focusMode?: boolean
  fontSize?: number
  preferencesPendingRef?: RefObject<boolean>
}) {
  const [paper, setPaper] = useState(INITIAL_PAPER)
  const [ready, setReady] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fatal, setFatal] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [failure, setFailure] = useState('')
  const [saveFailure, setSaveFailure] = useState('')
  const [saved, setSaved] = useState(false)
  const [editSequence, setEditSequence] = useState(0)
  const [autosavePaused, setAutosavePaused] = useState(false)
  const [closing, setClosing] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [wordCount, setWordCount] = useState(() =>
    countChapterWords(chapter.content),
  )
  const [savedWordCount, setSavedWordCount] = useState(chapter.wordCount)
  const previewRef = useRef(preview)
  useEffect(() => {
    previewRef.current = preview
  }, [preview])
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const revision = useRef(chapter.revision)
  const hintId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [extensions] = useState(() => [
    ...chapterExtensions(),
    chapterPagination(setPaper),
    contentBoundary(() => setFailure(copy.rejected)),
  ])
  const editor = useEditor({
    extensions,
    content: document,
    editable: !preview && ready && !saving && !fatal && !navigationLocked,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    enableContentCheck: true,
    parseOptions: { preserveWhitespace: 'full' },
    editorProps: {
      attributes: {
        role: 'textbox',
        tabindex: '0',
        'aria-label': copy.label,
        'aria-multiline': 'true',
        'aria-readonly': preview ? 'true' : 'false',
        'aria-describedby': hintId,
        spellcheck: 'true',
      },
      handleKeyDown(view, event) {
        if (
          !view.editable &&
          (event.ctrlKey || event.metaKey) &&
          ['b', 'i', 'u', 'z', 'y'].includes(event.key.toLowerCase())
        ) {
          event.preventDefault()
          return true
        }
        return false
      },
      handlePaste(view, event) {
        if (!view.editable) return true
        const text = event.clipboardData?.getData('text/plain')
        if (event.clipboardData?.files.length || !text) {
          setFailure(copy.pasteRejected)
          return true
        }
        view.dispatch(view.state.tr.insertText(text).scrollIntoView())
        return true
      },
      handleDrop(view) {
        if (view.editable) setFailure(copy.pasteRejected)
        return true
      },
    },
    onUpdate({ editor: current }) {
      setWordCount(
        countChapterWords(serializeEditorDocument(current.getJSON())),
      )
      dirtyRef.current = true
      setDirty(true)
      setSaved(false)
      setEditSequence((sequence) => sequence + 1)
      setDiscard(false)
    },
    onContentError() {
      setFatal(true)
      setFailure(copy.invalid)
    },
  })

  useEffect(() => {
    editor?.setEditable(
      !preview && ready && !saving && !fatal && !navigationLocked,
      false,
    )
  }, [editor, ready, saving, fatal, navigationLocked, preview])

  useEffect(() => {
    if (ready && focusOnReady) headingRef.current?.focus()
  }, [ready, focusOnReady])

  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined
    const refuse = () => {
      if (preferencesPendingRef?.current) return false
      if (savingRef.current) {
        setFailure(copy.pending)
        return false
      }
      if (dirtyRef.current) {
        setFailure(copy.unsaved)
        setClosing(true)
        return false
      }
      return true
    }
    canCloseRef.current = refuse
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (
        dirtyRef.current ||
        savingRef.current ||
        preferencesPendingRef?.current
      ) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    void protectWritingClose(
      () =>
        dirtyRef.current ||
        savingRef.current ||
        Boolean(preferencesPendingRef?.current),
      () => {
        refuse()
      },
    ).then(
      (unlisten) => {
        if (disposed) unlisten()
        else {
          cleanup = unlisten
          setReady(true)
        }
      },
      () => {
        if (!disposed) {
          setFatal(true)
          setFailure(copy.guardFailure)
        }
      },
    )
    return () => {
      disposed = true
      cleanup?.()
      canCloseRef.current = () => true
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [canCloseRef, preferencesPendingRef])

  const save = useCallback(async () => {
    if (
      !editor ||
      savingRef.current ||
      !dirtyRef.current ||
      blocked ||
      fatal ||
      !ready
    )
      return false
    const content = serializeEditorDocument(editor.getJSON())
    if (!content) {
      setAutosavePaused(true)
      setSaveFailure(copy.rejected)
      return false
    }
    savingRef.current = true
    editor.setEditable(false, false)
    setSaving(true)
    setFailure('')
    setSaved(false)
    onPending(true)
    try {
      const committed = await saveChapterContent(chapter.bookId, chapter.id, {
        expectedRevision: revision.current,
        content,
      })
      revision.current = committed.revision
      setSavedWordCount(committed.wordCount)
      dirtyRef.current = false
      setDirty(false)
      setSaved(true)
      setFailure('')
      setSaveFailure('')
      setAutosavePaused(false)
      setClosing(false)
      setDiscard(false)
      onSaved(committed)
      return true
    } catch (error) {
      setAutosavePaused(true)
      setFailure('')
      const code = chapterErrorCode(error)
      setBlocked(
        code === 'conflict' ||
          code === 'not_found' ||
          code === 'invalid_stored_data',
      )
      setSaveFailure(
        code === 'conflict'
          ? copy.conflict
          : code === 'not_found'
            ? copy.missing
            : code === 'invalid_stored_data'
              ? copy.storedFailure
              : copy.failure,
      )
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
      onPending(false)
      editor.setEditable(
        !previewRef.current && ready && !fatal && !navigationLocked,
        false,
      )
    }
  }, [
    editor,
    blocked,
    fatal,
    ready,
    chapter.bookId,
    chapter.id,
    onPending,
    onSaved,
    navigationLocked,
  ])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        preview ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== 's'
      )
        return
      const dialog = rootRef.current?.closest('[role="dialog"]')
      if (
        !dialog ||
        !(event.target instanceof Node) ||
        !dialog.contains(event.target)
      )
        return
      event.preventDefault()
      if (!event.repeat && !event.isComposing && !navigationLocked) void save()
    }
    const ownerDocument = rootRef.current?.ownerDocument
    ownerDocument?.addEventListener('keydown', shortcut)
    return () => ownerDocument?.removeEventListener('keydown', shortcut)
  }, [save, navigationLocked, preview])

  useEffect(() => {
    if (
      !dirty ||
      !ready ||
      saving ||
      blocked ||
      fatal ||
      navigationLocked ||
      autosavePaused
    )
      return
    const timer = window.setTimeout(() => {
      void save()
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [
    editSequence,
    dirty,
    ready,
    saving,
    blocked,
    fatal,
    navigationLocked,
    autosavePaused,
    save,
  ])

  useEffect(() => {
    if (!prepareToLeaveRef) return
    prepareToLeaveRef.current = async () => {
      if (savingRef.current) return false
      if (dirtyRef.current && !(await save())) return false
      editor?.setEditable(false, false)
      return true
    }
    return () => {
      prepareToLeaveRef.current = async () => true
    }
  }, [prepareToLeaveRef, editor, save])

  const saveState: SaveState = fatal
    ? 'unavailable'
    : saving
      ? 'saving'
      : blocked
        ? 'blocked'
        : autosavePaused
          ? 'paused'
          : !ready
            ? 'preparing'
            : dirty
              ? 'waiting'
              : saved
                ? 'saved'
                : 'unchanged'

  const footer = (
    <div className="manuscript-footer">
      <div className="manuscript-page-actions">
        <Button
          aria-keyshortcuts="Control+S Meta+S"
          title={copy.saveShortcut}
          disabled={
            !editor ||
            !ready ||
            !dirty ||
            saving ||
            blocked ||
            fatal ||
            navigationLocked
          }
          onClick={() => {
            void save()
          }}
        >
          {saving ? copy.saving : copy.save}
        </Button>
        <Button
          variant="secondary"
          disabled={
            !editor || !ready || saving || blocked || fatal || navigationLocked
          }
          title={copy.addPageHint}
          onClick={() => {
            if (!editor || !editor.isEditable || savingRef.current) return
            const marks =
              editor.state.storedMarks ?? editor.state.selection.$from.marks()
            editor
              .chain()
              .focus('end')
              .insertContentAt(editor.state.doc.content.size, [
                { type: 'pageBreak' },
                { type: 'paragraph' },
              ])
              .command(({ tr }) => {
                tr.setStoredMarks(marks)
                return true
              })
              .run()
          }}
        >
          {copy.addPage}
        </Button>
      </div>
      <div className="manuscript-footer__info">
        <SaveStatus state={saveState} compact />
        <p
          id={hintId}
          className={focusMode ? 'sr-only' : 'manuscript-hint text-secondary'}
          title={focusMode ? undefined : copy.wordCountHint}
          tabIndex={focusMode ? undefined : 0}
          aria-describedby={focusMode ? undefined : `${hintId}-count`}
        >
          {focusMode ? copy.focusHint : copy.description}
        </p>
        <span id={`${hintId}-count`} className="sr-only">
          {copy.wordCountHint}
        </span>

        <div
          hidden={focusMode}
          role="group"
          aria-label={copy.wordCounts}
          className="manuscript-counts"
        >
          <span>
            <span aria-hidden="true">
              {wordCount === null
                ? copy.countPlaceholder
                : new Intl.NumberFormat('en').format(wordCount)}
            </span>
            <span className="sr-only">
              {wordCount === null
                ? copy.wordsUnknown
                : copy.currentWords(
                    new Intl.NumberFormat('en').format(wordCount),
                  )}
            </span>
          </span>
          <span aria-hidden="true">/</span>
          <span>
            <span aria-hidden="true">
              {savedWordCount === null
                ? copy.countPlaceholder
                : new Intl.NumberFormat('en').format(savedWordCount)}
            </span>
            <span className="sr-only">
              {savedWordCount === null
                ? copy.savedWordsUnknown
                : copy.savedWords(
                    new Intl.NumberFormat('en').format(savedWordCount),
                  )}
            </span>
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div
      ref={rootRef}
      className={`min-w-0 space-y-4${focusMode ? ' manuscript-focus' : ''}`}
      style={{ '--editor-font-size': `${fontSize / 16}rem` } as CSSProperties}
    >
      <h3
        ref={headingRef}
        tabIndex={-1}
        className={
          focusMode ? 'sr-only' : 'font-writing text-writing break-words'
        }
      >
        {chapter.title}
      </h3>
      {!fatal && (
        <>
          {!preview &&
            editor &&
            (focusMode && formattingTarget ? (
              createPortal(
                <FormattingToolbar
                  compact
                  editor={editor}
                  disabled={!ready || saving || navigationLocked}
                />,
                formattingTarget,
              )
            ) : (
              <div>
                <FormattingToolbar
                  compact={focusMode}
                  editor={editor}
                  disabled={!ready || saving || navigationLocked}
                />
              </div>
            ))}
          <div
            className="manuscript manuscript--paged"
            style={
              {
                '--paper-height': `${paper.height}px`,
                '--paper-padding': `${paper.padding}px`,
                '--paper-total-height': `${paper.pages * (paper.height + paper.gap) - paper.gap}px`,
              } as CSSProperties
            }
          >
            <div className="manuscript-sheets" aria-hidden="true">
              {Array.from({ length: paper.pages }, (_, index) => (
                <div
                  className="manuscript-sheet"
                  key={index}
                  style={{
                    top: `${index * (paper.height + paper.gap)}px`,
                    height: `${paper.height}px`,
                  }}
                >
                  <span>{index + 1}</span>
                </div>
              ))}
            </div>
            <EditorContent editor={editor} />
          </div>
        </>
      )}
      {(failure || saveFailure) && (
        <div role="alert" className="space-y-2 text-error">
          {saveFailure && <p>{saveFailure}</p>}
          {failure && failure !== saveFailure && <p>{failure}</p>}
        </div>
      )}
      {!preview &&
        (focusMode && footerTarget
          ? createPortal(footer, footerTarget)
          : footer)}
      {preview && (
        <p id={hintId} className="text-secondary text-sm">
          {copy.previewHint}
        </p>
      )}
      {closing && dirty && (
        <div className="space-y-3">
          <label className="flex items-start gap-3 py-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-accent-strong"
              disabled={saving}
              checked={discard}
              onChange={(event) => setDiscard(event.target.checked)}
            />
            {copy.discardCheck}
          </label>
          <Button
            variant="secondary"
            disabled={!discard || saving}
            onClick={() => {
              if (!savingRef.current && discard) {
                dirtyRef.current = false
                onClose()
              }
            }}
          >
            {copy.discard}
          </Button>
        </div>
      )}
    </div>
  )
}
