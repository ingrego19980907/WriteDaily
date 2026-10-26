import { Extension, getSchema, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Plugin } from '@tiptap/pm/state'
import { validateChapterContent, type ChapterContent } from './chapter-content'

/** Exactly the persisted v1 subset. No trailing paragraph or unsupported marks. */
export function chapterExtensions() {
  return [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: false,
      strike: false,
      underline: false,
      trailingNode: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
  ]
}

export function prepareEditorDocument(input: unknown): JSONContent | null {
  const checked = validateChapterContent(input)
  if (!checked.success) return null
  try {
    const schema = getSchema(chapterExtensions())
    const document = schema.nodeFromJSON(checked.data.document)
    document.check()
    const json: JSONContent = document.toJSON()
    if (!validateChapterContent({ schemaVersion: 1, document: json }).success)
      return null
    return json
  } catch {
    return null
  }
}

export function serializeEditorDocument(
  document: JSONContent,
): ChapterContent | null {
  const result = validateChapterContent({ schemaVersion: 1, document })
  return result.success ? result.data : null
}

/** Refuse an invalid edit explicitly instead of truncating a manuscript. */
export function contentBoundary(onRejected: () => void) {
  return Extension.create({
    name: 'chapterContentBoundary',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          filterTransaction(transaction) {
            if (!transaction.docChanged) return true
            if (serializeEditorDocument(transaction.doc.toJSON())) return true
            onRejected()
            return false
          },
        }),
      ]
    },
  })
}
