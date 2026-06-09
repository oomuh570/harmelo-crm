'use client'

import { logout } from "@/auth/login-action"
import Link from "next/link"
import { useState } from "react"

export default function Sidebar(){
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="md:hidden fixed top-3 left-3 z-50 rounded-md border border-gray-600 bg-[#0f1117] p-2 text-white"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                    className="md:hidden fixed inset-0 z-40 bg-black/60"
                />
            )}

            <aside
                className={`
                    fixed md:static top-0 left-0 z-50
                    min-h-screen w-56 shrink-0
                    border-r border-gray-400 bg-[#07090F] text-white
                    transform transition-transform duration-200
                    ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="flex flex-col items-center gap-3 p-4">
                    <div className="mb-4 text-lg">Harmelo</div>
                    <Link href='/' onClick={() => setOpen(false)} className="hover:text-[#00D4B8]">Dashboard</Link>
                    <Link href='/contacts' onClick={() => setOpen(false)} className="hover:text-[#00D4B8]">Contacts</Link>
                    <button
                        onClick={() => logout()}
                        className="border py-2 rounded-md bg-[#00D4B8] hover:bg-[#00D4B8]/90 text-black cursor-pointer w-[60%] mt-4"
                    >
                        Logout
                    </button>
                </div>
            </aside>
        </>
    )
}
