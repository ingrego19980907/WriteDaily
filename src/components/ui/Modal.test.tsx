import { StrictMode, useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Button } from './Button'
import { Input } from './Input'
import { Modal } from './Modal'

function Example({ description = 'Edit the details.', preventClose = false }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Modal
        open={open}
        onOpenChange={(next) => {
          if (next || !preventClose) setOpen(next)
        }}
        trigger={<Button>Open details</Button>}
        title="Details"
        description={description}
        closeLabel="Close"
      >
        <Input label="Title" />
        <Button>Save</Button>
      </Modal>
      <Button>Outside action</Button>
    </>
  )
}

test('opens by keyboard with an accessible title/description and initial focus', async () => {
  const user = userEvent.setup()
  render(<Example />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.tab()
  await user.keyboard('{Enter}')

  const dialog = await screen.findByRole('dialog', { name: 'Details' })
  expect(dialog).toHaveAccessibleDescription('Edit the details.')
  expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
  expect(
    screen.queryByRole('button', { name: 'Outside action' }),
  ).not.toBeInTheDocument()
})

test('traps Tab and Shift+Tab within the modal', async () => {
  const user = userEvent.setup()
  render(<Example />)
  await user.click(screen.getByRole('button', { name: 'Open details' }))
  const close = screen.getByRole('button', { name: 'Close' })
  const save = screen.getByRole('button', { name: 'Save' })

  await user.tab({ shift: true })
  expect(save).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus()
  await user.tab()
  expect(save).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
})

test('Escape closes and restores focus to the trigger in StrictMode', async () => {
  const user = userEvent.setup()
  render(
    <StrictMode>
      <Example />
    </StrictMode>,
  )
  const trigger = screen.getByRole('button', { name: 'Open details' })
  await user.click(trigger)
  await user.keyboard('{Escape}')

  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  await waitFor(() => expect(trigger).toHaveFocus())
  expect(screen.getByRole('button', { name: 'Outside action' })).toBeVisible()
})

test('the Close button dismisses and the modal can be reopened', async () => {
  const user = userEvent.setup()
  render(<Example />)
  const trigger = screen.getByRole('button', { name: 'Open details' })
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(trigger).toHaveFocus())
  await user.keyboard(' ')
  expect(await screen.findByRole('dialog', { name: 'Details' })).toBeVisible()
})

test('an overlay pointer click dismisses the modal', async () => {
  const user = userEvent.setup()
  render(<Example />)
  await user.click(screen.getByRole('button', { name: 'Open details' }))
  // The backdrop is intentionally outside the accessibility tree.
  const overlay = document.querySelector('.modal-overlay')
  expect(overlay).toBeInstanceOf(HTMLElement)
  if (!(overlay instanceof HTMLElement)) throw new Error('Missing backdrop')
  await user.click(overlay)
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
})

test('the caller can refuse dismissal to retain pending form content', async () => {
  const user = userEvent.setup()
  render(<Example preventClose />)
  await user.click(screen.getByRole('button', { name: 'Open details' }))
  await user.type(
    screen.getByRole('textbox', { name: 'Title' }),
    'Unsaved title',
  )
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(
    'Unsaved title',
  )
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByRole('dialog')).toBeVisible()
})

test('omits description references when no description is supplied', async () => {
  const user = userEvent.setup()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    render(<Example description="" />)
    await user.click(screen.getByRole('button', { name: 'Open details' }))
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby')
    expect(warn).not.toHaveBeenCalled()
  } finally {
    warn.mockRestore()
  }
})
