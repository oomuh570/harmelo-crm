// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { columns, type Contact } from '@/app/contacts/columns'

// next/navigation isn't available outside the Next runtime
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// the delete action is a server action imported by the row menu
vi.mock('@/app/contacts/delete-contact-action', () => ({
  deleteContactAction: vi.fn(),
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

// render the real action-column cell (which renders the row's menu + view button)
function renderActionCell() {
  const actionCol = columns.find((c) => c.id === 'action')!
  const cell = (actionCol.cell as (ctx: { row: { original: Contact } }) => React.ReactNode)({
    row: { original: contact },
  })
  return render(<>{cell}</>)
}

describe('View contact button', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the contact detail modal showing the contact details', async () => {
    const user = userEvent.setup()
    renderActionCell()

    // the modal is not mounted before the button is clicked
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()

    // open the row's actions menu, then click "View contact"
    await user.click(screen.getByRole('button', { name: /open menu/i }))
    await user.click(await screen.findByText('View contact'))

    // the detail modal now shows every field of the contact
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('555-0100')).toBeInTheDocument()
    expect(screen.getByText('Analytical Engines')).toBeInTheDocument()
    expect(screen.getByText('Mathematician')).toBeInTheDocument()
    expect(screen.getByText('First computer programmer')).toBeInTheDocument()
    expect(screen.getByText('Investor')).toBeInTheDocument() // type badge
  })
})
