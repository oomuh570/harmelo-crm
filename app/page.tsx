import Sidebar from "@/components/sidebar";
import { Fraunces } from "next/font/google";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { mapContact } from "@/app/contacts/contact";
import RecentContactsList from "@/app/_dashboard/recent-contacts-list";
import FollowUpsList, { type FollowUp } from "@/app/_dashboard/follow-ups-list";
import ContactsByCategory, {
  type CategoryCount,
} from "@/app/_dashboard/contacts-by-category";

const fraunces = Fraunces({ subsets: ["latin"] });

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
      contact: { deletedAt: null },
    },
    orderBy: { followUpAt: "asc" },
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

  const [openFollowUps, totalContacts, activitiesThisWeek, overdue] =
    await Promise.all([
      prisma.activity.count({
        where: {
          followUpAt: { not: null },
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
          deletedAt: null,
          contact: { deletedAt: null },
        },
      }),
    ]);

  return { openFollowUps, totalContacts, activitiesThisWeek, overdue };
}

export default async function Home() {
  const [recentContacts, followUps, stats, contactsByCategory] =
    await Promise.all([
      getRecentContacts(),
      getThisWeekFollowUps(),
      getStats(),
      getContactsByCategory(),
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
            <h1 className={`${fraunces.className} text-2xl md:text-3xl text-white mb-6`}>
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
              <Widget title="Recent activity" className="lg:col-span-3">
                <PlaceholderRows count={5} />
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
  className = "",
  children,
}: {
  title: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-700 bg-[#0f1117] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <h2 className="text-sm font-medium text-white">{title}</h2>
        {href && (
          <Link
            href={href}
            className="text-xs text-gray-400 hover:text-green-300"
          >
            See all
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function PlaceholderRows({ count }: { count: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-md border border-gray-800 bg-[#07090F] px-3 py-2.5"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-gray-800" />
          <div className="flex-1 min-w-0">
            <div className="h-2.5 w-1/3 rounded bg-gray-800" />
            <div className="mt-2 h-2 w-2/3 rounded bg-gray-900" />
          </div>
          <div className="hidden sm:block h-2 w-12 rounded bg-gray-800" />
        </li>
      ))}
    </ul>
  );
}
