// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

// Stub the popup so we can assert which contact was passed in without
// pulling in its dependency tree (portal, lucide, etc.)
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

import RecentContactsList from '@/app/_dashboard/recent-contacts-list'
import type { Contact } from '@/app/contacts/contact'

afterEach(cleanup)

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    name: 'Ada Lovelace',
    email: '',
    phone: '',
    organization: 'Analytical Engines',
    jobTitle: '',
    type: 'CUSTOMER',
    address: '',
    notes: '',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    ...overrides,
  }
}

describe('RecentContactsList', () => {
  it('renders the empty state when there are no contacts', () => {
    render(<RecentContactsList contacts={[]} />)
    expect(screen.getByText('No contacts yet.')).toBeInTheDocument()
  })

  it('renders a row per contact with name, organization and relative time', () => {
    const contacts = [
      makeContact({ id: 'a', name: 'Ada Lovelace' }),
      makeContact({
        id: 'b',
        name: 'Grace Hopper',
        organization: 'US Navy',
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      }),
    ]
    render(<RecentContactsList contacts={contacts} />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Analytical Engines')).toBeInTheDocument()
    expect(screen.getByText('2d ago')).toBeInTheDocument()

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('US Navy')).toBeInTheDocument()
    expect(screen.getByText('1h ago')).toBeInTheDocument()
  })

  it("falls back to the contact's type when organization is empty", () => {
    render(
      <RecentContactsList
        contacts={[
          makeContact({ name: 'No Org', organization: '', type: 'INVESTOR' }),
        ]}
      />
    )
    expect(screen.getByText('INVESTOR')).toBeInTheDocument()
  })

  it('renders the contact initials in the avatar', () => {
    render(
      <RecentContactsList
        contacts={[
          makeContact({ name: 'Ada Lovelace' }),
          makeContact({ id: 'c2', name: 'cher' }), // single-word, lowercase
        ]}
      />
    )
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('opens the popup with the clicked contact and closes it', async () => {
    const user = userEvent.setup()
    render(
      <RecentContactsList
        contacts={[
          makeContact({ id: 'a', name: 'Ada Lovelace' }),
          makeContact({ id: 'b', name: 'Grace Hopper' }),
        ]}
      />
    )

    expect(screen.queryByTestId('contact-popup')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /grace hopper/i }))

    expect(screen.getByTestId('contact-popup')).toBeInTheDocument()
    expect(screen.getByText('popup:Grace Hopper')).toBeInTheDocument()

    await user.click(screen.getByText('close-popup'))
    expect(screen.queryByTestId('contact-popup')).not.toBeInTheDocument()
  })
})
