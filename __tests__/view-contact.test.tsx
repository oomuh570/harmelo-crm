// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { columns, type Contact } from '@/app/contacts/columns'

// next/navigation isn't available outside the Next runtime
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// next/font/google needs Next's build pipeline; stub the fonts for tests
vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '' }),
  DM_Sans: () => ({ className: '' }),
}))

// jsdom lacks the browser APIs @base-ui's menu relies on
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
  phone: '555-0100',
  organization: 'Analytical Engines',
  jobTitle: 'Mathematician',
  type: 'INVESTOR',
  address: '10 Ockham Rd, London',
  notes: 'First computer programmer',
  createdAt: new Date('2024-01-15T00:00:00Z'),
}

// a raw API contact (null optionals, string date) as GET /api/contacts/[id] returns it
function apiContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '555-0100',
    organization: 'Analytical Engines',
    jobTitle: 'Mathematician',
    type: 'INVESTOR',
    notes: 'First computer programmer',
    createdAt: '2024-01-15T00:00:00Z',
    ...overrides,
  }
}

// render the real action-column cell (which renders the row's menu + view button)
function renderActionCell() {
  const actionCol = columns.find((c) => c.id === 'action')!
  const cell = (actionCol.cell as (ctx: { row: { original: Contact } }) => React.ReactNode)({
    row: { original: contact },
  })
  return render(<>{cell}</>)
}

async function openView(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /open menu/i }))
  await user.click(await screen.findByText('View contact'))
}

describe('View contact button', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the contact detail modal and fetches GET /api/contacts/[id]', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => apiContact() })
    vi.stubGlobal('fetch', fetchMock)

    renderActionCell()

    // the modal is not mounted before the button is clicked
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()

    await openView(user)

    // the detail modal now shows every field of the contact
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('555-0100')).toBeInTheDocument()
    expect(screen.getByText('Analytical Engines')).toBeInTheDocument()
    expect(screen.getByText('Mathematician')).toBeInTheDocument()
    expect(screen.getByText('First computer programmer')).toBeInTheDocument()
    expect(screen.getByText('Investor')).toBeInTheDocument() // type badge

    // the popup pulled the contact by id from the endpoint
    expect(fetchMock).toHaveBeenCalledWith('/api/contacts/c1')
  })

  it('refreshes the modal with the latest data from the endpoint', async () => {
    const user = userEvent.setup()
    // server returns an updated organization vs the stale row data
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => apiContact({ organization: 'Analytical Engines Ltd' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderActionCell()
    await openView(user)

    // the fresh server value replaces the row's value
    expect(await screen.findByText('Analytical Engines Ltd')).toBeInTheDocument()
    expect(screen.queryByText('Analytical Engines')).not.toBeInTheDocument()
  })
})
