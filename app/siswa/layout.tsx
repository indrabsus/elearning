"use client"

import { useState } from "react"
import {
  Home,
  BookOpen,
  FileText,
  CalendarDays,
  User,
  BarChart3,
} from "lucide-react"

import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"

export default function SiswaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const menus = [
    {
      label: "Dashboard",
      href: "/siswa/dashboard",
      icon: <Home size={18} />,
    },
    {
      label: "Materi",
      href: "/siswa/materi",
      icon: <BookOpen size={18} />,
    },
    {
      label: "Tugas",
      href: "/siswa/tugas",
      icon: <FileText size={18} />,
    },
    {
  label: "Nilai",
  href: "/siswa/nilai",
  icon: <BarChart3 size={18} />,
},
    {
      label: "Profil",
      href: "/siswa/profil",
      icon: <User size={18} />,
    },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Sidebar
        title="Siswa"
        menus={menus}
        open={open}
        setOpen={setOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="Dashboard Siswa"
          onMenuClick={() => setOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}