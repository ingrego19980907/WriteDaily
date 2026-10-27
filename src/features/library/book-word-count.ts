/** Aggregate committed chapter snapshots; unknown/corrupt data never becomes zero. */
export function aggregateBookWordCount(
  bookId: string,
  chapters: unknown,
): number | null {
  if (!Array.isArray(chapters)) return null
  let total = 0
  let unknown = false
  const ids = new Set<string>()
  for (const chapter of chapters) {
    if (
      typeof chapter !== 'object' ||
      chapter === null ||
      typeof chapter.id !== 'string' ||
      !chapter.id ||
      ids.has(chapter.id) ||
      chapter.bookId !== bookId
    )
      return null
    ids.add(chapter.id)
    const count: unknown = chapter.wordCount
    if (count === null) {
      unknown = true
      continue
    }
    if (
      typeof count !== 'number' ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      !Number.isSafeInteger(total + count)
    )
      return null
    total += count
  }
  return unknown ? null : total
}
