import { Building2 } from 'lucide-react';

export type WorkspaceOption = { id: string; name: string };

/**
 * Static workspace label at the top of the sidebar. Each user belongs to
 * exactly one workspace, so there's nothing to switch between — this just
 * tells them which one they're in.
 */
export default function WorkspaceLabel({ name }: { name: string | null }) {
  return (
    <div className="px-3 pt-3">
      <div className="flex w-full items-center gap-2 rounded-md border border-gray-800 bg-[#0f1117] px-2.5 py-2 text-sm text-white">
        <Building2 className="h-4 w-4 shrink-0 text-[#00D4B8]" />
        <span
          className={
            'flex-1 truncate ' + (name ? '' : 'italic text-gray-500')
          }
        >
          {name ?? 'No workspace'}
        </span>
      </div>
    </div>
  );
}
