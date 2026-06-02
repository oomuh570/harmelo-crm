// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import EditContactForm from '@/app/contacts/edit-contact-form'
import { columns, type Contact } from '@/app/contacts/columns'

// next/navigation is pulled in via the columns import chain
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
  phone: '4033302322',
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
    // the stored 10-digit number is shown dashed on open
    expect(screen.getByDisplayValue('403-330-2322')).toBeInTheDocument()
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

  it('formats the phone number with dashes as the user types', async () => {
    const user = userEvent.setup()
    render(<EditContactForm contact={contact} onClose={() => {}} />)

    const phoneInput = screen.getByDisplayValue('403-330-2322') as HTMLInputElement
    await user.clear(phoneInput)
    await user.type(phoneInput, '5195551234')

    expect(phoneInput.value).toBe('519-555-1234')
  })

  it('PUTs the edited values to /api/contacts/[id] and closes on success', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'c1' }) })
    vi.stubGlobal('fetch', fetchMock)

    const onSave = vi.fn()
    render(<EditContactForm contact={contact} onClose={onSave} />)

    // change a field, then save
    const nameInput = screen.getByDisplayValue('Ada Lovelace')
    await user.clear(nameInput)
    await user.type(nameInput, 'Ada King')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/contacts/c1')
    expect(init.method).toBe('PUT')

    const body = JSON.parse(init.body)
    expect(body.name).toBe('Ada King')
    expect(body.email).toBe('ada@example.com')

    // closes the modal after a successful save
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
  })

  it('closes on Cancel without calling the endpoint', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const onCancel = vi.fn()
    render(<EditContactForm contact={contact} onClose={onCancel} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows an error and stays open when the update fails', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid contact type' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const onClose = vi.fn()
    render(<EditContactForm contact={contact} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Invalid contact type')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
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
