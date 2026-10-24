import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ProgressBar } from './ProgressBar'

test.each([
  [-5, 0],
  [25, 25],
  [75, 50],
])('clamps value %s to %s for a maximum of 50', (value, expected) => {
  render(<ProgressBar label="Book progress" value={value} max={50} />)
  const progress = screen.getByRole('progressbar', { name: 'Book progress' })
  expect(progress).toHaveAttribute('aria-valuemin', '0')
  expect(progress).toHaveAttribute('aria-valuemax', '50')
  expect(progress).toHaveAttribute('aria-valuenow', String(expected))
  expect(progress.firstElementChild).toHaveStyle({
    width: `${(expected / 50) * 100}%`,
  })
})

test.each([0, -10, NaN, Infinity])(
  'uses a safe maximum when max is %s',
  (max) => {
    render(<ProgressBar label="Daily progress" value={150} max={max} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuemax',
      '100',
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  },
)

test.each([undefined, null, NaN, Infinity, -Infinity])(
  'represents value %s as unknown rather than claiming completion',
  (value) => {
    render(<ProgressBar label="Writing progress" value={value} />)
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  },
)

test('forwards ref, ID and a caller-localized accessible value description', () => {
  const ref = createRef<HTMLDivElement>()
  render(
    <ProgressBar
      ref={ref}
      id="book-progress"
      label="Book progress"
      value={25000}
      max={50000}
      aria-valuetext="25,000 of 50,000 words"
    />,
  )
  const progress = screen.getByRole('progressbar', { name: 'Book progress' })
  expect(ref.current).toBe(progress)
  expect(progress).toHaveAttribute('id', 'book-progress')
  expect(progress).toHaveAttribute('aria-valuetext', '25,000 of 50,000 words')
  expect(progress).not.toHaveAttribute('tabindex')
})

test('updates between determinate and unknown values without stale semantics', () => {
  const { rerender } = render(<ProgressBar label="Progress" value={20} />)
  const progress = screen.getByRole('progressbar')
  rerender(<ProgressBar label="Progress" value={null} />)
  expect(progress).not.toHaveAttribute('aria-valuenow')
  expect(progress.firstElementChild).not.toHaveStyle({ width: '20%' })
  rerender(<ProgressBar label="Progress" value={60} />)
  expect(progress).toHaveAttribute('aria-valuenow', '60')
  expect(progress.firstElementChild).toHaveStyle({ width: '60%' })
})
