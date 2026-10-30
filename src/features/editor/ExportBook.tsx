import { en } from '../../app/i18n/en'
import { exportBook } from '../../services/exports'
import type { Book } from '../library/book'
import type { ChapterSummary } from './chapter'
import { ExportAction } from './ExportAction'

const copy = en.bookExport
export function ExportBook({
  book,
  chapters,
  ...props
}: {
  book: Pick<Book, 'id' | 'title' | 'updatedAt'>
  chapters: readonly ChapterSummary[]
  disabled: boolean
  hintId: string
  onPending: (pending: boolean) => void
}) {
  return (
    <ExportAction
      {...props}
      disabled={props.disabled || chapters.length === 0}
      copy={copy}
      label={copy.label(book.title)}
      exportFile={() =>
        exportBook(
          book.id,
          { bookUpdatedAt: book.updatedAt, chapters },
          { title: copy.dialogTitle, fileType: copy.fileType },
        )
      }
    />
  )
}
