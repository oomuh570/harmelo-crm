'use server'

import { prisma } from '@/lib/prisma'

export async function deleteContactAction(id: string) {
  try {
    await prisma.contact.delete({ where: { id } })
    return { success: true }
  } catch {
    return { error: 'Failed to delete contact' }
  }
}
