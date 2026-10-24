import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { Input } from './Input'

test('connects a visible label, supports keyboard entry and exposes its hint', async () => {
  const user = userEvent.setup()
  render(<Input label="Book title" hint="Use a working title." />)

  const input = screen.getByRole('textbox', { name: 'Book title' })
  await user.click(screen.getByText('Book title'))
  expect(input).toHaveFocus()
  await user.keyboard('My story')
  expect(input).toHaveValue('My story')
  expect(input).toHaveAccessibleDescription('Use a working title.')
})

test('combines external descriptions, hint and error, then clears resolved error state', () => {
  const { rerender } = render(
    <>
      <p id="instructions">Title instructions.</p>
      <Input
        id="title"
        label="Book title"
        hint="Use a working title."
        error="A title is required."
        aria-describedby="instructions"
        aria-invalid={false}
      />
    </>,
  )
  const input = screen.getByLabelText('Book title')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAccessibleDescription(
    'Title instructions. Use a working title. A title is required.',
  )

  rerender(
    <>
      <p id="instructions">Title instructions.</p>
      <Input id="title" label="Book title" hint="Use a working title." />
    </>,
  )
  expect(input).not.toHaveAttribute('aria-invalid')
  expect(input).toHaveAccessibleDescription('Use a working title.')
  expect(screen.queryByText('A title is required.')).not.toBeInTheDocument()
})

test('assigns distinct IDs to multiple automatically labelled inputs', () => {
  render(
    <>
      <Input label="Title" />
      <Input label="Author" />
    </>,
  )
  const title = screen.getByLabelText('Title')
  const author = screen.getByLabelText('Author')
  expect(title.id).not.toBe('')
  expect(title.id).not.toBe(author.id)
})

test('skips disabled fields while read-only fields remain focusable and unchanged', async () => {
  const user = userEvent.setup()
  render(
    <>
      <Input label="Unavailable" disabled />
      <Input label="Reference" readOnly defaultValue="Original" />
    </>,
  )

  expect(screen.getByLabelText('Unavailable')).toBeDisabled()
  await user.tab()
  const reference = screen.getByLabelText('Reference')
  expect(reference).toHaveFocus()
  await user.keyboard('Changed')
  expect(reference).toHaveValue('Original')
})

test('supports controlled values without owning form state', async () => {
  function Form() {
    const [value, setValue] = useState('')
    return (
      <Input
        label="Title"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    )
  }
  const user = userEvent.setup()
  render(<Form />)
  await user.type(screen.getByLabelText('Title'), 'A story')
  expect(screen.getByLabelText('Title')).toHaveValue('A story')
})

test('forwards a ref, explicit ID and native numeric validation attributes', () => {
  const ref = createRef<HTMLInputElement>()
  render(
    <Input
      ref={ref}
      id="target"
      label="Word target"
      type="number"
      min={1}
      max={1000000}
      required
      name="target"
      aria-invalid="true"
    />,
  )
  const input = screen.getByRole('spinbutton', { name: 'Word target' })
  expect(ref.current).toBe(input)
  expect(input).toHaveAttribute('id', 'target')
  expect(input).toHaveAttribute('name', 'target')
  expect(input).toHaveAttribute('min', '1')
  expect(input).toHaveAttribute('max', '1000000')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toBeRequired()
})
