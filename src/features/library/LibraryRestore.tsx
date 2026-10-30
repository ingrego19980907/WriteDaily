import { useEffect, useRef, useState } from 'react'
import { ArchiveRestore } from 'lucide-react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { bookErrorCode } from '../../services/books'
import {
  applyLibraryRestore,
  cancelLibraryRestore,
  closeAfterLibraryRestore,
  getLibraryRestoreStatus,
  prepareLibraryRestore,
  type RestorePreview,
} from '../../services/restores'

const copy = en.libraryRestore
export function LibraryRestore() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [selection, setSelection] = useState<RestorePreview | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [phase, setPhase] = useState<'ready' | 'restored' | 'close_required'>(
    'ready',
  )
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const inFlight = useRef(false)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (phase !== 'ready') closeButton.current?.focus()
  }, [phase])

  function explain(error: unknown) {
    const code = bookErrorCode(error)
    return code === 'desktop_required'
      ? copy.desktop
      : code === 'invalid_backup'
        ? copy.invalid
        : code === 'unsupported_backup'
          ? copy.unsupported
          : code === 'too_large'
            ? copy.tooLarge
            : code === 'busy'
              ? copy.busy
              : code === 'conflict'
                ? copy.conflict
                : code === 'safety_backup_failed'
                  ? copy.safetyFailed
                  : copy.failed
  }
  async function choose() {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setFailure('')
    setNotice(copy.preparing)
    setConfirmed(false)
    setSelection(null)
    try {
      const result = await prepareLibraryRestore({
        title: copy.dialogTitle,
        fileType: copy.fileType,
      })
      if (result.status === 'cancelled') {
        setNotice(copy.cancelled)
        return
      }
      setSelection(result.preview)
      setNotice('')
    } catch (error) {
      if (bookErrorCode(error) === 'close_required') {
        setPhase('close_required')
        setFailure(copy.uncertain)
      } else setFailure(explain(error))
      setNotice('')
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  async function dismiss(next: boolean) {
    if (next) {
      setOpen(true)
      setFailure('')
      setNotice('')
      return
    }
    if (inFlight.current || phase !== 'ready') return
    inFlight.current = true
    setPending(true)
    if (selection) {
      try {
        await cancelLibraryRestore(selection.token)
      } catch {
        /* Only private preview files; live data is untouched. */
      }
    }
    setSelection(null)
    setConfirmed(false)
    setOpen(false)
    inFlight.current = false
    setPending(false)
  }
  async function restore() {
    if (!selection || !confirmed || inFlight.current) return
    inFlight.current = true
    setPending(true)
    setFailure('')
    setNotice(copy.restoring)
    try {
      await applyLibraryRestore(selection.token)
      setPhase('restored')
      setNotice(copy.restored)
    } catch (error) {
      // A dropped reply may follow a committed restore. Ask native state before
      // offering any further action; an unreachable state must remain fenced.
      try {
        const current = await getLibraryRestoreStatus()
        if (current.status === 'restored') {
          setPhase('restored')
          setNotice(copy.restored)
        } else if (current.status === 'close_required') {
          setPhase('close_required')
          setNotice('')
          setFailure(copy.uncertain)
        } else {
          setSelection(null)
          setNotice('')
          setFailure(explain(error))
        }
      } catch {
        setPhase('close_required')
        setNotice('')
        setFailure(copy.uncertain)
      }
      setConfirmed(false)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        void dismiss(next)
      }}
      dismissible={!pending && phase === 'ready'}
      trigger={
        <Button variant="secondary">
          <ArchiveRestore
            size={18}
            strokeWidth={1.6}
            aria-hidden="true"
            focusable="false"
          />
          {copy.action}
        </Button>
      }
      title={copy.action}
      description={copy.description}
      closeLabel={copy.cancel}
    >
      <div className="space-y-4" aria-busy={pending}>
        {phase === 'ready' && (
          <>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => void choose()}
            >
              {copy.choose}
            </Button>
            {selection && (
              <>
                <p className="font-writing text-writing break-words">
                  {selection.fileName}
                </p>
                <p className="text-secondary text-sm">
                  {copy.summary(
                    selection.createdAt,
                    selection.bookCount,
                    selection.chapterCount,
                    selection.coverCount,
                  )}
                </p>
                <p>{copy.warning}</p>
                <label className="flex items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-accent-strong"
                    checked={confirmed}
                    disabled={pending}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  {copy.confirm}
                </label>
                <Button
                  disabled={!confirmed || pending}
                  onClick={() => void restore()}
                >
                  {pending ? copy.restoring : copy.apply}
                </Button>
              </>
            )}
          </>
        )}
        <p
          role="status"
          className="text-secondary text-sm break-words empty:sr-only"
        >
          {notice}
        </p>
        {failure && (
          <p role="alert" className="text-error break-words">
            {failure}
          </p>
        )}
        {phase !== 'ready' && (
          <Button
            ref={closeButton}
            onClick={() => {
              void closeAfterLibraryRestore().catch(() =>
                setFailure(copy.closeFailed),
              )
            }}
          >
            {copy.closeApp}
          </Button>
        )}
      </div>
    </Modal>
  )
}
