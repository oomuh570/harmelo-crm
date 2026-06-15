'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Menu,
  Tag,
  Users,
} from 'lucide-react'
import { logout } from '@/auth/login-action'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/tags', label: 'Tags', icon: Tag },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden fixed top-3 left-3 z-50 rounded-md border border-gray-700 bg-[#0f1117] p-2 text-white hover:border-gray-500"
      >
        <Menu className="h-5 w-5" />
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
          fixed md:sticky top-0 left-0 z-50
          min-h-screen md:h-screen w-56 shrink-0
          border-r border-gray-800 bg-[#07090F] text-white
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="border-b border-gray-800 px-5 py-5">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#00D4B8]" />
              <span className="font-heading text-xl tracking-tight text-white">
                Harmelo
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 px-3 pt-4">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-[#00D4B8]/10 text-[#00D4B8]'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="mt-auto border-t border-gray-800 p-3">
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
