import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { BookCardProgress } from './BookCardProgress'

test.each([
  [0, 1000, '0%', '0 / 1,000 words', '0', false],
  [250, 1000, '25%', '250 / 1,000 words', '250', false],
  [999, 1000, '99.9%', '999 / 1,000 words', '999', false],
  [1500, 1000, '100%', '1,500 / 1,000 words', '1000', true],
  [
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    '100%',
    '9,007,199,254,740,991 / 9,007,199,254,740,991 words',
    String(Number.MAX_SAFE_INTEGER),
    true,
  ],
] as const)(
  'compact progress preserves calculated values for %s/%s',
  (wordCount, targetWordCount, percentage, count, now, reached) => {
    const { container } = render(
      <BookCardProgress
        wordCount={wordCount}
        targetWordCount={targetWordCount}
      />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      now,
    )
    expect(screen.getByText(count)).toBeVisible()
    expect(screen.getByText(percentage)).toBeVisible()
    expect(container.querySelector('.book-card-progress')).toHaveAttribute(
      'data-reached',
      String(reached),
    )
  },
)

test('unknown counts stay indeterminate rather than borrowing zero or 100%', () => {
  render(<BookCardProgress wordCount={null} targetWordCount={1000} />)
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  expect(screen.getByRole('progressbar')).toHaveAccessibleDescription(
    'Word count unavailable',
  )
  expect(screen.queryByText('0%')).not.toBeInTheDocument()
})

test.each([500, null])(
  'missing target renders count availability without an invented percentage (%s)',
  (wordCount) => {
    render(<BookCardProgress wordCount={wordCount} targetWordCount={null} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        wordCount === null ? 'Word count unavailable' : '500 words written',
      ),
    ).toBeVisible()
  },
)

test('details retain excess and achievement without adding a second progress bar', () => {
  render(<BookCardProgress wordCount={1500} targetWordCount={1000} details />)
  expect(screen.getByText('500 words above target')).toBeVisible()
  expect(screen.getByText('Word target reached')).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})
