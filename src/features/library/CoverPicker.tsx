import type { Ref } from 'react'
import { en } from '../../app/i18n/en'
import './book-card.css'

const copy = en.library
export function CoverPicker({
  id,
  inputRef,
  file,
  pending,
  failure,
  invalid,
  onChange,
}: {
  id: string
  inputRef?: Ref<HTMLInputElement>
  file: File | null
  pending: boolean
  failure: string
  invalid?: boolean
  onChange: (file: File | null) => void
}) {
  return (
    <label htmlFor={id} className="cover-picker">
      <svg
        className="cover-picker__icon"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 32 32"
        width="40"
        height="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 28H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11l7 7v7" />
        <path d="M19 4v7h7M21 24h10M26 19v10" />
      </svg>
      <span className="cover-picker__title">{copy.coverChoose}</span>
      <span id={`${id}-hint`} className="cover-picker__hint">
        {copy.coverHint}
      </span>
      {file && <span className="cover-picker__filename">{file.name}</span>}
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={pending}
        aria-label={copy.cover}
        aria-describedby={`${id}-hint${failure ? ` ${id}-error` : ''}`}
        aria-invalid={invalid ? true : undefined}
        className="cover-picker__input"
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null)
        }}
      />
    </label>
  )
}
