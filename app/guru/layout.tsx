"use client"

import { useState } from "react"
import {
  Home,
  BookOpen,
  FileText,
  Users,
  CalendarDays,
  User,
  LibraryBig,
} from "lucide-react"

import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const menus = [
    {
      label: "Dashboard",
      href: "/guru/dashboard",
      icon: <Home size={18} />,
    },
    {
      label: "Materi",
      href: "/guru/materi",
      icon: <BookOpen size={18} />,
    },
    {
      label: "Tugas",
      href: "/guru/tugas",
      icon: <FileText size={18} />,
    },
    {
      label: "Bank Soal",
      href: "/guru/bank-soal",
      icon: <LibraryBig size={18} />,
    },
    {
      label: "Siswa",
      href: "/guru/siswa",
      icon: <Users size={18} />,
    },
    {
      label: "Jadwal",
      href: "/guru/jadwal",
      icon: <CalendarDays size={18} />,
    },
    {
      label: "Profil",
      href: "/guru/profil",
      icon: <User size={18} />,
    },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Sidebar
        title="Guru"
        menus={menus}
        open={open}
        setOpen={setOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="Dashboard Guru"
          onMenuClick={() => setOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}