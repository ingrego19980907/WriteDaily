import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import {
  getEditorPreferences,
  saveEditorPreferences,
} from '../../services/editor-preferences'
import {
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  type EditorPreferences,
} from './editor-preferences'
import { chapterErrorCode } from './chapter-errors'

const copy = en.editorPreferences

export function EditorPreferencesPanel({
  onFontSize,
  onPending,
  disabled,
}: {
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

  async function save() {
    if (
      !snapshot ||
      pending.current ||
      disabled ||
      loading ||
      blocked ||
      draft === snapshot.fontSize
    )
      return
    const token = ++request.current
    pending.current = true
    setSaving(true)
    setSaved(false)
    onPending(true)
    try {
      const result = await saveEditorPreferences(draft, snapshot.revision)
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

  return (
    <div className="min-w-0 space-y-2">
      <details className="rounded-lg border border-secondary p-3">
        <summary className="cursor-pointer font-semibold">{copy.title}</summary>
        <div className="mt-3 space-y-3">
          <p id={hintId} className="text-secondary">
            {copy.hint}
          </p>
          {snapshot && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                void save()
              }}
            >
              <label htmlFor={sizeId} className="block font-semibold">
                {copy.fontSize}
              </label>
              <select
                id={sizeId}
                className="input w-full min-w-0"
                value={draft}
                aria-describedby={hintId}
                disabled={disabled || saving || loading || blocked}
                onChange={(event) => {
                  setDraft(Number(event.target.value))
                  setSaved(false)
                }}
              >
                {FONT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {copy.size(size)}
                  </option>
                ))}
              </select>
              <Button
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
            </form>
          )}
        </div>
      </details>
      <p role="status" aria-label={copy.status} aria-atomic="true">
        {loading
          ? copy.loading
          : saving
            ? copy.saving
            : saved
              ? copy.saved
              : ''}
      </p>
      {failure && (
        <>
          <p role="alert" className="text-error">
            {failure}
          </p>
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
