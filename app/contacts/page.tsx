import Sidebar from "@/components/sidebar";
import { mapContact } from "./contact"
import ContactsTable from "./contacts-table"
import AddContactForm from "./add-contact-form"
import { prisma } from "@/lib/prisma"

const PAGE_SIZE = 20

async function getData() {
  const [contacts, totalCount] = await Promise.all([
    prisma.contact.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    prisma.contact.count({ where: { deletedAt: null } }),
  ])
  return {
    contacts: contacts.map((c) => {
      const flattenedTags = c.tags.map((ct) => ct.tag)
      return mapContact({
        ...c,
        tags: flattenedTags,
      })
    }),
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  }
}

export default async function ContactsPage() {
  const { contacts, totalPages } = await getData()
  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0 min-h-screen flex flex-col items-center pt-16 md:pt-8">
          <h1 className="font-heading text-2xl md:text-3xl text-center text-white mb-6">Contacts</h1>
          <div className="w-full max-w-3xl px-4">
            <div className="mb-2">
              <AddContactForm />
            </div>
            <ContactsTable initialData={contacts} initialTotalPages={totalPages} />
          </div>
        </div>
      </div>
    </div>
  )
}
