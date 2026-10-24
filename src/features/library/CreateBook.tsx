import type { Book } from './book'
import { BookDetailsDialog } from './BookDetailsDialog'

export function CreateBook({
  onSaved,
}: { onSaved?: (book: Book) => void } = {}) {
  return <BookDetailsDialog onSaved={onSaved} />
}
