import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { CoverDraftPreview } from './CoverDraftPreview'

test('rapid file changes display the latest selection rather than a stale read', async () => {
  const first = new File(['first'], 'first.png', { type: 'image/png' })
  const second = new File(['second'], 'second.png', { type: 'image/png' })
  const { rerender } = render(
    <CoverDraftPreview file={first} fallback={<p>Saved cover</p>} />,
  )
  rerender(<CoverDraftPreview file={second} fallback={<p>Saved cover</p>} />)
  expect(
    await screen.findByRole('img', { name: 'Unsaved cover preview' }),
  ).toHaveAttribute('src', 'data:image/png;base64,c2Vjb25k')
})

test('an undecodable draft falls back to the saved cover without changing it', async () => {
  const file = new File(['invalid'], 'invalid.png', { type: 'image/png' })
  render(
    <CoverDraftPreview
      file={file}
      fallback={<img src="saved.png" alt="Book cover" />}
    />,
  )
  fireEvent.error(
    await screen.findByRole('img', { name: 'Unsaved cover preview' }),
  )
  expect(screen.getByRole('img', { name: 'Book cover' })).toHaveAttribute(
    'src',
    'saved.png',
  )
  expect(screen.getByText(/could not be previewed/)).toBeVisible()
})
