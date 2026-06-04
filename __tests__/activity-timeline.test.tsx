// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { columns, type Contact } from '@/app/contacts/columns'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '' }),
  DM_Sans: () => ({ className: '' }),
}))

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
})

afterEach(cleanup)

const contact: Contact = {
  id: 'c1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  organization: 'Analytical Engines',
  jobTitle: 'Mathematician',
  type: 'INVESTOR',
  address: '',
  notes: '',
  createdAt: new Date('2024-01-15T00:00:00Z'),
}

const apiContact = {
  id: 'c1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  organization: 'Analytical Engines',
  jobTitle: 'Mathematician',
  type: 'INVESTOR',
  address: null,
  notes: null,
  createdAt: '2024-01-15T00:00:00Z',
}

const sampleActivities = [
  {
    id: 'a1',
    type: 'EMAIL' as const,
    notes: '<p>Sent the Q3 proposal</p>',
    occurredAt: '2026-06-01T10:00:00Z',
    user: { id: 'u1', fullName: 'Bradley', email: 'b@h.co' },
  },
  {
    id: 'a2',
    type: 'CALL' as const,
    notes: '<p>Budget approved</p>',
    occurredAt: '2026-05-28T10:00:00Z',
    user: { id: 'u2', fullName: 'Justin', email: 'j@h.co' },
  },
]

// fetch mock that branches on URL — popup makes both /contacts/[id] and /activities calls
function makeFetchMock({
  activities = sampleActivities,
  contactOverrides = {},
}: {
  activities?: typeof sampleActivities
  contactOverrides?: Record<string, unknown>
} = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/activities')) {
      return { ok: true, json: async () => ({ activities }) }
    }
    return { ok: true, json: async () => ({ ...apiContact, ...contactOverrides }) }
  })
}

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

describe('Activity timeline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the activities fetched from the contact-scoped endpoint', async () => {
    const user = userEvent.setup()
    const fetchMock = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    renderActionCell()
    await openView(user)

    // header and both activity notes render
    expect(await screen.findByText('Recent Activity')).toBeInTheDocument()
    expect(await screen.findByText('Sent the Q3 proposal')).toBeInTheDocument()
    expect(screen.getByText('Budget approved')).toBeInTheDocument()

    // user attribution shows for each item
    expect(screen.getByText(/Bradley/)).toBeInTheDocument()
    expect(screen.getByText(/Justin/)).toBeInTheDocument()

    // and the timeline endpoint was hit with the contact id and a limit
    const activitiesCall = fetchMock.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes('/activities')
    )
    expect(activitiesCall?.[0]).toMatch(/\/api\/contacts\/c1\/activities\?limit=5/)
  })

  it('shows an empty state when the contact has no activities', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', makeFetchMock({ activities: [] }))

    renderActionCell()
    await openView(user)

    expect(await screen.findByText('No activity yet.')).toBeInTheDocument()
  })

  it('reveals the type selector and notes editor when "Log Activity" is clicked', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', makeFetchMock({ activities: [] }))

    renderActionCell()
    await openView(user)

    // form is hidden by default — only the Log Activity button is visible
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /log activity/i }))

    // all four type buttons appear
    expect(screen.getByRole('button', { name: /^call$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^email$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^meeting$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^note$/i })).toBeInTheDocument()

    // Save button exists and is disabled (no notes typed yet)
    const saveBtn = screen.getByRole('button', { name: /^save$/i })
    expect(saveBtn).toBeDisabled()
  })

  it('deletes an activity via the trash icon + confirm dialog', async () => {
    const user = userEvent.setup()
    const fetchMock = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    renderActionCell()
    await openView(user)

    // wait until activities have rendered
    await screen.findByText('Sent the Q3 proposal')

    // every activity has a trash button — click the first one
    const trashButtons = screen.getAllByRole('button', { name: /delete activity/i })
    expect(trashButtons.length).toBe(2)
    await user.click(trashButtons[0])

    // confirm dialog appears
    const dialogConfirm = await screen.findByRole('button', { name: /^delete$/i })

    // arm the DELETE response before clicking confirm
    fetchMock.mockImplementationOnce(async () => ({ ok: true, json: async () => ({ success: true, permanent: false }) }))
    await user.click(dialogConfirm)

    // the deleted activity disappears from the timeline; the other one stays
    await waitFor(() =>
      expect(screen.queryByText('Sent the Q3 proposal')).not.toBeInTheDocument()
    )
    expect(screen.getByText('Budget approved')).toBeInTheDocument()

    // DELETE call hit the right endpoint
    const deleteCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === 'DELETE'
    )
    expect(deleteCall?.[0]).toBe('/api/activities/a1')
  })
})

// avoid an unused-import warning if a test stops using `within`
void within
