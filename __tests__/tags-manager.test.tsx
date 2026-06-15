// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '' }),
  DM_Sans: () => ({ className: '' }),
}))

import TagsManager from '@/app/tags/tags-manager'

afterEach(cleanup)

// Seed list is hardcoded in TagsManager from SAMPLE_TAGS; pin those names here
// so the assertions read intent-first rather than coincidence-first.
const SEED_NAMES = ['VIP', 'Lead', 'Strategic', 'Inactive']

function getTagRow(name: string) {
  // The row is the closest <li> that contains the tag name text.
  const nameEl = screen.getByText(name)
  const row = nameEl.closest('li')
  if (!row) throw new Error(`row for tag "${name}" not found`)
  return within(row)
}

describe('TagsManager', () => {
  it('renders the seeded sample tags', () => {
    render(<TagsManager />)
    for (const name of SEED_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('adds a new tag via the input and the Add tag button', async () => {
    const user = userEvent.setup()
    render(<TagsManager />)

    await user.type(screen.getByPlaceholderText(/new tag name/i), 'Decision-maker')
    await user.click(screen.getByRole('button', { name: /add tag/i }))

    expect(screen.getByText('Decision-maker')).toBeInTheDocument()
    // input clears after a successful add
    expect(screen.getByPlaceholderText(/new tag name/i)).toHaveValue('')
  })

  it('adds a new tag when pressing Enter in the input', async () => {
    const user = userEvent.setup()
    render(<TagsManager />)

    const input = screen.getByPlaceholderText(/new tag name/i)
    await user.type(input, 'Press-Enter{Enter}')

    expect(screen.getByText('Press-Enter')).toBeInTheDocument()
  })

  it('disables Add tag when the trimmed name duplicates an existing tag (case-insensitive)', async () => {
    const user = userEvent.setup()
    render(<TagsManager />)

    const input = screen.getByPlaceholderText(/new tag name/i)
    const addBtn = screen.getByRole('button', { name: /add tag/i })

    await user.type(input, '  vip  ')
    expect(addBtn).toBeDisabled()
  })

  it('renames a tag inline and persists the new value', async () => {
    const user = userEvent.setup()
    render(<TagsManager />)

    await user.click(getTagRow('Lead').getByRole('button', { name: /rename tag/i }))

    const editor = screen.getByDisplayValue('Lead')
    await user.clear(editor)
    await user.type(editor, 'Hot Lead')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(screen.queryByText('Lead')).not.toBeInTheDocument()
    expect(screen.getByText('Hot Lead')).toBeInTheDocument()
  })

  it('cancel rename keeps the original tag name', async () => {
    const user = userEvent.setup()
    render(<TagsManager />)

    await user.click(getTagRow('VIP').getByRole('button', { name: /rename tag/i }))
    const editor = screen.getByDisplayValue('VIP')
    await user.clear(editor)
    await user.type(editor, 'Will-not-stick')
    await user.click(screen.getByRole('button', { name: /cancel rename/i }))

    expect(screen.getByText('VIP')).toBeInTheDocument()
    expect(screen.queryByText('Will-not-stick')).not.toBeInTheDocument()
  })

  it('opens a confirm dialog with usage warning and deletes on confirm', async () => {
    const user = userEvent.setup()
    render(<TagsManager />)

    await user.click(getTagRow('VIP').getByRole('button', { name: /delete tag/i }))

    // ConfirmDialog body should mention the tag name and the seeded count (42)
    expect(screen.getByText(/Delete the "VIP" tag\?/)).toBeInTheDocument()
    expect(screen.getByText(/applied to 42 contacts/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(screen.queryByText('VIP')).not.toBeInTheDocument()
  })

  it('shows the empty state once every tag is deleted', async () => {
    const user = userEvent.setup()
    render(<TagsManager />)

    for (const name of SEED_NAMES) {
      await user.click(getTagRow(name).getByRole('button', { name: /delete tag/i }))
      await user.click(screen.getByRole('button', { name: /^delete$/i }))
    }

    expect(
      screen.getByText(/no tags yet\. add your first one above\./i),
    ).toBeInTheDocument()
  })
})
