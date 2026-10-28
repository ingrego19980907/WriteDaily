import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { WritingPace } from './WritingPace'

afterEach(() => vi.useRealTimers())

test('renders readable pace and configuration/failure/completion states from committed props', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 27, 12))
  const props = { wordCount: 20, targetWordCount: 120, deadline: '2026-10-29' }
  const { rerender } = render(<WritingPace {...props} />)
  const group = screen.getByRole('group', { name: 'Required writing pace' })
  expect(group).toHaveTextContent('34 words per writing day')
  expect(group).toHaveTextContent('3 writing days available')
  rerender(<WritingPace {...props} deadline="2026-10-27" />)
  expect(group).toHaveTextContent('100 words per writing day')
  expect(group).toHaveTextContent('1 writing day available')
  rerender(<WritingPace {...props} wordCount={null} />)
  expect(group).toHaveTextContent('Writing pace unavailable.')
  expect(group).not.toHaveTextContent('words per writing day')
  rerender(<WritingPace {...props} targetWordCount={null} />)
  expect(group).toHaveTextContent('Set a total word target')
  rerender(<WritingPace {...props} deadline={null} />)
  expect(group).toHaveTextContent('Set a deadline')
  rerender(<WritingPace {...props} deadline="2026-10-26" />)
  expect(group).toHaveTextContent('Deadline passed.')
  rerender(<WritingPace {...props} writingWeekdays={[]} />)
  expect(group).toHaveTextContent('No scheduled writing days')
  rerender(<WritingPace {...props} wordCount={120} />)
  expect(group).toHaveTextContent('Word target reached.')
  rerender(<WritingPace {...props} completed />)
  expect(group).toHaveTextContent('Book completed.')
})

test('updates the pace after local midnight without remounting', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 27, 23, 59, 50))
  render(
    <WritingPace wordCount={0} targetWordCount={100} deadline="2026-10-28" />,
  )
  expect(screen.getByText('50 words per writing day')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(20000))
  expect(screen.getByText('100 words per writing day')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(86400000))
  expect(screen.getByText(/Deadline passed/)).toBeInTheDocument()
})
