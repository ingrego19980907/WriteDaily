import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { BookProgress } from './BookProgress'

test('zero words is determinate zero rather than unknown', () => {
  render(<BookProgress wordCount={0} targetWordCount={1000} />)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByText('0 / 1,000 words · 0% of target')).toBeVisible()
  expect(screen.getByText('1,000 words remaining')).toBeVisible()
})
test('exceeded targets fill to maximum while preserving the actual word count and excess in accessible text', () => {
  render(<BookProgress wordCount={1500} targetWordCount={1000} />)
  const bar = screen.getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuenow', '1000')
  expect(bar).toHaveAttribute('aria-valuemax', '1000')
  expect(bar).toHaveAttribute(
    'aria-valuetext',
    '1,500 / 1,000 words · 100% of target',
  )
  expect(screen.getByText('500 words above target')).toBeVisible()
  expect(screen.getByText('Word target reached')).toBeVisible()
})
test('missing goal shows a known count without a misleading percentage', () => {
  render(<BookProgress wordCount={500} targetWordCount={null} />)
  expect(screen.getByText('500 words written')).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})
test('unknown count never borrows the completion flag or pretends zero; a later count updates semantics', () => {
  const { rerender } = render(<BookProgress targetWordCount={1000} />)
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  expect(screen.getByRole('progressbar')).toHaveAccessibleDescription(
    'Word count unavailable',
  )
  rerender(<BookProgress wordCount={1000} targetWordCount={1000} />)
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '1000',
  )
  expect(screen.getByText('Word target reached')).toBeVisible()
})

test('a previously reached target can become unmet or unavailable without a stale success label', () => {
  const { rerender } = render(
    <BookProgress wordCount={1000} targetWordCount={1000} />,
  )
  expect(screen.getByText('Word target reached')).toBeVisible()
  rerender(<BookProgress wordCount={999} targetWordCount={1000} />)
  expect(screen.queryByText('Word target reached')).not.toBeInTheDocument()
  expect(screen.getByText('1 word remaining')).toBeVisible()
  rerender(<BookProgress wordCount={1000} targetWordCount={1500} />)
  expect(screen.getByText('500 words remaining')).toBeVisible()
  rerender(<BookProgress wordCount={null} targetWordCount={1500} />)
  expect(screen.queryByText('Word target reached')).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  rerender(<BookProgress wordCount={1000} targetWordCount={null} />)
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})
