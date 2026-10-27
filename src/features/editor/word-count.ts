import categories from '../../../resources/unicode/word-categories-17.0.0.json'
import {
  validateChapterContent,
  type ChapterBlock,
  type ChapterDocument,
  type ChapterInline,
  type ChapterListItem,
} from './chapter-content'

const ignored = new Set(['\u00ad', '\u200c', '\u200d'])
const joiners = new Set([
  "'",
  '\u2018',
  '\u2019',
  '\u02bc',
  '-',
  '\u2010',
  '\u2011',
])

function category(character: string): number {
  const point = character.codePointAt(0)!
  if (point < 128)
    return point >= 48 && point <= 57
      ? 2
      : (point >= 65 && point <= 90) || (point >= 97 && point <= 122)
        ? 1
        : 0
  let low = 0
  let high = categories.ranges.length
  while (low < high) {
    const middle = (low + high) >>> 1
    const [start, end, kind] = categories.ranges[middle]
    if (point < start) high = middle
    else if (point > end) low = middle + 1
    else return kind
  }
  return 0
}

class WordCounter {
  count = 0
  private inWord = false
  private number = false
  private connector: 'join' | 'numeric' | null = null

  boundary() {
    this.inWord = false
    this.number = false
    this.connector = null
  }

  push(text: string) {
    for (const character of text) {
      if (ignored.has(character)) continue
      const join = joiners.has(character)
      const numeric = character === '.' || character === ','
      if (join || numeric) {
        if (this.inWord && this.connector === null && (join || this.number))
          this.connector = join ? 'join' : 'numeric'
        else this.boundary()
        continue
      }
      const kind = category(character)
      if (kind === 1 || kind === 2) {
        if (!this.inWord || (this.connector === 'numeric' && kind !== 2))
          this.count += 1
        this.inWord = true
        this.number = kind === 2
        this.connector = null
      } else if (kind !== 3 || this.connector !== null) this.boundary()
    }
  }
}

export function countTextWords(text: string): number {
  const counter = new WordCounter()
  counter.push(text)
  return counter.count
}

/** Invalid/unsupported writing has no count, never a fabricated zero. */
export function countChapterWords(input: unknown): number | null {
  const validated = validateChapterContent(input)
  if (!validated.success) return null
  const counter = new WordCounter()
  function visit(
    node: ChapterDocument | ChapterBlock | ChapterInline | ChapterListItem,
  ) {
    if (node.type === 'text') counter.push(node.text)
    else if (node.type === 'hardBreak' || node.type === 'pageBreak')
      counter.boundary()
    else {
      for (const child of node.content ?? []) visit(child)
      if (node.type === 'paragraph' || node.type === 'heading')
        counter.boundary()
    }
  }
  visit(validated.data.document)
  return counter.count
}
