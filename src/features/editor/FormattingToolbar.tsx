import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import './formatting-toolbar.css'
import { TEXT_ALIGNMENTS } from './editor-schema'
import { FontFamilyControl } from './FontFamilyControl'
import { FontSizeControls } from './FontSizeControls'

const copy = en.writing
const levels = [1, 2, 3, 4, 5, 6] as const

function activeAlignments(editor: Editor) {
  const values = new Set<string>()
  const { from, to, empty, $from } = editor.state.selection
  if (empty) values.add($from.parent.attrs.textAlign ?? 'left')
  else
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.isTextblock) values.add(node.attrs.textAlign ?? 'left')
    })
  return TEXT_ALIGNMENTS.map(
    (alignment) => values.size === 1 && values.has(alignment),
  )
}

export function FormattingToolbar({
  editor,
  disabled,
  compact = false,
}: {
  compact?: boolean
  editor: Editor
  disabled: boolean
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      alignment: activeAlignments(current),
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      paragraph: current.isActive('paragraph'),
      headings: levels.map((level) => current.isActive('heading', { level })),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      canBold: current.can().toggleBold(),
      canItalic: current.can().toggleItalic(),
      canUnderline: current.can().toggleUnderline(),
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
      id: 'underline',
      label: copy.underline,
      pressed: state.underline,
      enabled: state.canUnderline,
      run: () => editor.chain().focus().toggleUnderline().run(),
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
      label: compact ? copy.compactHeading(level) : copy.heading(level),
      pressed: state.headings[index],
      enabled: state.canHeadings[index],
      run: () => editor.chain().focus().toggleHeading({ level }).run(),
    })),
    ...(compact
      ? TEXT_ALIGNMENTS.map((textAlign, index) => ({
          id: `align-${textAlign}`,
          label: copy.alignment[textAlign],
          pressed: state.alignment[index],
          enabled:
            editor.can().updateAttributes('paragraph', { textAlign }) ||
            editor.can().updateAttributes('heading', { textAlign }),
          run: () =>
            editor
              .chain()
              .focus()
              .updateAttributes('paragraph', { textAlign })
              .updateAttributes('heading', { textAlign })
              .run(),
        }))
      : []),
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
  const shown = compact
    ? controls.filter(
        (control) =>
          [
            'bullet-list',
            'ordered-list',
            'bold',
            'italic',
            'underline',
            'heading-1',
            'heading-2',
            'heading-3',
            'heading-4',
            'undo',
            'redo',
          ].includes(control.id) || control.id.startsWith('align-'),
      )
    : controls
  const enabled = shown.filter((control) => control.enabled && !disabled)
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
    <div className="editor-style-panel">
      <FontFamilyControl editor={editor} disabled={disabled} />
      <FontSizeControls editor={editor} disabled={disabled} />
      <p id={hintId} className="sr-only">
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
        {shown.map((control) => (
          <Button
            key={control.id}
            variant="secondary"
            aria-label={control.label}
            title={control.label}
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
            {control.id.startsWith('align-') ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4 5h16M4 12h16M4 19h16" />
                <path
                  d={
                    control.id === 'align-center'
                      ? 'M7 8.5h10M7 15.5h10'
                      : control.id === 'align-right'
                        ? 'M9 8.5h11M9 15.5h11'
                        : control.id === 'align-justify'
                          ? 'M4 8.5h16M4 15.5h16'
                          : 'M4 8.5h11M4 15.5h11'
                  }
                />
              </svg>
            ) : control.id === 'undo' || control.id === 'redo' ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <g
                  transform={
                    control.id === 'redo'
                      ? 'translate(24 0) scale(-1 1)'
                      : undefined
                  }
                >
                  <path d="M9 5 4 10l5 5M4 10h10a5 5 0 0 1 0 10h-3" />
                </g>
              </svg>
            ) : control.id === 'bullet-list' ||
              control.id === 'ordered-list' ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M9 6h12M9 12h12M9 18h12" />
                {control.id === 'bullet-list' ? (
                  <>
                    <circle cx="3.5" cy="6" r="1" fill="currentColor" />
                    <circle cx="3.5" cy="12" r="1" fill="currentColor" />
                    <circle cx="3.5" cy="18" r="1" fill="currentColor" />
                  </>
                ) : (
                  <path d="M2 3h1v5M2 8h2M2 11c0-2 3-2 3 0 0 1-3 2-3 4h3M2 18h3l-2 2c3-1 3 3-1 2" />
                )}
              </svg>
            ) : control.id === 'bold' ? (
              <strong>B</strong>
            ) : control.id === 'underline' ? (
              <span className="editor-underline-icon" aria-hidden="true">
                U
              </span>
            ) : control.id === 'italic' ? (
              <em>I</em>
            ) : (
              control.label
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}
