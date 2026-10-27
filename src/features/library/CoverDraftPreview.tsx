import { useEffect, useState, type ReactNode } from 'react'
import { en } from '../../app/i18n/en'

export function CoverDraftPreview({
  file,
  fallback,
}: {
  file: File
  fallback: ReactNode
}) {
  const [preview, setPreview] = useState<{
    file: File
    url: string | null
  } | null>(null)
  useEffect(() => {
    let active = true
    const reader = new FileReader()
    reader.onload = () => {
      if (active)
        setPreview({
          file,
          url: typeof reader.result === 'string' ? reader.result : null,
        })
    }
    reader.onerror = () => {
      if (active) setPreview({ file, url: null })
    }
    reader.readAsDataURL(file)
    return () => {
      active = false
      if (reader.readyState === FileReader.LOADING) reader.abort()
    }
  }, [file])
  const current = preview?.file === file ? preview : null
  return current?.url ? (
    <div className="book-cover-image">
      <img
        src={current.url}
        alt={en.library.coverDraftAlt}
        onError={() => setPreview({ file, url: null })}
      />
    </div>
  ) : (
    <>
      {fallback}
      {current && (
        <p className="text-secondary text-sm">
          {en.library.coverPreviewFailure}
        </p>
      )}
    </>
  )
}
