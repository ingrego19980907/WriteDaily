import catalog from '../../../resources/manuscript-fonts.json'

export const FONT_FAMILIES = catalog
export const DEFAULT_FONT_FAMILY = 'Georgia'
export function isFontFamily(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    FONT_FAMILIES.some((font) => font.name === value)
  )
}
export function fontFamilyCss(value: string): string {
  const font = FONT_FAMILIES.find((item) => item.name === value)
  return font ? `"${font.name}", ${font.fallback}` : 'var(--font-writing)'
}
