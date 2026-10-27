import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { useId, useRef } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { FONT_SIZES, isFontSize } from './editor-preferences'

function selectionFontSize(editor: Editor): number | null {
  const { selection, storedMarks, doc } = editor.state
  if (selection.empty) {
    const mark = (storedMarks ?? selection.$from.marks()).find(
      (item) => item.type.name === 'fontSize',
    )
    return mark?.attrs.size ?? 18
  }
  const sizes = new Set<number>()
  doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.isText)
      sizes.add(
        node.marks.find((mark) => mark.type.name === 'fontSize')?.attrs.size ??
          18,
      )
  })
  return sizes.size > 1 ? null : ([...sizes][0] ?? 18)
}

export function FontSizeControls({
  editor,
  disabled,
}: {
  editor: Editor
  disabled: boolean
}) {
  const id = useId()
  const selected = useRef<{ from: number; to: number } | null>(null)
  const size = useEditorState({
    editor,
    selector: ({ editor: current }) => selectionFontSize(current),
  })
  const apply = (next: number) => {
    if (
      !disabled &&
      editor.isEditable &&
      !editor.isDestroyed &&
      isFontSize(next)
    ) {
      const range = selected.current ?? {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      }
      selected.current = null
      let chain = editor.chain()
      if (
        range.from !== editor.state.selection.from ||
        range.to !== editor.state.selection.to
      )
        chain = chain.setTextSelection(range)
      chain
        .focus(undefined, { scrollIntoView: false })
        .setMark('fontSize', { size: next })
        .run()
    }
  }
  const copy = en.editorPreferences
  return (
    <div className="editor-font-controls">
      <Button
        variant="ghost"
        aria-label={copy.decrease}
        title={copy.decrease}
        disabled={disabled || size === 12}
        onMouseDown={(event) => {
          if (event.button === 0) event.preventDefault()
        }}
        onClick={() => apply(Math.max(12, (size ?? 18) - 1))}
      >
        −
      </Button>
      <label htmlFor={id} className="sr-only">
        {copy.fontSize}
      </label>
      <select
        id={id}
        className="input editor-font-select"
        aria-describedby={`${id}-hint`}
        onMouseDown={() => {
          selected.current = {
            from: editor.state.selection.from,
            to: editor.state.selection.to,
          }
        }}
        onFocus={() => {
          selected.current ??= {
            from: editor.state.selection.from,
            to: editor.state.selection.to,
          }
        }}
        onBlur={() => {
          selected.current = null
        }}
        value={size ?? ''}
        disabled={disabled}
        onChange={(event) => apply(Number(event.target.value))}
      >
        <option value="" disabled>
          {copy.mixed}
        </option>
        {FONT_SIZES.map((value) => (
          <option value={value} key={value}>
            {value}
          </option>
        ))}
      </select>
      <span className="sr-only" id={`${id}-hint`}>
        {copy.selectionHint}
      </span>
      <Button
        variant="ghost"
        aria-label={copy.increase}
        title={copy.increase}
        disabled={disabled || size === 32}
        onMouseDown={(event) => {
          if (event.button === 0) event.preventDefault()
        }}
        onClick={() => apply(Math.min(32, (size ?? 18) + 1))}
      >
        +
      </Button>
    </div>
  )
}
