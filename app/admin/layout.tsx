"use client"

import { useState } from "react"
import {
  Home,
  Layers3,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
} from "lucide-react"

import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const menus = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <Home size={18} />,
    },
    {
      label: "Kelola Kelas",
      href: "/admin/kelas",
      icon: <Layers3 size={18} />,
    },
    {
      label: "Kelola Mapel",
      href: "/admin/mapel",
      icon: <BookOpen size={18} />,
    },
    {
      label: "Kelola Guru",
      href: "/admin/guru",
      icon: <Users size={18} />,
    },
    {
      label: "Kelola Siswa",
      href: "/admin/siswa",
      icon: <GraduationCap size={18} />,
    },
    {
      label: "Pembagian Mengajar",
      href: "/admin/pembagian-mengajar",
      icon: <ClipboardList size={18} />,
    },
  ]

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      <Sidebar
        title="Admin"
        menus={menus}
        open={open}
        setOpen={setOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="Dashboard Admin"
          onMenuClick={() => setOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}