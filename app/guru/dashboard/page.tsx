"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, FileText, Users, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Guru = {
  uid: string
  nama_lengkap: string | null
  no_hp: string | null
}

type Kelas = {
  tingkat: number | null
  nama_kelas: string | null
}

type Mapel = {
  nama_mapel: string | null
}

type Mengajar = {
  id_mapel_kelas_guru: string
  kelas: Kelas | Kelas[] | null
  mapel: Mapel | Mapel[] | null
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function GuruDashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [guru, setGuru] = useState<Guru | null>(null)

  const [namaTahunAjaran, setNamaTahunAjaran] = useState("")
  const [totalKelas, setTotalKelas] = useState(0)
  const [totalMateri, setTotalMateri] = useState(0)
  const [totalTugas, setTotalTugas] = useState(0)
  const [aktivitas, setAktivitas] = useState<Mengajar[]>([])

  useEffect(() => {
    const getData = async () => {
      const idTahunAjaran =
        localStorage.getItem("id_tahun_ajaran") || ""
      const tahunNama =
        localStorage.getItem("nama_tahun_ajaran") || ""

      setNamaTahunAjaran(tahunNama)

      if (!idTahunAjaran) {
        router.push("/")
        return
      }

      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push("/")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, uid_guru")
        .eq("id", userData.user.id)
        .single()

      if (!profile || profile.role !== "guru") {
        router.push("/")
        return
      }

      if (!profile.uid_guru) {
        router.push("/verifikasi-guru")
        return
      }

      const uidGuru = profile.uid_guru

      const { data: guruData } = await supabase
        .from("guru")
        .select("uid, nama_lengkap, no_hp")
        .eq("uid", uidGuru)
        .single()

      if (!guruData) {
        router.push("/verifikasi-guru")
        return
      }

      setGuru(guruData as Guru)

      const { data: mengajarData, error: mengajarError } = await supabase
        .from("mapel_kelas_guru")
        .select(`
          id_mapel_kelas_guru,
          kelas:id_kelas (
            tingkat,
            nama_kelas
          ),
          mapel:id_mapel (
            nama_mapel
          )
        `)
        .eq("uid_guru", uidGuru)
        .eq("id_tahun_ajaran", idTahunAjaran)

      if (mengajarError) {
        alert(mengajarError.message)
        setLoading(false)
        return
      }

      const dataMengajar =
        (mengajarData ?? []) as unknown as Mengajar[]

      setAktivitas(dataMengajar)

      const kelasUnik = new Set(
        dataMengajar.map((item) => {
          const kelas = firstItem(item.kelas)

          return `${kelas?.tingkat ?? "-"}-${kelas?.nama_kelas ?? "-"}`
        })
      )

      setTotalKelas(kelasUnik.size)

      const idMengajar = dataMengajar.map(
        (item) => item.id_mapel_kelas_guru
      )

      if (idMengajar.length > 0) {
        const { count: materiCount } = await supabase
          .from("materi")
          .select("*", { count: "exact", head: true })
          .in("id_mapel_kelas_guru", idMengajar)

        const { count: tugasCount } = await supabase
          .from("tugas")
          .select("*", { count: "exact", head: true })
          .in("id_mapel_kelas_guru", idMengajar)

        setTotalMateri(materiCount ?? 0)
        setTotalTugas(tugasCount ?? 0)
      } else {
        setTotalMateri(0)
        setTotalTugas(0)
      }

      setLoading(false)
    }

    getData()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-500 dark:text-slate-400">
          Tahun Ajaran: {namaTahunAjaran || "-"}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Kelas"
          value={String(totalKelas)}
          icon={<Users className="h-6 w-6" />}
        />

        <StatCard
          title="Materi Dibuat"
          value={String(totalMateri)}
          icon={<BookOpen className="h-6 w-6" />}
        />

        <StatCard
          title="Tugas Dibuat"
          value={String(totalTugas)}
          icon={<FileText className="h-6 w-6" />}
        />

        <StatCard
          title="Pembagian Mengajar"
          value={String(aktivitas.length)}
          icon={<Activity className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold">Data Guru</h3>

          <div className="mt-4 space-y-2 text-sm">
            <Info label="UID Guru" value={guru?.uid} />
            <Info label="Nama Lengkap" value={guru?.nama_lengkap} />
            <Info label="No HP" value={guru?.no_hp} />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold">
            Aktivitas Mengajar
          </h3>

          <div className="mt-4 space-y-3">
            {aktivitas.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Belum ada pembagian mengajar untuk tahun ajaran ini.
              </p>
            ) : (
              aktivitas.map((item) => {
                const mapel = firstItem(item.mapel)
                const kelas = firstItem(item.kelas)

                return (
                  <div
                    key={item.id_mapel_kelas_guru}
                    className="rounded-xl border p-4 text-sm dark:border-slate-800"
                  >
                    <p className="font-semibold">
                      {mapel?.nama_mapel ?? "-"}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Kelas {kelas?.tingkat ?? "-"} -{" "}
                      {kelas?.nama_kelas ?? "-"}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-3xl font-bold">{value}</h3>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </div>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-right font-medium">
        {value || "-"}
      </span>
    </div>
  )
}