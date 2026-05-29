"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type MenuItem = {
  label: string
  href: string
  icon: React.ReactNode
}

type SidebarProps = {
  title: string
  menus: MenuItem[]
  open: boolean
  setOpen: (open: boolean) => void
}

export default function Sidebar({
  title,
  menus,
  open,
  setOpen,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:static z-50
          h-screen w-64
          bg-white dark:bg-slate-900
          border-r dark:border-slate-800
          transition-all
          ${open ? "left-0" : "-left-64"}
          md:left-0
        `}
      >
        <div className="border-b p-4">
          <h2 className="font-bold">
            {title}
          </h2>
        </div>

        <nav className="space-y-1 p-3">
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              onClick={() => setOpen(false)}
              className={`
                flex items-center gap-3
                rounded-xl px-3 py-2
                ${
                  pathname === menu.href
                    ? "bg-blue-600 text-white"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }
              `}
            >
              {menu.icon}
              {menu.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}