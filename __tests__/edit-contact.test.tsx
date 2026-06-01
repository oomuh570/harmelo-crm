// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import EditContactForm from '@/app/contacts/edit-contact-form'
import { columns, type Contact } from '@/app/contacts/columns'

// next/navigation + the delete action are pulled in via the columns import chain
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/app/contacts/delete-contact-action', () => ({
  deleteContactAction: vi.fn(),
}))

// next/font/google needs Next's build pipeline; stub the fonts for tests
vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '' }),
  DM_Sans: () => ({ className: '' }),
}))

// jsdom lacks the browser APIs @base-ui's menu relies on (for the menu-open test)
beforeEach(() => {
  globalThis.ResizeObserver ||= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.matchMedia ||= (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView ||= () => {}
  Element.prototype.hasPointerCapture ||= () => false
  Element.prototype.setPointerCapture ||= () => {}
  Element.prototype.releasePointerCapture ||= () => {}
})

// RTL auto-cleanup isn't active in this config; unmount between tests
afterEach(cleanup)

const contact: Contact = {
  id: 'c1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phoneNumber: '555-0100',
  organization: 'Analytical Engines',
  jobTitle: 'Mathematician',
  type: 'INVESTOR',
  notes: 'First computer programmer',
  createdAt: new Date('2024-01-15T00:00:00Z'),
}

describe('Edit contact form', () => {
  it('prepopulates every field with the contact\'s existing values', () => {
    render(<EditContactForm contact={contact} onClose={() => {}} />)

    expect(screen.getByDisplayValue('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ada@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('555-0100')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Analytical Engines')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mathematician')).toBeInTheDocument()
    expect(screen.getByDisplayValue('First computer programmer')).toBeInTheDocument()
    // the type <select> is preselected to the contact's category
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('INVESTOR')
  })

  it('lets the user edit a prepopulated field', async () => {
    const user = userEvent.setup()
    render(<EditContactForm contact={contact} onClose={() => {}} />)

    const nameInput = screen.getByDisplayValue('Ada Lovelace')
    await user.clear(nameInput)
    await user.type(nameInput, 'Ada King')

    expect(screen.getByDisplayValue('Ada King')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Ada Lovelace')).not.toBeInTheDocument()
  })

  it('closes when Save Changes or Cancel is clicked', async () => {
    const user = userEvent.setup()

    const onSave = vi.fn()
    const { unmount } = render(<EditContactForm contact={contact} onClose={onSave} />)
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(onSave).toHaveBeenCalledTimes(1)
    unmount()

    const onCancel = vi.fn()
    render(<EditContactForm contact={contact} onClose={onCancel} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('opens the prepopulated edit form from the row actions menu', async () => {
    const user = userEvent.setup()
    const actionCol = columns.find((c) => c.id === 'action')!
    const cell = (actionCol.cell as (ctx: { row: { original: Contact } }) => React.ReactNode)({
      row: { original: contact },
    })
    render(<>{cell}</>)

    // the edit modal is not mounted until the menu item is clicked
    expect(screen.queryByDisplayValue('Ada Lovelace')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    await user.click(await screen.findByText('Edit contact'))

    expect(await screen.findByDisplayValue('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })
})
