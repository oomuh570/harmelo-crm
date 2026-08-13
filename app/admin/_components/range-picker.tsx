'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'last30', label: 'Last 30 days' },
];

export default function RangePicker({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectPreset(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', value);
    params.delete('from');
    params.delete('to');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-md border border-gray-700 bg-[#0f1117]">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => selectPreset(p.value)}
          className={
            'px-3 py-1.5 text-xs cursor-pointer transition-colors ' +
            (current === p.value
              ? 'bg-[#00D4B8]/20 text-[#00D4B8]'
              : 'text-gray-300 hover:bg-gray-800')
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
