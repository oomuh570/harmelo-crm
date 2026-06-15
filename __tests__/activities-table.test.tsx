// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

// Stub the popup so we can assert the contact passed in without dragging in
// its lucide / portal / RichText deps.
vi.mock('@/app/contacts/contact-popup', () => ({
  default: ({
    contact,
    onClose,
  }: {
    contact: { id: string; name: string }
    onClose: () => void
  }) => (
    <div data-testid="contact-popup">
      <span>popup:{contact.name}</span>
      <button onClick={onClose}>close-popup</button>
    </div>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '' }),
  DM_Sans: () => ({ className: '' }),
}))

import ActivitiesTable from '@/app/activities/activities-table'
import type { ActivityRow } from '@/app/activities/columns'

afterEach(cleanup)

function makeActivity(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: 'a1',
    type: 'EMAIL',
    notes: '<p>Sent the Q3 proposal</p>',
    occurredAt: '2026-06-01T10:00:00Z',
    followUpAt: null,
    user: { id: 'u1', fullName: 'Bradley', email: 'b@h.co' },
    contact: { id: 'c1', name: 'Ada Lovelace' },
    ...overrides,
  }
}

function mockFetch(rows: ActivityRow[], totalPages: number) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      activities: rows,
      pagination: { totalPages },
    }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('ActivitiesTable', () => {
  it('renders the server-provided first page without fetching on mount', () => {
    const fetchMock = mockFetch([], 3)
    const data = [makeActivity({ contact: { id: 'c1', name: 'Ada Lovelace' } })]

    render(<ActivitiesTable initialData={data} initialTotalPages={3} />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows "No results." when initial data is empty', () => {
    mockFetch([], 1)
    render(<ActivitiesTable initialData={[]} initialTotalPages={1} />)
    expect(screen.getByText('No results.')).toBeInTheDocument()
  })

  it('renders each column: date, type label, contact, truncated notes, follow-up, user', () => {
    mockFetch([], 1)
    const longNote =
      '<p>' + 'word '.repeat(40) + '</p>' // ~200 chars, plus tags
    const data: ActivityRow[] = [
      makeActivity({
        id: 'a1',
        type: 'CALL',
        notes: longNote,
        occurredAt: '2026-06-13T10:00:00Z',
        followUpAt: '2026-06-20T09:00:00Z',
        user: { id: 'u1', fullName: 'Bradley', email: 'b@h.co' },
        contact: { id: 'c1', name: 'Ada Lovelace' },
      }),
      makeActivity({
        id: 'a2',
        type: 'NOTE',
        notes: '<p>Short note</p>',
        occurredAt: '2026-06-12T10:00:00Z',
        followUpAt: null,
        user: null,
        contact: { id: 'c2', name: 'Grace Hopper' },
      }),
    ]

    render(<ActivitiesTable initialData={data} initialTotalPages={1} />)

    // Type column shows the friendly label
    expect(screen.getByText('Call')).toBeInTheDocument()
    expect(screen.getByText('Note')).toBeInTheDocument()

    // Contact name renders as a clickable button
    expect(
      screen.getByRole('button', { name: 'Ada Lovelace' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Grace Hopper' }),
    ).toBeInTheDocument()

    // Date column uses "MMM D" formatting
    expect(screen.getAllByText(/Jun \d+/).length).toBeGreaterThan(0)

    // Notes column strips HTML and truncates with ellipsis on long content
    const noteCells = screen
      .getAllByText(/word/)
      .map((el) => el.textContent ?? '')
    expect(noteCells.some((t) => t.endsWith('…'))).toBe(true)
    expect(screen.getByText('Short note')).toBeInTheDocument()

    // Empty follow-up + missing user both render as em-dashes; there should be ≥2
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('fetches the next page from GET /api/activities when Next is clicked', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch(
      [makeActivity({ contact: { id: 'c2', name: 'Grace Hopper' } })],
      3,
    )
    const data = [makeActivity({ contact: { id: 'c1', name: 'Ada Lovelace' } })]

    render(<ActivitiesTable initialData={data} initialTotalPages={3} />)
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/api/activities?')
    expect(url).toContain('page=2')
    expect(url).toContain('limit=20')

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  it('opens the popup with the clicked contact and closes it', async () => {
    const user = userEvent.setup()
    mockFetch([], 1)
    const data = [
      makeActivity({
        id: 'a1',
        contact: { id: 'c1', name: 'Ada Lovelace' },
      }),
      makeActivity({
        id: 'a2',
        contact: { id: 'c2', name: 'Grace Hopper' },
      }),
    ]

    render(<ActivitiesTable initialData={data} initialTotalPages={1} />)
    expect(screen.queryByTestId('contact-popup')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }))

    expect(screen.getByTestId('contact-popup')).toBeInTheDocument()
    expect(screen.getByText('popup:Grace Hopper')).toBeInTheDocument()

    await user.click(screen.getByText('close-popup'))
    expect(screen.queryByTestId('contact-popup')).not.toBeInTheDocument()
  })
})
