// Shared, framework-agnostic contact types + mapping.
// Lives outside the "use client" columns module so the server component
// (page.tsx getData) and client code can both call mapContact().

export type Contact = {
  id: string
  name: string
  phone: string
  email: string
  organization: string
  jobTitle: string
  type: string
  address: string
  notes: string
  createdAt: Date
}

// Raw contact shape as it comes from Prisma (server) or the JSON API (client),
// where optional columns are null and dates may be serialized to strings
export type RawContact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  organization: string | null
  jobTitle: string | null
  type: string
  address: string | null
  notes: string | null
  createdAt: string | Date
}

// Format a NANP phone number as the user types: 123-456-7890 (max 10 digits)
export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

// Single source of truth for turning a raw contact into the table view model.
// Used by both the server component (getData) and the client paginated fetch.
export function mapContact(c: RawContact): Contact {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    organization: c.organization ?? '',
    jobTitle: c.jobTitle ?? '',
    type: c.type,
    address: c.address ?? '',
    notes: c.notes ?? '',
    createdAt: new Date(c.createdAt),
  }
}
