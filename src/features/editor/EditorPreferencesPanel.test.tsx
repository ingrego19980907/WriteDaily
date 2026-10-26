import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { en } from '../../app/i18n/en'
import {
  getEditorPreferences,
  saveEditorPreferences,
} from '../../services/editor-preferences'
import { EditorPreferencesPanel } from './EditorPreferencesPanel'
import type { EditorPreferences } from './editor-preferences'

vi.mock('../../services/editor-preferences', () => ({
  getEditorPreferences: vi.fn(),
  saveEditorPreferences: vi.fn(),
}))
const copy = en.editorPreferences
const initial: EditorPreferences = {
  schemaVersion: 1,
  fontSize: 18,
  revision: 1,
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getEditorPreferences).mockResolvedValue(initial)
})
async function open() {
  const onFontSize = vi.fn()
  const onPending = vi.fn()
  const view = render(
    <EditorPreferencesPanel
      onFontSize={onFontSize}
      onPending={onPending}
      disabled={false}
    />,
  )
  const user = userEvent.setup()
  await user.click(screen.getByText(copy.title))
  const field = await screen.findByRole('combobox', { name: copy.fontSize })
  return { ...view, user, field, onFontSize, onPending }
}
test('applies loaded settings and applies changed size only after successful commit', async () => {
  let commit!: (result: EditorPreferences) => void
  vi.mocked(saveEditorPreferences).mockReturnValue(
    new Promise((resolve) => {
      commit = resolve
    }),
  )
  const { user, field, onFontSize, onPending } = await open()
  expect(onFontSize).toHaveBeenLastCalledWith(18)
  await user.selectOptions(field, '32')
  expect(onFontSize).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: copy.save }))
  expect(saveEditorPreferences).toHaveBeenCalledExactlyOnceWith(32, 1)
  expect(field).toBeDisabled()
  expect(onPending).toHaveBeenLastCalledWith(true)
  expect(screen.queryByText(copy.saved)).not.toBeInTheDocument()
  await act(async () => {
    commit({ schemaVersion: 1, fontSize: 32, revision: 2 })
  })
  expect(onFontSize).toHaveBeenLastCalledWith(32)
  expect(onPending).toHaveBeenLastCalledWith(false)
  expect(screen.getByRole('status', { name: copy.status })).toHaveTextContent(
    copy.saved,
  )
  expect(screen.getByRole('button', { name: copy.save })).toBeDisabled()
})
test('transient failure retains draft and prior size for explicit retry', async () => {
  vi.mocked(saveEditorPreferences)
    .mockRejectedValueOnce({ code: 'persistence' })
    .mockResolvedValueOnce({ ...initial, fontSize: 12, revision: 2 })
  const { user, field, onFontSize } = await open()
  await user.selectOptions(field, '12')
  await user.click(screen.getByRole('button', { name: copy.save }))
  expect(screen.getByRole('alert')).toHaveTextContent(copy.failure)
  expect(field).toHaveValue('12')
  expect(onFontSize).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: copy.save }))
  expect(onFontSize).toHaveBeenLastCalledWith(12)
  expect(saveEditorPreferences).toHaveBeenLastCalledWith(12, 1)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
test.each(['conflict', 'invalid_stored_data', 'limit_reached'])(
  'blocks %s until an explicit validated reload',
  async (code) => {
    vi.mocked(saveEditorPreferences).mockRejectedValue({ code })
    const { user, field, onFontSize } = await open()
    await user.selectOptions(field, '24')
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(field).toHaveValue('24')
    expect(field).toBeDisabled()
    expect(onFontSize).toHaveBeenLastCalledWith(18)
    vi.mocked(getEditorPreferences).mockResolvedValue({
      ...initial,
      fontSize: 20,
      revision: 2,
    })
    await user.click(screen.getByRole('button', { name: copy.reload }))
    await waitFor(() => expect(field).toBeEnabled())
    expect(field).toHaveValue('20')
    expect(onFontSize).toHaveBeenLastCalledWith(20)
  },
)
test('read failure does not replace saved preferences with defaults and can be retried', async () => {
  vi.mocked(getEditorPreferences)
    .mockRejectedValueOnce({ code: 'persistence' })
    .mockResolvedValueOnce({ ...initial, fontSize: 22 })
  const onFontSize = vi.fn()
  render(
    <EditorPreferencesPanel
      onFontSize={onFontSize}
      onPending={vi.fn()}
      disabled={false}
    />,
  )
  const user = userEvent.setup()
  expect(await screen.findByRole('alert')).toHaveTextContent(copy.loadFailure)
  await user.click(screen.getByText(copy.title))
  expect(onFontSize).not.toHaveBeenCalled()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: copy.reload }))
  await screen.findByRole('combobox')
  expect(onFontSize).toHaveBeenLastCalledWith(22)
})
test('dismissed read cannot apply stale settings after unmount', async () => {
  let resolve!: (result: EditorPreferences) => void
  vi.mocked(getEditorPreferences).mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const onFontSize = vi.fn()
  const view = render(
    <EditorPreferencesPanel
      onFontSize={onFontSize}
      onPending={vi.fn()}
      disabled={false}
    />,
  )
  await act(async () => {
    await Promise.resolve()
  })
  view.unmount()
  await act(async () => {
    resolve(initial)
  })
  expect(onFontSize).not.toHaveBeenCalled()
})
test('external manuscript/navigation lock rejects form submission', async () => {
  const { field, rerender, onFontSize, onPending } = await open()
  fireEvent.change(field, { target: { value: '24' } })
  rerender(
    <EditorPreferencesPanel
      onFontSize={onFontSize}
      onPending={onPending}
      disabled
    />,
  )
  fireEvent.submit(field.closest('form')!)
  expect(saveEditorPreferences).not.toHaveBeenCalled()
})
