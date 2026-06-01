"use client"

import { useEffect, useState } from "react"
import { LogOut, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

import ThemeToggle from "./ThemeToggle"

type HeaderProps = {
  title: string
  onMenuClick: () => void
}

export default function Header({
  onMenuClick,
}: HeaderProps) {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [namaTahunAjaran, setNamaTahunAjaran] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()

      setEmail(data.user?.email ?? "")

      setNamaTahunAjaran(
        localStorage.getItem("nama_tahun_ajaran") || "-"
      )
    }

    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()

    localStorage.removeItem("id_tahun_ajaran")
    localStorage.removeItem("nama_tahun_ajaran")

    router.push("/")
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg border p-2 md:hidden"
        >
          <Menu size={18} />
        </button>

        <div>
          <h1 className="font-semibold">
          </h1>

          <p className="text-xs text-slate-500">
            Tahun Ajaran: {namaTahunAjaran}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="hidden text-right md:block">
          <p className="text-sm">
            {email}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 rounded-lg border px-2 py-1 text-sm"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  )
}