import SidebarWrapper from "@/components/sidebar-wrapper";
import { mapContact } from "./contact"
import ContactsWrapper from "./contacts-wrapper"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/server-data"

const PAGE_SIZE = 20

async function getData(workspaceId: string) {
  const [contacts, totalCount] = await Promise.all([
    prisma.contact.findMany({
      where: { deletedAt: null, workspaceId },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    prisma.contact.count({ where: { deletedAt: null, workspaceId } }),
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
  const user = await getCurrentUser()

  if (!user?.workspaceId) {
    return <div className="p-4 text-red-400">No workspace found</div>
  }

  const { contacts, totalPages } = await getData(user.workspaceId)

  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <SidebarWrapper />
        <div className="flex-1 min-w-0 min-h-screen flex flex-col items-center pt-16 md:pt-8">
          <h1 className="font-heading text-2xl md:text-3xl text-center text-white mb-6">Contacts</h1>
          <div className="w-full max-w-3xl px-4">
            <ContactsWrapper
              initialData={contacts}
              initialTotalPages={totalPages}
              workspaceId={user.workspaceId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
