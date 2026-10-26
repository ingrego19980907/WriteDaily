import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import './formatting-toolbar.css'

const copy = en.writing
const levels = [1, 2, 3, 4, 5, 6] as const

export function FormattingToolbar({
  editor,
  disabled,
}: {
  editor: Editor
  disabled: boolean
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      paragraph: current.isActive('paragraph'),
      headings: levels.map((level) => current.isActive('heading', { level })),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      canBold: current.can().toggleBold(),
      canItalic: current.can().toggleItalic(),
      canParagraph: current.can().setParagraph(),
      canHeadings: levels.map((level) =>
        current.can().toggleHeading({ level }),
      ),
      canBulletList: current.can().toggleBulletList(),
      canOrderedList: current.can().toggleOrderedList(),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  })
  const root = useRef<HTMLDivElement>(null)
  const [tabStop, setTabStop] = useState('bold')
  const hintId = useId()
  const controls = [
    {
      id: 'bold',
      label: copy.bold,
      pressed: state.bold,
      enabled: state.canBold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic',
      label: copy.italic,
      pressed: state.italic,
      enabled: state.canItalic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: 'paragraph',
      label: copy.paragraph,
      pressed: state.paragraph,
      enabled: state.canParagraph,
      run: () => editor.chain().focus().setParagraph().run(),
    },
    ...levels.map((level, index) => ({
      id: `heading-${level}`,
      label: copy.heading(level),
      pressed: state.headings[index],
      enabled: state.canHeadings[index],
      run: () => editor.chain().focus().toggleHeading({ level }).run(),
    })),
    {
      id: 'bullet-list',
      label: copy.bulletList,
      pressed: state.bulletList,
      enabled: state.canBulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered-list',
      label: copy.orderedList,
      pressed: state.orderedList,
      enabled: state.canOrderedList,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'undo',
      label: copy.undo,
      pressed: undefined,
      enabled: state.canUndo,
      run: () => editor.chain().focus().undo().run(),
    },
    {
      id: 'redo',
      label: copy.redo,
      pressed: undefined,
      enabled: state.canRedo,
      run: () => editor.chain().focus().redo().run(),
    },
  ]
  const enabled = controls.filter((control) => control.enabled && !disabled)
  const currentTabStop =
    enabled.find((control) => control.id === tabStop)?.id ?? enabled[0]?.id

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
    )
      return
    const buttons = Array.from(
      root.current?.querySelectorAll<HTMLButtonElement>(
        'button:not(:disabled)',
      ) ?? [],
    )
    const current = buttons.indexOf(event.target as HTMLButtonElement)
    if (current < 0 || !buttons.length) return
    event.preventDefault()
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) %
            buttons.length
    buttons[next].focus()
  }

  return (
    <>
      <p id={hintId} className="text-secondary text-ui">
        {copy.toolbarHint}
      </p>
      <div
        ref={root}
        role="toolbar"
        aria-label={copy.toolbar}
        aria-describedby={hintId}
        aria-orientation="horizontal"
        className="formatting-toolbar"
        onKeyDown={navigate}
      >
        {controls.map((control) => (
          <Button
            key={control.id}
            variant="secondary"
            aria-label={control.label}
            aria-pressed={control.pressed}
            disabled={disabled || !control.enabled}
            tabIndex={control.id === currentTabStop ? 0 : -1}
            onFocus={() => setTabStop(control.id)}
            onMouseDown={(event) => {
              if (event.button === 0) event.preventDefault()
            }}
            onClick={() => {
              if (!disabled && !editor.isDestroyed && editor.isEditable) {
                setTabStop(control.id)
                control.run()
              }
            }}
          >
            {control.label}
          </Button>
        ))}
      </div>
    </>
  )
}
