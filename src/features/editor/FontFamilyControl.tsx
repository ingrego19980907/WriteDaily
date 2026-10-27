import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { useId, useRef } from 'react'
import { en } from '../../app/i18n/en'
import {
  DEFAULT_FONT_FAMILY,
  FONT_FAMILIES,
  fontFamilyCss,
  isFontFamily,
} from './font-families'

function selectedFamily(editor: Editor): string | null {
  const { selection, storedMarks, doc } = editor.state
  if (selection.empty)
    return (
      (storedMarks ?? selection.$from.marks()).find(
        (mark) => mark.type.name === 'fontFamily',
      )?.attrs.family ?? DEFAULT_FONT_FAMILY
    )
  const families = new Set<string>()
  doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.isText)
      families.add(
        node.marks.find((mark) => mark.type.name === 'fontFamily')?.attrs
          .family ?? DEFAULT_FONT_FAMILY,
      )
  })
  return families.size > 1 ? null : ([...families][0] ?? DEFAULT_FONT_FAMILY)
}

export function FontFamilyControl({
  editor,
  disabled,
}: {
  editor: Editor
  disabled: boolean
}) {
  const id = useId()
  const selected = useRef<{ from: number; to: number } | null>(null)
  const family = useEditorState({
    editor,
    selector: ({ editor: current }) => selectedFamily(current),
  })
  const copy = en.editorPreferences
  const capture = () => ({
    from: editor.state.selection.from,
    to: editor.state.selection.to,
  })
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {copy.fontFamily}
      </label>
      <select
        id={id}
        className="input editor-font-family-select"
        value={family ?? ''}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onMouseDown={() => {
          selected.current = capture()
        }}
        onFocus={() => {
          selected.current ??= capture()
        }}
        onBlur={() => {
          selected.current = null
        }}
        onChange={(event) => {
          const next = event.target.value
          if (
            disabled ||
            editor.isDestroyed ||
            !editor.isEditable ||
            !isFontFamily(next)
          )
            return
          const range = selected.current ?? capture()
          selected.current = null
          let chain = editor.chain()
          if (
            range.from !== editor.state.selection.from ||
            range.to !== editor.state.selection.to
          )
            chain = chain.setTextSelection(range)
          chain
            .focus(undefined, { scrollIntoView: false })
            .setMark('fontFamily', { family: next })
            .run()
        }}
      >
        <option value="" disabled>
          {copy.mixed}
        </option>
        {FONT_FAMILIES.map((font) => (
          <option
            key={font.name}
            value={font.name}
            style={{ fontFamily: fontFamilyCss(font.name) }}
          >
            {font.name}
          </option>
        ))}
      </select>
      <span id={`${id}-hint`} className="sr-only">
        {copy.selectionHint}
      </span>
    </>
  )
}
