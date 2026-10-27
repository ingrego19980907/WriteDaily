import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { BookDeadline } from './BookDeadline'

afterEach(() => vi.useRealTimers())
test('shows readable deadline states with a machine-readable date and no false urgency for completed books', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 27, 12))
  const { rerender } = render(<BookDeadline value={null} />)
  expect(screen.getByLabelText('Book deadline')).toHaveTextContent(
    'No deadline',
  )
  rerender(<BookDeadline value="2026-10-27" />)
  expect(screen.getByLabelText('Book deadline')).toHaveTextContent('Due today')
  expect(screen.getByText('Oct 27, 2026')).toHaveAttribute(
    'datetime',
    '2026-10-27',
  )
  rerender(<BookDeadline value="2026-10-26" />)
  expect(screen.getByLabelText('Book deadline')).toHaveTextContent(
    '1 day overdue',
  )
  rerender(<BookDeadline value="2026-10-29" />)
  expect(screen.getByLabelText('Book deadline')).toHaveTextContent(
    '2 days left',
  )
  rerender(<BookDeadline value="2026-10-26" completed />)
  expect(screen.getByLabelText('Book deadline')).toHaveTextContent(
    'Book completed',
  )
  expect(screen.queryByText(/overdue/)).not.toBeInTheDocument()
  rerender(<BookDeadline value="bad date" />)
  expect(screen.getByLabelText('Book deadline')).toHaveTextContent(
    'Deadline unavailable',
  )
})
