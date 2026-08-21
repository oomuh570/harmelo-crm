"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ContactPopup from "@/app/contacts/contact-popup"
import EditContactForm from "@/app/contacts/edit-contact-form"
import ConfirmDialog from "@/components/confirm-dialog"
import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Contact } from "./contact"

// re-exported so existing importers (`from './columns'`) keep working
export type { Contact }

function ContactAction({ contact }: { contact: Contact }) {
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [userRole, setUserRole] = useState<'VIEWER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN' | undefined>()
  const router = useRouter()

  // Fetch current user's role when component mounts
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.role) setUserRole(data.role)
      })
      .catch(() => {})
  }, [])

  function handleDelete() {
    startTransition(async () => {
      // soft delete: the endpoint sets deletedAt; the row is hidden from the
      // table (getData filters deletedAt: null) but remains recoverable in the DB
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
      if (res.ok) {
        setConfirmDelete(false)
        toast.success('Contact deleted')
        setTimeout(() => router.refresh(), 500)
      } else {
        toast.error('Failed to delete contact')
      }
    })
  }

  return (
    //triple dots for each row
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-accent cursor-pointer">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setModal(true)}>View contact</DropdownMenuItem>
            {userRole !== 'VIEWER' && (
              <>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditModal(true)}>Edit contact</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-red-500" onClick={() => setConfirmDelete(true)}>Delete contact</DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {modal && <ContactPopup contact={contact} onClose={() => setModal(false)} userRole={userRole} />}
      {editModal && <EditContactForm contact={contact} onClose={() => setEditModal(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${contact.name}"? This will remove them from your contacts.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={isPending}
        />
      )}
    </>
  )
}

export const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      //sorting button
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 hover:text-gray-300 cursor-pointer"
      >
        Name
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone Number",
  },
  {
    id: "tags",
    header: "Tags",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => {
      const tags = row.original.tags ?? []
      if (tags.length === 0) return <span className="text-gray-600">—</span>
      const visible = tags.slice(0, 2)
      const remaining = tags.length - visible.length
      return (
        <div className="flex flex-wrap items-center gap-1">
          {visible.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center rounded-full border border-[#00D4B8]/40 bg-[#00D4B8]/10 px-2 py-0.5 text-xs text-[#00D4B8]"
            >
              {t.name}
            </span>
          ))}
          {remaining > 0 && (
            <span className="inline-flex items-center rounded-full border border-gray-700 bg-gray-800/50 px-2 py-0.5 text-xs text-gray-400">
              +{remaining} more
            </span>
          )}
        </div>
      )
    },
  },
  {
    id:"action",
    cell: ({row}) => <ContactAction contact={row.original}/>,

  },
]