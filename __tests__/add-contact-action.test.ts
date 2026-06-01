import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addContactAction } from '@/app/contacts/add-contact-action'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.append(key, value)
  return fd
}

beforeEach(() => vi.clearAllMocks())

describe('addContactAction', () => {
  it('saves a valid contact and returns success', async () => {
    vi.mocked(prisma.contact.create).mockResolvedValue({} as any)

    const result = await addContactAction(undefined, makeFormData({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '403-330-2322',
    }))

    expect(result).toEqual({ success: true })
    expect(prisma.contact.create).toHaveBeenCalledWith({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '403-330-2322',
        organization: null,
        jobTitle: null,
        type: 'OTHER',
        notes: null,
      },
    })
  })

  it('saves with name and email (phone optional)', async () => {
    vi.mocked(prisma.contact.create).mockResolvedValue({} as any)

    const result = await addContactAction(undefined, makeFormData({ name: 'Jane Doe', email: 'jane@example.com', phone: '' }))

    expect(result).toEqual({ success: true })
    expect(prisma.contact.create).toHaveBeenCalledWith({
      data: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        organization: null,
        jobTitle: null,
        type: 'OTHER',
        notes: null,
      },
    })
  })

  it('returns an error if name is missing', async () => {
    const result = await addContactAction(undefined, makeFormData({ name: '', email: 'john@example.com', phone: '' }))

    expect(result?.errors?.name).toBeDefined()
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it('returns an error if email is missing', async () => {
    const result = await addContactAction(undefined, makeFormData({ name: 'John Doe', email: '', phone: '' }))

    expect(result?.errors?.email?.[0]).toMatch(/Email is required/)
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it('returns an error if name is too short', async () => {
    const result = await addContactAction(undefined, makeFormData({ name: 'A', email: 'john@example.com', phone: '' }))

    expect(result?.errors?.name?.[0]).toMatch(/2 characters/)
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it('returns an error if email is invalid', async () => {
    const result = await addContactAction(undefined, makeFormData({ name: 'John Doe', email: 'not-an-email', phone: '' }))

    expect(result?.errors?.email?.[0]).toMatch(/Invalid email/)
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  it('returns an error if the database call fails', async () => {
    vi.mocked(prisma.contact.create).mockRejectedValue(new Error('DB down'))

    const result = await addContactAction(undefined, makeFormData({ name: 'John Doe', email: 'john@example.com', phone: '' }))

    expect(result?.errors?.name?.[0]).toMatch(/Failed to save/)
  })
})
