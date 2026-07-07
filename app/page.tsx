import Sidebar from "@/components/sidebar";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { mapContact } from "@/app/contacts/contact";
import RecentContactsList from "@/app/_dashboard/recent-contacts-list";
import FollowUpsList, { type FollowUp } from "@/app/_dashboard/follow-ups-list";
import RecentActivityList, {
  type RecentActivity,
} from "@/app/_dashboard/recent-activity-list";
import ContactsByCategory, {
  type CategoryCount,
} from "@/app/_dashboard/contacts-by-category";
import ExportActivitiesButton from "@/app/_dashboard/export-activities-button";

async function getRecentContacts() {
  const rows = await prisma.contact.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return rows.map(mapContact);
}

async function getThisWeekFollowUps(): Promise<FollowUp[]> {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + ((7 - now.getDay()) % 7));
  endOfWeek.setHours(23, 59, 59, 999);

  const rows = await prisma.activity.findMany({
    where: {
      deletedAt: null,
      followUpAt: { not: null, lte: endOfWeek },
      followUpStatus: 'PENDING',
      contact: { deletedAt: null },
    },
    orderBy: { followUpAt: 'asc' },
    take: 6,
    include: { contact: { select: { id: true, name: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    notes: r.notes,
    followUpAt: r.followUpAt!,
    contact: r.contact,
  }));
}

async function getRecentActivity(): Promise<RecentActivity[]> {
  const rows = await prisma.activity.findMany({
    where: { deletedAt: null, contact: { deletedAt: null } },
    orderBy: { occurredAt: "desc" },
    take: 5,
    include: { contact: true },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    notes: r.notes,
    occurredAt: r.occurredAt,
    contact: mapContact(r.contact),
  }));
}

async function getContactsByCategory(): Promise<CategoryCount[]> {
  const rows = await prisma.contact.groupBy({
    by: ["type"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ type: r.type as string, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

async function getStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  // ISO week: Mon = 0 days back, Sun = 6 days back
  const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);

  const [openFollowUps, totalContacts, activitiesThisWeek, overdue] = await Promise.all([
    prisma.activity.count({
      where: {
        followUpAt: { not: null },
        followUpStatus: 'PENDING',
        deletedAt: null,
        contact: { deletedAt: null },
      },
    }),
    prisma.contact.count({ where: { deletedAt: null } }),
    prisma.activity.count({
      where: {
        occurredAt: { gte: startOfWeek },
        deletedAt: null,
        contact: { deletedAt: null },
      },
    }),
    prisma.activity.count({
      where: {
        followUpAt: { lt: startOfToday },
        followUpStatus: 'PENDING',
        deletedAt: null,
        contact: { deletedAt: null },
      },
    }),
  ]);

  return { openFollowUps, totalContacts, activitiesThisWeek, overdue };
}

export default async function Home() {
  const [recentContacts, followUps, stats, contactsByCategory, recentActivity] =
    await Promise.all([
      getRecentContacts(),
      getThisWeekFollowUps(),
      getStats(),
      getContactsByCategory(),
      getRecentActivity(),
    ]);

  const cards = [
    { label: "Open follow-ups", value: stats.openFollowUps },
    { label: "Contacts", value: stats.totalContacts },
    { label: "Activities this week", value: stats.activitiesThisWeek },
    {
      label: "Overdue",
      value: stats.overdue,
      tone: stats.overdue > 0 ? ("alert" as const) : undefined,
    },
  ];
  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0 min-h-screen">
          <div className="mx-auto w-full max-w-6xl px-4 pt-16 md:pt-8 pb-12">
            <h1 className="font-heading text-2xl md:text-3xl text-center text-white mb-6">
              Dashboard
            </h1>

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {cards.map((s) => (
                <div
                  key={s.label}
                  className={
                    "rounded-lg border bg-[#0f1117] p-4 " +
                    (s.tone === "alert"
                      ? "border-red-500/40"
                      : "border-gray-700")
                  }
                >
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    {s.label}
                  </div>
                  <div
                    className={
                      "mt-2 text-2xl " +
                      (s.tone === "alert" ? "text-red-300" : "text-white")
                    }
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
              <Widget title="This week's follow-ups" className="lg:col-span-3">
                <FollowUpsList followUps={followUps} />
              </Widget>
              <Widget title="Recently added contacts" href="/contacts" className="lg:col-span-2">
                <RecentContactsList contacts={recentContacts} />
              </Widget>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <Widget
                title="Recent activity"
                href="/activities"
                action={<ExportActivitiesButton compact />}
                className="lg:col-span-3"
              >
                <RecentActivityList activities={recentActivity} />
              </Widget>
              <Widget title="Contacts by category" className="lg:col-span-2">
                <ContactsByCategory counts={contactsByCategory} />
              </Widget>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Widget({
  title,
  href,
  action,
  className = "",
  children,
}: {
  title: string;
  href?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-700 bg-[#0f1117] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <h2 className="text-sm font-medium text-white">{title}</h2>
        {(href || action) && (
          <div className="flex items-center gap-3">
            {href && (
              <Link
                href={href}
                className="text-xs text-gray-400 hover:text-[#00D4B8]"
              >
                See all
              </Link>
            )}
            {action}
          </div>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

