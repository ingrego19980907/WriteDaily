import { expect, test } from 'vitest'
import cases from '../../../tests/fixtures/chapter-content.json'
import { validateChapterContent } from './chapter-content'

test.each(cases)(
  'shared native/TypeScript content contract: $name',
  ({ input, valid }) => {
    expect(validateChapterContent(input).success).toBe(valid)
  },
)
