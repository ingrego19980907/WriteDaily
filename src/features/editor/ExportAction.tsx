import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { chapterErrorCode } from './chapter-errors'

type ExportCopy = {
  readonly action: string
  readonly pending: string
  readonly cancelled: string
  readonly exported: (fileName: string) => string
  readonly conflict: string
  readonly missing: string
  readonly exists: string
  readonly destination: string
  readonly invalid: string
  readonly desktop: string
  readonly failure: string
  readonly empty?: string
  readonly tooLarge?: string
}
type FileResult =
  | { readonly status: 'cancelled' }
  | { readonly status: 'exported'; readonly fileName: string }

export function ExportAction({
  copy,
  label,
  exportFile,
  disabled,
  hintId,
  onPending,
}: {
  copy: ExportCopy
  label: string
  exportFile: () => Promise<FileResult>
  disabled: boolean
  hintId: string
  onPending: (pending: boolean) => void
}) {
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const inFlight = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function run() {
    if (disabled || inFlight.current) return
    const restoreFocus = document.activeElement === trigger.current
    inFlight.current = true
    setPending(true)
    setFailure('')
    setNotice(copy.pending)
    onPending(true)
    try {
      const result = await exportFile()
      if (!mounted.current) return
      setNotice(
        result.status === 'cancelled'
          ? copy.cancelled
          : copy.exported(result.fileName),
      )
    } catch (error: unknown) {
      if (!mounted.current) return
      setNotice('')
      const code = chapterErrorCode(error)
      setFailure(
        code === 'empty_book'
          ? (copy.empty ?? copy.failure)
          : code === 'too_large'
            ? (copy.tooLarge ?? copy.failure)
            : code === 'conflict'
              ? copy.conflict
              : code === 'not_found'
                ? copy.missing
                : code === 'already_exists'
                  ? copy.exists
                  : code === 'invalid_destination'
                    ? copy.destination
                    : code === 'invalid_stored_data'
                      ? copy.invalid
                      : code === 'desktop_required'
                        ? copy.desktop
                        : copy.failure,
      )
    } finally {
      inFlight.current = false
      if (mounted.current) {
        setPending(false)
        onPending(false)
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
    <div className="flex min-w-0 flex-col items-start">
      <Button
        ref={trigger}
        variant="secondary"
        disabled={disabled || pending}
        aria-label={label}
        aria-describedby={hintId}
        onClick={() => void run()}
      >
        <Download
          size={18}
          strokeWidth={1.6}
          aria-hidden="true"
          focusable="false"
        />
        {pending ? copy.pending : copy.action}
      </Button>
      <p
        role="status"
        className="mt-2 text-secondary text-sm break-words empty:mt-0"
      >
        {notice}
      </p>
      {failure && (
        <p role="alert" className="mt-2 text-error text-sm break-words">
          {failure}
        </p>
      )}
    </div>
  )
}
