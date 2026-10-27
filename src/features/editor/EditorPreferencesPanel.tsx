import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import {
  getEditorPreferences,
  saveEditorPreferences,
} from '../../services/editor-preferences'
import {
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  isFontSize,
  type EditorPreferences,
} from './editor-preferences'
import { chapterErrorCode } from './chapter-errors'

const copy = en.editorPreferences

export function EditorPreferencesPanel({
  onFontSize,
  onPending,
  disabled,
  controlsTarget,
  compact = false,
}: {
  controlsTarget?: HTMLElement | null
  compact?: boolean
  onFontSize: (fontSize: number) => void
  onPending: (pending: boolean) => void
  disabled: boolean
}) {
  const [snapshot, setSnapshot] = useState<EditorPreferences | null>(null)
  const [draft, setDraft] = useState(DEFAULT_FONT_SIZE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [saved, setSaved] = useState(false)
  const request = useRef(0)
  const pending = useRef(false)
  const sizeId = useId()
  const hintId = useId()
  const load = useCallback(async () => {
    const token = ++request.current
    try {
      const result = await getEditorPreferences()
      if (token !== request.current) return
      setSnapshot(result)
      setDraft(result.fontSize)
      onFontSize(result.fontSize)
      setFailure('')
      setBlocked(false)
    } catch {
      if (token === request.current) {
        setFailure(copy.loadFailure)
        setBlocked(true)
      }
    } finally {
      if (token === request.current) setLoading(false)
    }
  }, [onFontSize])
  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) void load()
    })
    return () => {
      active = false
      request.current += 1
    }
  }, [load])

  async function save(next = draft) {
    if (
      !snapshot ||
      pending.current ||
      disabled ||
      loading ||
      blocked ||
      next === snapshot.fontSize
    )
      return
    const token = ++request.current
    pending.current = true
    setSaving(true)
    setSaved(false)
    onPending(true)
    try {
      const result = await saveEditorPreferences(next, snapshot.revision)
      if (token !== request.current) return
      setSnapshot(result)
      setDraft(result.fontSize)
      onFontSize(result.fontSize)
      setSaved(true)
      setFailure('')
    } catch (error) {
      if (token !== request.current) return
      const code = chapterErrorCode(error)
      const cannotRetry =
        code === 'conflict' ||
        code === 'invalid_stored_data' ||
        code === 'limit_reached'
      setBlocked(cannotRetry)
      setFailure(
        code === 'conflict'
          ? copy.conflict
          : cannotRetry
            ? copy.invalid
            : copy.failure,
      )
    } finally {
      if (token === request.current) {
        pending.current = false
        setSaving(false)
        onPending(false)
      }
    }
  }

  function changeSize(next: number) {
    if (pending.current || disabled || loading || blocked || !isFontSize(next))
      return
    setDraft(next)
    setSaved(false)
    if (compact) void save(next)
  }

  const controls = snapshot ? (
    <form
      className={compact ? 'editor-font-controls' : 'space-y-3'}
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <label
        htmlFor={sizeId}
        className={compact ? 'sr-only' : 'block font-semibold'}
      >
        {copy.fontSize}
      </label>
      {compact && (
        <Button
          variant="ghost"
          aria-label={copy.decrease}
          title={copy.decrease}
          disabled={disabled || saving || loading || blocked || draft <= 12}
          onClick={() => {
            changeSize(Math.max(12, draft - 1))
          }}
        >
          −
        </Button>
      )}
      <select
        id={sizeId}
        className={
          compact ? 'input editor-font-select' : 'input w-full min-w-0'
        }
        value={draft}
        aria-describedby={hintId}
        disabled={disabled || saving || loading || blocked}
        onChange={(event) => {
          changeSize(Number(event.target.value))
        }}
      >
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {compact ? size : copy.size(size)}
          </option>
        ))}
      </select>
      {compact && (
        <Button
          variant="ghost"
          aria-label={copy.increase}
          title={copy.increase}
          disabled={disabled || saving || loading || blocked || draft >= 32}
          onClick={() => {
            changeSize(Math.min(32, draft + 1))
          }}
        >
          +
        </Button>
      )}
      {!compact && (
        <Button
          aria-label={saving ? copy.saving : copy.save}
          title={copy.save}
          type="submit"
          disabled={
            disabled ||
            saving ||
            loading ||
            blocked ||
            draft === snapshot.fontSize
          }
        >
          {saving ? copy.saving : copy.save}
        </Button>
      )}
    </form>
  ) : null
  return (
    <div className="min-w-0 space-y-2">
      {compact ? (
        controlsTarget ? (
          createPortal(
            <div className="editor-font-settings">
              <span id={hintId} className="sr-only">
                {compact ? copy.autoHint : copy.hint}
              </span>
              {controls}
            </div>,
            controlsTarget,
          )
        ) : null
      ) : (
        <details className="rounded-lg border border-secondary p-3">
          <summary className="cursor-pointer font-semibold">
            {copy.title}
          </summary>
          <div className="mt-3 space-y-3">
            <p id={hintId} className="text-secondary">
              {compact ? copy.autoHint : copy.hint}
            </p>
            {controls}
          </div>
        </details>
      )}
      <p role="status" aria-label={copy.status} aria-atomic="true">
        {loading
          ? copy.loading
          : saving
            ? copy.saving
            : saved && !compact
              ? copy.saved
              : ''}
      </p>
      {failure && (
        <>
          <p role="alert" className="text-error">
            {failure}
          </p>
          {compact && snapshot && !blocked && (
            <Button
              variant="secondary"
              disabled={disabled || saving || loading}
              onClick={() => {
                void save()
              }}
            >
              {copy.retry}
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={disabled || saving || loading}
            onClick={() => {
              setLoading(true)
              setSaved(false)
              void load()
            }}
          >
            {copy.reload}
          </Button>
        </>
      )}
    </div>
  )
}
