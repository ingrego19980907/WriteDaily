import { useEffect, useId, useRef, useState, type RefObject } from 'react'
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

const copy = en.writing

export function ManuscriptEditor({
  chapter,
  document,
  canCloseRef,
  onClose,
  onSaved,
  onPending,
}: {
  chapter: Chapter
  document: JSONContent
  canCloseRef: RefObject<() => boolean>
  onClose: () => void
  onSaved: (chapter: ChapterSummary) => void
  onPending: (pending: boolean) => void
}) {
  const [ready, setReady] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fatal, setFatal] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [failure, setFailure] = useState('')
  const [saved, setSaved] = useState(false)
  const [closing, setClosing] = useState(false)
  const [discard, setDiscard] = useState(false)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const revision = useRef(chapter.revision)
  const hintId = useId()
  const [extensions] = useState(() => [
    ...chapterExtensions(),
    contentBoundary(() => setFailure(copy.rejected)),
  ])
  const editor = useEditor({
    extensions,
    content: document,
    editable: ready && !saving && !fatal,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    enableContentCheck: true,
    parseOptions: { preserveWhitespace: 'full' },
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': copy.label,
        'aria-multiline': 'true',
        'aria-describedby': hintId,
        spellcheck: 'true',
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain')
        if (event.clipboardData?.files.length || !text) {
          setFailure(copy.pasteRejected)
          return true
        }
        view.dispatch(view.state.tr.insertText(text).scrollIntoView())
        return true
      },
      handleDrop() {
        setFailure(copy.pasteRejected)
        return true
      },
    },
    onUpdate() {
      dirtyRef.current = true
      setDirty(true)
      setSaved(false)
      if (!blocked) setFailure('')
      setDiscard(false)
    },
    onContentError() {
      setFatal(true)
      setFailure(copy.invalid)
    },
  })

  useEffect(() => {
    editor?.setEditable(ready && !saving && !fatal, false)
  }, [editor, ready, saving, fatal])

  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined
    const refuse = () => {
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
      if (dirtyRef.current || savingRef.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    void protectWritingClose(
      () => dirtyRef.current || savingRef.current,
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
  }, [canCloseRef])

  async function save() {
    if (
      !editor ||
      savingRef.current ||
      !dirtyRef.current ||
      blocked ||
      fatal ||
      !ready
    )
      return
    const content = serializeEditorDocument(editor.getJSON())
    if (!content) {
      setFailure(copy.rejected)
      return
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
      dirtyRef.current = false
      setDirty(false)
      setSaved(true)
      setClosing(false)
      setDiscard(false)
      onSaved(committed)
    } catch (error) {
      const code = chapterErrorCode(error)
      setBlocked(
        code === 'conflict' ||
          code === 'not_found' ||
          code === 'invalid_stored_data',
      )
      setFailure(
        code === 'conflict'
          ? copy.conflict
          : code === 'not_found'
            ? copy.missing
            : code === 'invalid_stored_data'
              ? copy.storedFailure
              : copy.failure,
      )
    } finally {
      savingRef.current = false
      setSaving(false)
      onPending(false)
      editor.setEditable(!fatal, false)
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <h3 className="font-writing text-writing break-words">{chapter.title}</h3>
      <p id={hintId} className="text-secondary">
        {copy.description}
      </p>
      {!fatal && (
        <>
          {editor && (
            <FormattingToolbar editor={editor} disabled={!ready || saving} />
          )}
          <EditorContent editor={editor} className="manuscript" />
        </>
      )}
      {failure && (
        <p role="alert" className="text-error">
          {failure}
        </p>
      )}
      <p role="status">{saved ? copy.saved : ''}</p>
      <Button
        disabled={!editor || !ready || !dirty || saving || blocked || fatal}
        onClick={() => {
          void save()
        }}
      >
        {saving ? copy.saving : copy.save}
      </Button>
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
