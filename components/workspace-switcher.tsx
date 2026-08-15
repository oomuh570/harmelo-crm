'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import Link from 'next/link';

export type WorkspaceOption = { id: string; name: string };

export const ACTIVE_WORKSPACE_KEY = 'harmelo:activeWorkspaceId';
const LS_KEY = ACTIVE_WORKSPACE_KEY;

export default function WorkspaceSwitcher({
  workspaces,
}: {
  workspaces: WorkspaceOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Load the last selected workspace from localStorage on mount.
  useEffect(() => {
    const stored = window.localStorage.getItem(LS_KEY);
    if (stored && workspaces.some((w) => w.id === stored)) {
      setActiveId(stored);
    } else if (workspaces.length > 0) {
      setActiveId(workspaces[0].id);
    }
  }, [workspaces]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  function selectWorkspace(id: string) {
    setActiveId(id);
    window.localStorage.setItem(LS_KEY, id);
    setOpen(false);
    // TODO(backend): when a cookie is used instead of localStorage, POST it here
    // before refresh so server components read the new value.
    router.refresh();
  }

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  return (
    <div ref={rootRef} className="relative px-3 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={workspaces.length === 0}
        className="flex w-full items-center gap-2 rounded-md border border-gray-800 bg-[#0f1117] px-2.5 py-2 text-left text-sm text-white hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Building2 className="h-4 w-4 shrink-0 text-[#00D4B8]" />
        <span className="flex-1 truncate">
          {active?.name ?? 'No workspaces'}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
      </button>

      {workspaces.length === 0 && (
        <p className="mt-1 text-[11px] text-gray-500">
          <Link href="/super-admin/workspaces" className="text-[#00D4B8] hover:underline">
            Create one →
          </Link>
        </p>
      )}

      {open && workspaces.length > 0 && (
        <div className="absolute left-3 right-3 z-40 mt-1 rounded-md border border-gray-700 bg-[#0f1117] shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1">
            {workspaces.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => selectWorkspace(w.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-800 cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  <span className="flex-1 truncate">{w.name}</span>
                  {w.id === activeId && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#00D4B8]" />
                  )}
                </button>
              </li>
            ))}
          </ul>
          {/* TODO(perms): gate to super admin once role exists. */}
          <div className="border-t border-gray-800 py-1">
            <Link
              href="/super-admin/workspaces"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Manage workspaces
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
