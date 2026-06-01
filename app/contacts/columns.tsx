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
import { deleteContactAction } from "@/app/contacts/delete-contact-action"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export type Contact = {
  id: string
  name: string
  phoneNumber: string
  email: string
  organization: string
  jobTitle: string
  type: string
  notes: string
  createdAt: Date
}

function ContactAction({ contact }: { contact: Contact }) {
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      await deleteContactAction(contact.id)
      setConfirmDelete(false)
      router.refresh()
    })
  }

  return (
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
            <DropdownMenuItem className="cursor-pointer" onClick={() => setEditModal(true)}>Edit contact</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-red-500" onClick={() => setConfirmDelete(true)}>Delete contact</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {modal && <ContactPopup contact={contact} onClose={() => setModal(false)} />}
      {editModal && <EditContactForm contact={contact} onClose={() => setEditModal(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${contact.name}"? This cannot be undone.`}
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
    accessorKey: "phoneNumber",
    header: "Phone Number",
  },

  {
    id:"action",
    cell: ({row}) => <ContactAction contact={row.original}/>,

  },
]