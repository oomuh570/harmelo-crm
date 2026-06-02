import Sidebar from "@/components/sidebar";
import { mapContact } from "./contact"
import ContactsTable from "./contacts-table"
import { Fraunces } from "next/font/google";
import AddContactForm from "./add-contact-form"
import { prisma } from "@/lib/prisma"

const fraunces = Fraunces({ subsets: ["latin"] });

const PAGE_SIZE = 20

// Server-render the first page; ContactsTable fetches further pages/searches
// from GET /api/contacts on the client.
async function getData() {
  const [contacts, totalCount] = await Promise.all([
    prisma.contact.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    }),
    prisma.contact.count({ where: { deletedAt: null } }),
  ])
  return {
    contacts: contacts.map(mapContact),
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  }
}

export default async function ContactsPage() {
  const { contacts, totalPages } = await getData()
  return (
    <div className="w-screen h-screen bg-[#07090F]">
      <div className="flex">
        <Sidebar />
        <div className="h-screen flex flex-col items-center w-full">
          <h1 className={`${fraunces.className} text-3xl mt-5 text-white`}>Contacts</h1>
          <div className="w-[50%] mt-20">
            <AddContactForm />
            <ContactsTable initialData={contacts} initialTotalPages={totalPages} />
          </div>
        </div>
      </div>
    </div>
  )
}
