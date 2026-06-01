import Sidebar from "@/components/sidebar";
import { columns, Contact } from "./columns"
import { DataTable } from "./data-table"
import { Fraunces } from "next/font/google";
import AddContactForm from "./add-contact-form"
import { prisma } from "@/lib/prisma"

const fraunces = Fraunces({ subsets: ["latin"] });

async function getData(): Promise<Contact[]> {
  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } })
  return contacts.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email ?? '',
    phoneNumber: c.phone ?? '',
    organization: c.organization ?? '',
    jobTitle: c.jobTitle ?? '',
    type: c.type,
    notes: c.notes ?? '',
    createdAt: c.createdAt,
  }))
}

export default async function ContactsPage() {
  const data = await getData()
  return (
    <div className="w-screen h-screen bg-[#07090F]">
      <div className="flex">
        <Sidebar />
        <div className="h-screen flex flex-col items-center w-full">
          <h1 className={`${fraunces.className} text-3xl mt-5 text-white`}>Contacts</h1>
          <div className="w-[50%] mt-20">
            <AddContactForm />
            <DataTable columns={columns} data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
