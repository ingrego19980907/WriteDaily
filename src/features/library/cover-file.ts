import { en } from '../../app/i18n/en'

const copy = en.library
const MAX_COVER_BYTES = 5 * 1024 * 1024

export function coverFileError(file: File | null): string {
  if (!file) return ''
  if (file.size > MAX_COVER_BYTES) return copy.coverTooLarge
  if (
    !file.size ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
  )
    return copy.coverInvalid
  return ''
}
