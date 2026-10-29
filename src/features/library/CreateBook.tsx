import type { Book } from './book'
import { BookDetailsDialog } from './BookDetailsDialog'

export function CreateBook({
  onSaved,
  additionalTriggerTarget,
}: {
  onSaved?: (book: Book) => void
  additionalTriggerTarget?: HTMLDivElement | null
} = {}) {
  return (
    <div className="create-book-entry">
      <BookDetailsDialog
        onSaved={onSaved}
        additionalTriggerTarget={additionalTriggerTarget}
      />
    </div>
  )
}
