import {
  Extension,
  Mark,
  Node,
  getSchema,
  type JSONContent,
} from '@tiptap/core'
import {
  DEFAULT_FONT_FAMILY,
  fontFamilyCss,
  isFontFamily,
} from './font-families'
import StarterKit from '@tiptap/starter-kit'
import { Plugin } from '@tiptap/pm/state'
import { validateChapterContent, type ChapterContent } from './chapter-content'

export const TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const

function persistedDocument(document: JSONContent): JSONContent {
  const result = JSON.parse(JSON.stringify(document)) as JSONContent
  function visit(node: JSONContent) {
    if ((node.type === 'paragraph' || node.type === 'heading') && node.attrs) {
      if (node.attrs.textAlign === null) delete node.attrs.textAlign
      if (!Object.keys(node.attrs).length) delete node.attrs
    }
    node.content?.forEach(visit)
  }
  visit(result)
  return result
}

/** Backward-compatible persisted v1-v6 subset. No trailing paragraph or unsupported marks. */
export function chapterExtensions() {
  return [
    Node.create({
      name: 'pageBreak',
      group: 'block',
      atom: true,
      selectable: false,
      parseHTML() {
        return [{ tag: 'div[data-page-break]' }]
      },
      renderHTML() {
        return [
          'div',
          {
            'data-page-break': '',
            class: 'manuscript-page-break',
            contenteditable: 'false',
          },
        ]
      },
    }),
    Extension.create({
      name: 'chapterTextAlignment',
      addGlobalAttributes() {
        return [
          {
            types: ['paragraph', 'heading'],
            attributes: {
              textAlign: {
                default: null,
                parseHTML: (element: HTMLElement) =>
                  TEXT_ALIGNMENTS.includes(
                    element.style.textAlign as (typeof TEXT_ALIGNMENTS)[number],
                  )
                    ? element.style.textAlign
                    : null,
                renderHTML: (attrs: Record<string, unknown>) =>
                  TEXT_ALIGNMENTS.includes(
                    attrs.textAlign as (typeof TEXT_ALIGNMENTS)[number],
                  )
                    ? { style: `text-align: ${String(attrs.textAlign)}` }
                    : {},
              },
            },
          },
        ]
      },
    }),
    Mark.create({
      name: 'fontFamily',
      addAttributes() {
        return {
          family: {
            default: DEFAULT_FONT_FAMILY,
            renderHTML: (attrs) =>
              isFontFamily(attrs.family)
                ? {
                    'data-font-family': attrs.family,
                    style: `font-family: ${fontFamilyCss(attrs.family)}`,
                  }
                : {},
          },
        }
      },
      parseHTML() {
        return [
          {
            tag: 'span[data-font-family]',
            getAttrs: (element) => {
              const family = element.getAttribute('data-font-family')
              return isFontFamily(family) ? { family } : false
            },
          },
        ]
      },
      renderHTML({ HTMLAttributes }) {
        return ['span', HTMLAttributes, 0]
      },
    }),
    Mark.create({
      name: 'fontSize',
      addAttributes() {
        return {
          size: {
            default: 18,
            renderHTML: (attrs) => ({
              'data-font-size': attrs.size,
              style: `font-size: ${Number(attrs.size) / 16}rem`,
            }),
          },
        }
      },
      parseHTML() {
        return [
          {
            tag: 'span[data-font-size]',
            getAttrs: (element) => {
              const size = Number(element.getAttribute('data-font-size'))
              return Number.isInteger(size) && size >= 12 && size <= 32
                ? { size }
                : false
            },
          },
        ]
      },
      renderHTML({ HTMLAttributes }) {
        return ['span', HTMLAttributes, 0]
      },
    }),
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: false,
      strike: false,
      underline: {},
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
    if (
      !validateChapterContent({
        schemaVersion: checked.data.schemaVersion,
        document: persistedDocument(json),
      }).success
    )
      return null
    return json
  } catch {
    return null
  }
}

export function serializeEditorDocument(
  document: JSONContent,
): ChapterContent | null {
  document = persistedDocument(document)
  const result = validateChapterContent({ schemaVersion: 1, document })
  if (result.success) return result.data
  const extended = validateChapterContent({ schemaVersion: 2, document })
  if (extended.success) return extended.data
  const underlined = validateChapterContent({ schemaVersion: 3, document })
  if (underlined.success) return underlined.data
  const aligned = validateChapterContent({ schemaVersion: 4, document })
  if (aligned.success) return aligned.data
  const family = validateChapterContent({ schemaVersion: 5, document })
  if (family.success) return family.data
  const paged = validateChapterContent({ schemaVersion: 6, document })
  return paged.success ? paged.data : null
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
