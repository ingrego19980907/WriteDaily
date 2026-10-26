export const DEFAULT_FONT_SIZE = 18
export const FONT_SIZES = Array.from({ length: 21 }, (_, index) => index + 12)
export type EditorPreferences = Readonly<{
  schemaVersion: 1
  fontSize: number
  revision: number
}>
export function isFontSize(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 12 &&
    value <= 32
  )
}
export function isEditorPreferences(
  value: unknown,
): value is EditorPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return (
    Object.keys(candidate).length === 3 &&
    candidate.schemaVersion === 1 &&
    isFontSize(candidate.fontSize) &&
    typeof candidate.revision === 'number' &&
    Number.isSafeInteger(candidate.revision) &&
    candidate.revision > 0
  )
}
