// Server component — no client state needed, just renders the counts.

export type CategoryCount = { type: string; count: number }

function formatType(t: string) {
  if (t === 'US') return 'US'
  return t.charAt(0) + t.slice(1).toLowerCase()
}

export default function ContactsByCategory({
  counts,
}: {
  counts: CategoryCount[]
}) {
  if (counts.length === 0) {
    return <p className="text-sm text-gray-500">No contacts yet.</p>
  }

  const max = Math.max(...counts.map((c) => c.count))

  return (
    <ul className="flex flex-col gap-2.5">
      {counts.map(({ type, count }) => (
        <li key={type} className="flex items-center gap-3 text-sm">
          <div className="w-20 shrink-0 truncate text-gray-300">
            {formatType(type)}
          </div>
          <div
            className="h-2 flex-1 overflow-hidden rounded bg-gray-800"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[#00D4B8]/60"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <div className="w-8 shrink-0 text-right text-gray-400">{count}</div>
        </li>
      ))}
    </ul>
  )
}
