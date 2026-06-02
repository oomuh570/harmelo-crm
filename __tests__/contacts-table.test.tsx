// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import ContactsTable from '@/app/contacts/contacts-table'
import type { Contact } from '@/app/contacts/columns'

// next/navigation + fonts are pulled in via the columns import chain
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '' }),
  DM_Sans: () => ({ className: '' }),
}))

// jsdom lacks the browser APIs the row action menu relies on
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

afterEach(cleanup)

const initialData: Contact[] = [
  {
    id: 'c1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '555-0100',
    organization: 'Analytical Engines',
    jobTitle: 'Mathematician',
    type: 'INVESTOR',
    notes: '',
    createdAt: new Date('2024-01-15T00:00:00Z'),
  },
]

// a raw API contact (null optionals, string date) as the endpoint returns it
function apiContact(name: string) {
  return {
    id: name,
    name,
    email: null,
    phone: null,
    organization: null,
    jobTitle: null,
    type: 'OTHER',
    notes: null,
    createdAt: '2024-02-01T00:00:00Z',
  }
}

function mockFetch(names: string[], totalPages: number) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      contacts: names.map(apiContact),
      pagination: { totalPages },
    }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('ContactsTable', () => {
  it('renders the server-provided first page without fetching on mount', () => {
    const fetchMock = mockFetch([], 3)

    render(<ContactsTable initialData={initialData} initialTotalPages={3} />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches the next page from GET /api/contacts when Next is clicked', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch(['Grace Hopper'], 3)

    render(<ContactsTable initialData={initialData} initialTotalPages={3} />)
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/api/contacts?')
    expect(url).toContain('page=2')
    expect(url).toContain('limit=20')

    // rows are replaced with the fetched page
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  it('refetches the current view when the server sends fresh data (after a mutation)', async () => {
    const fetchMock = mockFetch(['Ada Updated'], 1)

    const { rerender } = render(
      <ContactsTable initialData={initialData} initialTotalPages={3} />,
    )
    expect(fetchMock).not.toHaveBeenCalled()

    // simulate router.refresh(): the server re-renders with a new initialData reference
    const refreshed = [{ ...initialData[0], name: 'Ada Updated' }]
    rerender(<ContactsTable initialData={refreshed} initialTotalPages={1} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0] as string).toContain('page=1')
    expect(await screen.findByText('Ada Updated')).toBeInTheDocument()
  })

  it('searches via the endpoint (debounced) and resets to page 1', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch(['Ada Lovelace'], 1)

    render(<ContactsTable initialData={initialData} initialTotalPages={3} />)
    await user.type(screen.getByPlaceholderText(/search by name/i), 'ada')

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('search=ada')
    expect(url).toContain('page=1')

    await waitFor(() => expect(screen.getByText('Page 1 of 1')).toBeInTheDocument())
  })
})
