'use client'

import { logout } from "@/auth/login-action"
import Link from "next/link"

export default function Sidebar(){
    return(
        <div className= "border-r border-gray-400 h-screen w-[15%] text-white">
            <div className="flex flex-col items-center">
                <div>Harmelo</div>
                <Link href='/dashboard'>Dashboard</Link>
                <Link href='/contacts'>Contacts</Link>
                <button onClick={() => logout()} className="border py-2 rounded-md bg-green-200 hover:bg-green-400 text-black cursor-pointer w-[60%]">Logout</button>
            </div>
        </div>
    )
}