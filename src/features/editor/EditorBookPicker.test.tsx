import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { listBooks } from '../../services/books'
import { activityBooks } from '../../../tests/fixtures/activity-data'
import { EditorBookPicker } from './EditorBookPicker'

vi.mock('../../services/books', () => ({
  listBooks: vi.fn(),
  bookErrorCode: (error: { code: string }) => error.code,
}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listBooks).mockResolvedValue(activityBooks)
})
const props = () => ({
  onOpenBook: vi.fn(),
  onCancelOpen: vi.fn(),
  openingId: null,
  openFailure: '',
})
test('empty and failed reads have distinct states and retry does not invent an empty library', async () => {
  vi.mocked(listBooks).mockRejectedValueOnce({ code: 'persistence' })
  const user = userEvent.setup()
  const view = render(<EditorBookPicker {...props()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not load your books',
  )
  expect(
    screen.queryByText('No books have been created yet.'),
  ).not.toBeInTheDocument()
  vi.mocked(listBooks).mockResolvedValue([])
  await user.click(screen.getByRole('button', { name: 'Retry loading books' }))
  expect(
    await screen.findByText('No books have been created yet.'),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Start editing' }),
  ).not.toBeInTheDocument()
  view.unmount()
})
test('refreshes when opened, selects by ID and restores focus on cancellation', async () => {
  const user = userEvent.setup()
  const callbacks = props()
  render(<EditorBookPicker {...callbacks} />)
  await user.click(await screen.findByRole('button', { name: 'Start editing' }))
  await waitFor(() => expect(listBooks).toHaveBeenCalledTimes(2))
  const select = await screen.findByRole('combobox', { name: 'Book' })
  expect(
    screen.getByRole('button', { name: 'Open selected book' }),
  ).toBeDisabled()
  await user.selectOptions(select, activityBooks[1].id)
  await user.click(screen.getByRole('button', { name: 'Open selected book' }))
  expect(callbacks.onOpenBook).toHaveBeenCalledWith(activityBooks[1])
  await user.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: 'Start editing' })).toHaveFocus()
  expect(callbacks.onCancelOpen).toHaveBeenCalled()
})
test('pending opens lock selection and failures remain visible inside the chooser', async () => {
  const user = userEvent.setup()
  const callbacks = props()
  const view = render(<EditorBookPicker {...callbacks} />)
  await user.click(await screen.findByRole('button', { name: 'Start editing' }))
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Book' }),
    activityBooks[0].id,
  )
  view.rerender(
    <EditorBookPicker {...callbacks} openingId={activityBooks[0].id} />,
  )
  expect(screen.getByRole('combobox', { name: 'Book' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled()
  view.rerender(
    <EditorBookPicker
      {...callbacks}
      openFailure="Book is no longer available."
    />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Book is no longer available.',
  )
  expect(screen.getByRole('combobox', { name: 'Book' })).toHaveValue(
    activityBooks[0].id,
  )
})
