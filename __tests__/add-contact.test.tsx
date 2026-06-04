// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import AddContactForm from '@/app/contacts/add-contact-form'

// router.refresh() is called after a successful save; share one mock so we can assert on it
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

// next/font/google needs Next's build pipeline; stub the fonts for tests
vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '' }),
  DM_Sans: () => ({ className: '' }),
}))

// jsdom lacks the browser APIs the popover relies on
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
  // jsdom lacks elementFromPoint, which TipTap's Placeholder extension calls via prosemirror
  document.elementFromPoint ||= () => null
  document.elementsFromPoint ||= () => []

  refresh.mockClear()
})

// RTL auto-cleanup isn't active in this config; unmount between tests
afterEach(cleanup)

// Open the popover and fill the required fields
async function openAndFill(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /add contact/i }))
  await user.type(await screen.findByPlaceholderText('Jane Doe'), 'John Doe')
  await user.type(screen.getByPlaceholderText('jane@example.com'), 'john@example.com')
}

describe('Add contact form', () => {
  it('POSTs the form to /api/contacts and refreshes on success', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'c1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AddContactForm />)
    await openAndFill(user)
    await user.click(screen.getByRole('button', { name: /save contact/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/contacts')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })

    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      type: 'OTHER',
    })

    // a successful save refreshes the table
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('formats the phone number with dashes as the user types and saves it dashed', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'c1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AddContactForm />)
    await openAndFill(user)

    const phoneInput = screen.getByPlaceholderText('123-456-7890') as HTMLInputElement
    await user.type(phoneInput, '4033302322')
    // dashes are inserted live as the user types
    expect(phoneInput.value).toBe('403-330-2322')

    await user.click(screen.getByRole('button', { name: /save contact/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    // the stored value keeps the dashes so the table shows them
    expect(body.phone).toBe('403-330-2322')
  })

  it('caps the phone number at 10 digits', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<AddContactForm />)
    await user.click(screen.getByRole('button', { name: /add contact/i }))

    const phoneInput = (await screen.findByPlaceholderText('123-456-7890')) as HTMLInputElement
    await user.type(phoneInput, '40333023229999')
    expect(phoneInput.value).toBe('403-330-2322')
  })

  it('shows the endpoint error and does not refresh when the save fails', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Something went wrong' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AddContactForm />)
    await openAndFill(user)
    await user.click(screen.getByRole('button', { name: /save contact/i }))

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })
})
