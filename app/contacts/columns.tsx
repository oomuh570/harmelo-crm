"use client"

import { ColumnDef } from "@tanstack/react-table"

import { MoreHorizontal } from "lucide-react"
 
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Contact = {
  id: string
  name: string
  phoneNumber: string
  email: string
}


export const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: "name",
    header: "Name",
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
    cell: ({row}) => {
      const contact = row.original
      

      return(
         <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-accent cursor-pointer">
           
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
          
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer" onClick={() => console.log(contact.id)}>View contact</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">Edit contact</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">Delete contact</DropdownMenuItem>
            </DropdownMenuGroup>          
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },

  },
]