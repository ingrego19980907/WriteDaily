import { useEffect, useId, useRef, useState } from 'react'
import { HardDriveDownload } from 'lucide-react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { createLibraryBackup } from '../../services/backups'
import { bookErrorCode } from '../../services/books'
import { LibraryRestore } from './LibraryRestore'

const copy = en.libraryBackup

export function LibraryBackup() {
  const headingId = useId()
  const hintId = useId()
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function run() {
    if (inFlight.current) return
    inFlight.current = true
    const restoreFocus = document.activeElement === trigger.current
    setPending(true)
    setNotice(copy.pending)
    setFailure('')
    try {
      const result = await createLibraryBackup({
        title: copy.dialogTitle,
        fileType: copy.fileType,
      })
      if (!mounted.current) return
      setNotice(
        result.status === 'cancelled'
          ? copy.cancelled
          : copy.created(
              result.fileName,
              result.bookCount,
              result.chapterCount,
              result.coverCount,
            ),
      )
    } catch (error: unknown) {
      if (!mounted.current) return
      setNotice('')
      const code = bookErrorCode(error)
      setFailure(
        code === 'desktop_required'
          ? copy.desktop
          : code === 'invalid_source'
            ? copy.invalid
            : code === 'too_large'
              ? copy.tooLarge
              : code === 'busy'
                ? copy.busy
                : code === 'already_exists'
                  ? copy.exists
                  : code === 'invalid_destination'
                    ? copy.destination
                    : copy.failure,
      )
    } finally {
      inFlight.current = false
      if (mounted.current) {
        setPending(false)
        if (restoreFocus)
          requestAnimationFrame(() => {
            if (
              mounted.current &&
              trigger.current?.isConnected &&
              (document.activeElement === document.body ||
                document.activeElement === trigger.current)
            )
              trigger.current.focus({ preventScroll: true })
          })
      }
    }
  }

  return (
    <section aria-labelledby={headingId}>
      <Card className="space-y-3">
        <h2 id={headingId} className="font-writing text-xl">
          {copy.heading}
        </h2>
        <p id={hintId} className="text-secondary text-sm">
          {copy.description}
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <Button
            ref={trigger}
            variant="secondary"
            disabled={pending}
            aria-describedby={hintId}
            onClick={() => void run()}
          >
            <HardDriveDownload
              size={18}
              strokeWidth={1.6}
              aria-hidden="true"
              focusable="false"
            />
            {pending ? copy.pendingAction : copy.action}
          </Button>
          <LibraryRestore />
        </div>
        <p
          role="status"
          className="text-secondary text-sm break-words empty:sr-only"
        >
          {notice}
        </p>
        {failure && (
          <p role="alert" className="text-error text-sm break-words">
            {failure}
          </p>
        )}
      </Card>
    </section>
  )
}
