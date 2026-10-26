import { expect, test } from 'vitest'
import {
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  isEditorPreferences,
  isFontSize,
} from './editor-preferences'

test('font size boundaries, default and available choices agree', () => {
  expect(DEFAULT_FONT_SIZE).toBe(18)
  expect(FONT_SIZES).toHaveLength(21)
  expect(FONT_SIZES[0]).toBe(12)
  expect(FONT_SIZES.at(-1)).toBe(32)
  for (const size of FONT_SIZES) expect(isFontSize(size)).toBe(true)
})
test.each([11, 33, -1, 18.5, NaN, Infinity, '18', null, undefined, {}])(
  'rejects unsupported text size %j',
  (size) => expect(isFontSize(size)).toBe(false),
)
test('native snapshot decoding rejects unsupported versions, unsafe revisions and extra fields', () => {
  const valid = {
    schemaVersion: 1,
    fontSize: 19,
    revision: Number.MAX_SAFE_INTEGER,
  }
  expect(isEditorPreferences(valid)).toBe(true)
  for (const candidate of [
    null,
    [],
    {},
    { ...valid, fontSize: '19' },
    { ...valid, schemaVersion: 2 },
    { ...valid, revision: 0 },
    { ...valid, revision: 1.5 },
    { ...valid, revision: Number.MAX_SAFE_INTEGER + 1 },
    { ...valid, extra: 'untrusted' },
  ])
    expect(isEditorPreferences(candidate)).toBe(false)
})
