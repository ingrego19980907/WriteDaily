import { useEffect, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { getChapter } from '../../services/chapters'
import type { Chapter, ChapterSummary } from './chapter'
import { prepareEditorDocument } from './editor-schema'
import { ManuscriptEditor } from './ManuscriptEditor'

const copy = en.writing

export function ChapterEditorDialog({
  bookId,
  chapter,
  disabled,
  onPending,
  onSaved,
}: {
  bookId: string
  chapter: ChapterSummary
  disabled: boolean
  onPending: (pending: boolean) => void
  onSaved: (chapter: ChapterSummary) => void
}) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState<{
    chapter: Chapter
    document: JSONContent
  } | null>(null)
  const [failure, setFailure] = useState('')
  const request = useRef(0)
  const canClose = useRef<() => boolean>(() => true)
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
  }
  function changeOpen(next: boolean) {
    if (!next) {
      if (canClose.current()) close()
      return
    }
    const current = ++request.current
    setOpen(true)
    setFailure('')
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

  return (
    <Modal
      open={open}
      onOpenChange={changeOpen}
      trigger={
        <Button variant="secondary" disabled={disabled}>
          {en.chapters.open}
        </Button>
      }
      title={copy.title}
      closeLabel={copy.close}
    >
      {failure ? (
        <p role="alert" className="text-error">
          {failure}
        </p>
      ) : loaded ? (
        <ManuscriptEditor
          chapter={loaded.chapter}
          document={loaded.document}
          canCloseRef={canClose}
          onClose={close}
          onPending={onPending}
          onSaved={onSaved}
        />
      ) : (
        <p role="status">{copy.loading}</p>
      )}
    </Modal>
  )
}
