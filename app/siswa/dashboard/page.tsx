"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import {
  BookOpen,
  CalendarDays,
  FileText,
  Home,
  LogOut,
  User,
} from "lucide-react"

type Siswa = {
  nisn: string
  nama_lengkap: string
  tempat_lahir: string
  tanggal_lahir: string
  jenkel: string
  agama: string
  tahun_masuk: number
}

export default function SiswaDashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [siswa, setSiswa] = useState<Siswa | null>(null)

  useEffect(() => {
    const getData = async () => {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push("/")
        return
      }

      setEmail(userData.user.email || "")

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, nisn")
        .eq("id", userData.user.id)
        .single()

      if (!profile) {
        router.push("/")
        return
      }

      if (profile.role !== "siswa") {
        router.push("/")
        return
      }

      if (!profile.nisn) {
        router.push("/verifikasi-siswa")
        return
      }

      const { data: siswaData } = await supabase
        .from("siswa")
        .select(
          "nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenkel, agama, tahun_masuk"
        )
        .eq("nisn", profile.nisn)
        .single()

      if (!siswaData) {
        router.push("/verifikasi-siswa")
        return
      }

      setSiswa(siswaData)
      setLoading(false)
    }

    getData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        Loading...
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r bg-white p-6 md:block">
        <h1 className="mb-8 text-2xl font-bold">
          Siswa
        </h1>

        <nav className="space-y-2">
          <MenuItem icon={<Home size={18} />} text="Dashboard" active />
          <MenuItem icon={<BookOpen size={18} />} text="Materi" />
          <MenuItem icon={<FileText size={18} />} text="Tugas" />
          <MenuItem icon={<CalendarDays size={18} />} text="Jadwal" />
          <MenuItem icon={<User size={18} />} text="Profil" />
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <div>
            <h2 className="text-lg font-semibold">
              Dashboard Siswa
            </h2>
            <p className="text-sm text-slate-500">
              Selamat belajar, {siswa?.nama_lengkap}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium">
                {siswa?.nama_lengkap}
              </p>
              <p className="text-xs text-slate-500">
                {email}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
              {siswa?.nama_lengkap.charAt(0).toUpperCase()}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Materi Aktif" value="0" />
            <StatCard title="Tugas Belum Dikerjakan" value="0" />
            <StatCard title="Ujian Aktif" value="0" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">
                Data Siswa
              </h3>

              <div className="mt-4 space-y-2 text-sm">
                <Info label="NISN" value={siswa?.nisn} />
                <Info label="Nama Lengkap" value={siswa?.nama_lengkap} />
                <Info label="Tempat Lahir" value={siswa?.tempat_lahir} />
                <Info label="Tanggal Lahir" value={siswa?.tanggal_lahir} />
                <Info label="Jenis Kelamin" value={siswa?.jenkel} />
                <Info label="Agama" value={siswa?.agama} />
                <Info label="Tahun Masuk" value={String(siswa?.tahun_masuk)} />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">
                Aktivitas Terbaru
              </h3>

              <p className="mt-4 text-sm text-slate-500">
                Belum ada aktivitas belajar.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function MenuItem({
  icon,
  text,
  active = false,
}: {
  icon: React.ReactNode
  text: string
  active?: boolean
}) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {icon}
      <span>{text}</span>
    </div>
  )
}

function StatCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold">{value}</h3>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div className="flex justify-between gap-4 border-b py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-right">{value || "-"}</span>
    </div>
  )
}