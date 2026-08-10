import SidebarWrapper from '@/components/sidebar-wrapper'
import ExportActivitiesButton from '@/app/_dashboard/export-activities-button'
import { prisma } from '@/lib/prisma'
import ActivitiesTable from './activities-table'
import type { ActivityRow } from './columns'
import LogActivityModal from './_components/log-activity-modal'

const PAGE_SIZE = 20

async function getData() {
  const [activities, totalCount, contacts] = await Promise.all([
    prisma.activity.findMany({
      where: { deletedAt: null, OR: [{ contactId: null }, { contact: { deletedAt: null } }] },
      orderBy: { occurredAt: 'desc' },
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        contact: { select: { id: true, name: true } },
      },
    }),
    prisma.activity.count({
      where: { deletedAt: null, OR: [{ contactId: null }, { contact: { deletedAt: null } }] },
    }),
    prisma.contact.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const rows: ActivityRow[] = activities.map((a) => ({
    id: a.id,
    type: a.type as ActivityRow['type'],
    notes: a.notes,
    occurredAt: a.occurredAt.toISOString(),
    followUpAt: a.followUpAt ? a.followUpAt.toISOString() : null,
    user: a.user,
    contact: a.contact,
  }))

  return {
    activities: rows,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    contacts,
  }
}

export default async function ActivitiesPage() {
  const { activities, totalPages, contacts } = await getData()
  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <SidebarWrapper />
        <div className="flex-1 min-w-0 min-h-screen flex flex-col items-center pt-16 md:pt-8">
          <h1 className="font-heading text-2xl md:text-3xl text-center text-white mb-6">
            Activities
          </h1>
          <div className="w-full max-w-5xl px-4">
            <div className="mb-2 flex items-center justify-end gap-2">
              <LogActivityModal contacts={contacts} />
              <ExportActivitiesButton />
            </div>
            <ActivitiesTable
              initialData={activities}
              initialTotalPages={totalPages}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
