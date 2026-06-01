"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { supabase } from "@/lib/supabase"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.replace("/")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single()

      if (!profile || profile.role !== "admin") {
        router.replace("/")
        return
      }

      setChecking(false)
    }

    checkAdmin()
  }, [router])

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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        Mengecek akses...
      </div>
    )
  }

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