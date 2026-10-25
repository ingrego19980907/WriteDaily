export const CHAPTER_CONTENT_VERSION = 1
export const CHAPTER_CONTENT_MAX_BYTES = 5 * 1024 * 1024
export const CHAPTER_CONTENT_MAX_NODES = 100_000
export const CHAPTER_CONTENT_MAX_DEPTH = 64

export type ChapterMark = { readonly type: 'bold' | 'italic' }
export type ChapterInline =
  | {
      readonly type: 'text'
      readonly text: string
      readonly marks?: readonly ChapterMark[]
    }
  | { readonly type: 'hardBreak'; readonly marks?: readonly ChapterMark[] }
export type ChapterParagraph = {
  readonly type: 'paragraph'
  readonly content?: readonly ChapterInline[]
}
export type ChapterListItem = {
  readonly type: 'listItem'
  readonly content: readonly [ChapterParagraph, ...ChapterBlock[]]
}
export type ChapterBlock =
  | ChapterParagraph
  | {
      readonly type: 'heading'
      readonly attrs: { readonly level: 1 | 2 | 3 | 4 | 5 | 6 }
      readonly content?: readonly ChapterInline[]
    }
  | {
      readonly type: 'bulletList'
      readonly content: readonly [ChapterListItem, ...ChapterListItem[]]
    }
  | {
      readonly type: 'orderedList'
      readonly attrs: {
        readonly start: number
        readonly type?: '1' | 'a' | 'A' | 'i' | 'I' | null
      }
      readonly content: readonly [ChapterListItem, ...ChapterListItem[]]
    }
export type ChapterDocument = {
  readonly type: 'doc'
  readonly content: readonly [ChapterBlock, ...ChapterBlock[]]
}
export type ChapterContent = {
  readonly schemaVersion: typeof CHAPTER_CONTENT_VERSION
  readonly document: ChapterDocument
}
export type ChapterContentError =
  | 'invalid_type'
  | 'unsupported_version'
  | 'invalid_document'
  | 'too_large'
  | 'too_deep'
export type ChapterContentValidation =
  | { success: true; data: ChapterContent }
  | { success: false; code: ChapterContentError }

/** Creation-only default. Never replace missing/invalid saved content with an empty document. */
export function createEmptyChapterContent(): ChapterContent {
  return {
    schemaVersion: CHAPTER_CONTENT_VERSION,
    document: { type: 'doc', content: [{ type: 'paragraph' }] },
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
    Reflect.ownKeys(value).every(
      (key) =>
        typeof key === 'string' &&
        Object.getOwnPropertyDescriptor(value, key)?.enumerable === true &&
        'value' in Object.getOwnPropertyDescriptor(value, key)!,
    )
  )
}
function array(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    Object.getPrototypeOf(value) === Array.prototype &&
    Reflect.ownKeys(value).length === value.length + 1 &&
    Object.keys(value).every(
      (key, index) =>
        key === String(index) &&
        'value' in Object.getOwnPropertyDescriptor(value, key)!,
    )
  )
}
function keys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key))
}

/** Validates a bounded JSON tree and copies it; never trims, normalizes or sanitizes writing. */
export function validateChapterContent(
  input: unknown,
): ChapterContentValidation {
  if (!record(input)) return { success: false, code: 'invalid_type' }
  if (input.schemaVersion !== CHAPTER_CONTENT_VERSION)
    return { success: false, code: 'unsupported_version' }
  if (!keys(input, ['schemaVersion', 'document']))
    return { success: false, code: 'invalid_document' }
  let count = 0
  let textBytes = 0
  let failure: ChapterContentError = 'invalid_document'
  const ancestors = new Set<object>()
  const encoder = new TextEncoder()
  function marks(value: unknown): boolean {
    if (!Array.isArray(value) || value.length > 2 || !array(value)) return false
    const seen = new Set<string>()
    return value.every((mark) => {
      if (
        !record(mark) ||
        !keys(mark, ['type']) ||
        (mark.type !== 'bold' && mark.type !== 'italic') ||
        seen.has(mark.type)
      )
        return false
      seen.add(mark.type)
      return true
    })
  }
  function node(
    value: unknown,
    category: 'doc' | 'block' | 'inline' | 'listItem',
    depth: number,
  ): boolean {
    if (depth > CHAPTER_CONTENT_MAX_DEPTH) {
      failure = 'too_deep'
      return false
    }
    count += 1
    if (count > CHAPTER_CONTENT_MAX_NODES) {
      failure = 'too_large'
      return false
    }
    if (!record(value) || ancestors.has(value)) return false
    ancestors.add(value)
    try {
      const type = value.type
      if (typeof type !== 'string') return false
      const inline = type === 'text' || type === 'hardBreak'
      const block = [
        'paragraph',
        'heading',
        'bulletList',
        'orderedList',
      ].includes(type)
      if (
        !(category === 'inline'
          ? inline
          : category === 'block'
            ? block
            : type === category)
      )
        return false
      const allowed =
        type === 'text'
          ? ['type', 'text', 'marks']
          : type === 'hardBreak'
            ? ['type', 'marks']
            : type === 'heading' || type === 'orderedList'
              ? ['type', 'attrs', 'content']
              : ['type', 'content']
      if (!keys(value, allowed)) return false
      if (Object.hasOwn(value, 'marks') && !marks(value.marks)) return false
      if (type === 'text') {
        if (
          typeof value.text !== 'string' ||
          !value.text.length ||
          /[\uD800-\uDFFF]/u.test(value.text)
        )
          return false
        if (value.text.length > CHAPTER_CONTENT_MAX_BYTES) {
          failure = 'too_large'
          return false
        }
        textBytes += encoder.encode(value.text).length
        if (textBytes > CHAPTER_CONTENT_MAX_BYTES) {
          failure = 'too_large'
          return false
        }
        return true
      }
      if (type === 'hardBreak') return true
      if (type === 'heading') {
        if (
          !record(value.attrs) ||
          !keys(value.attrs, ['level']) ||
          !Number.isInteger(value.attrs.level) ||
          Number(value.attrs.level) < 1 ||
          Number(value.attrs.level) > 6
        )
          return false
      }
      if (type === 'orderedList') {
        if (
          !record(value.attrs) ||
          !keys(value.attrs, ['start', 'type']) ||
          typeof value.attrs.start !== 'number' ||
          !Number.isSafeInteger(value.attrs.start) ||
          value.attrs.start < 1
        )
          return false
        if (
          Object.hasOwn(value.attrs, 'type') &&
          ![null, '1', 'a', 'A', 'i', 'I'].includes(
            value.attrs.type as string | null,
          )
        )
          return false
      }
      const children = value.content
      if (
        Array.isArray(children) &&
        children.length > CHAPTER_CONTENT_MAX_NODES
      ) {
        failure = 'too_large'
        return false
      }
      if (type === 'paragraph' || type === 'heading') {
        return (
          !Object.hasOwn(value, 'content') ||
          (array(children) &&
            children.every((child) => node(child, 'inline', depth + 1)))
        )
      }
      if (!array(children) || children.length === 0) return false
      if (
        type === 'listItem' &&
        (!record(children[0]) || children[0].type !== 'paragraph')
      )
        return false
      return children.every((child) =>
        node(
          child,
          type === 'bulletList' || type === 'orderedList'
            ? 'listItem'
            : 'block',
          depth + 1,
        ),
      )
    } finally {
      ancestors.delete(value)
    }
  }
  if (!node(input.document, 'doc', 1)) return { success: false, code: failure }
  const json = JSON.stringify(input)
  if (encoder.encode(json).length > CHAPTER_CONTENT_MAX_BYTES)
    return { success: false, code: 'too_large' }
  return { success: true, data: JSON.parse(json) as ChapterContent }
}
