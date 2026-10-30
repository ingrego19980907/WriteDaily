import { en } from '../../app/i18n/en'
import { exportChapter } from '../../services/exports'
import type { ChapterSummary } from './chapter'
import { ExportAction } from './ExportAction'

const copy = en.chapterExport
export function ExportChapter({
  bookId,
  chapter,
  ...props
}: {
  bookId: string
  chapter: ChapterSummary
  disabled: boolean
  hintId: string
  onPending: (pending: boolean) => void
}) {
  return (
    <ExportAction
      {...props}
      copy={copy}
      label={copy.label(chapter.title)}
      exportFile={() =>
        exportChapter(bookId, chapter.id, chapter.revision, {
          title: copy.dialogTitle,
          fileType: copy.fileType,
        })
      }
    />
  )
}
