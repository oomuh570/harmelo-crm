'use server'

import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const AddContactSchema = z.object({
  name: z.string().min(2, { message: 'Must be at least 2 characters' }).trim(),
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Invalid email' }),
  phone: z.string().trim().optional(),
  organization: z.string().trim().nullish(),
  jobTitle: z.string().trim().nullish(),
  type: z
    .enum(['FEDERAL', 'PROVINCIAL', 'US', 'INVESTOR', 'CUSTOMER', 'PARTNER', 'OTHER'])
    .nullish(),
  notes: z.string().trim().nullish(),
})

export async function addContactAction(_state: unknown, formData: FormData) {
  const result = AddContactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    organization: formData.get('organization'),
    jobTitle: formData.get('jobTitle'),
    type: formData.get('type'),
    notes: formData.get('notes'),
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { name, email, phone, organization, jobTitle, type, notes } = result.data

  try {
    await prisma.contact.create({
      data: {
        name,
        email,
        phone: phone || null,
        organization: organization || null,
        jobTitle: jobTitle || null,
        type: type ?? 'OTHER',
        notes: notes || null,
      },
    })
    return { success: true }
  } catch {
    return { errors: { name: ['Failed to save contact'] } }
  }
}
