"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, FileText, GraduationCap, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Siswa = {
  nisn: string
  nama_lengkap: string
  tempat_lahir: string
  tanggal_lahir: string
  jenkel: string
  agama: string
  tahun_masuk: number
}

type KelasAktif = {
  id_siswa_kelas: string
  status: string
  kelas: {
    tingkat: number | null
    nama_kelas: string | null
  } | null
}

type AktivitasItem = {
  tipe: string
  judul: string
  keterangan: string
  tanggal: string | null
}

export default function SiswaDashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [siswa, setSiswa] = useState<Siswa | null>(null)
  const [kelasAktif, setKelasAktif] = useState<KelasAktif | null>(null)
  const [namaTahunAjaran, setNamaTahunAjaran] = useState("")

  const [totalMateri, setTotalMateri] = useState(0)
  const [totalTugas, setTotalTugas] = useState(0)
  const [tugasDikerjakan, setTugasDikerjakan] = useState(0)
  const [aktivitas, setAktivitas] = useState<AktivitasItem[]>([])

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
        .select("role, nisn")
        .eq("id", userData.user.id)
        .single()

      if (!profile || profile.role !== "siswa") {
        router.push("/")
        return
      }

      if (!profile.nisn) {
        router.push("/verifikasi-siswa")
        return
      }

      const { data: siswaData } = await supabase
        .from("siswa")
        .select(`
          nisn,
          nama_lengkap,
          tempat_lahir,
          tanggal_lahir,
          jenkel,
          agama,
          tahun_masuk
        `)
        .eq("nisn", profile.nisn)
        .single()

      if (!siswaData) {
        router.push("/verifikasi-siswa")
        return
      }

      setSiswa(siswaData)

      const { data: siswaKelasData } = await supabase
        .from("siswa_kelas")
        .select(`
          id_siswa_kelas,
          status,
          id_kelas,
          kelas:id_kelas (
            tingkat,
            nama_kelas
          )
        `)
        .eq("nisn", profile.nisn)
        .eq("id_tahun_ajaran", idTahunAjaran)
        .maybeSingle()

      if (!siswaKelasData) {
        setLoading(false)
        return
      }

      setKelasAktif(siswaKelasData as KelasAktif)

      const idKelas = siswaKelasData.id_kelas

      const { data: mengajarData } = await supabase
        .from("mapel_kelas_guru")
        .select("id_mapel_kelas_guru")
        .eq("id_kelas", idKelas)
        .eq("id_tahun_ajaran", idTahunAjaran)

      const idMengajar =
        mengajarData?.map((item) => item.id_mapel_kelas_guru) ?? []

      if (idMengajar.length > 0) {
        const { count: materiCount } = await supabase
          .from("materi")
          .select("*", { count: "exact", head: true })
          .in("id_mapel_kelas_guru", idMengajar)

        const { count: tugasCount } = await supabase
          .from("tugas")
          .select("*", { count: "exact", head: true })
          .in("id_mapel_kelas_guru", idMengajar)
          .eq("status", "aktif")

        const { data: tugasAktif } = await supabase
          .from("tugas")
          .select("id_tugas")
          .in("id_mapel_kelas_guru", idMengajar)
          .eq("status", "aktif")

        const idsTugasAktif =
          tugasAktif?.map((item) => item.id_tugas) ?? []

        let tugasDikerjakanCount = 0

        if (idsTugasAktif.length > 0) {
          const { count } = await supabase
            .from("tugas_siswa")
            .select("*", { count: "exact", head: true })
            .eq("nisn", profile.nisn)
            .eq("status", "selesai")
            .in("id_tugas", idsTugasAktif)

          tugasDikerjakanCount = count ?? 0
        }

        setTotalMateri(materiCount ?? 0)
        setTotalTugas(tugasCount ?? 0)
        setTugasDikerjakan(tugasDikerjakanCount)

        const aktivitasBaru: AktivitasItem[] = []

        const { data: materiTerbaru } = await supabase
          .from("materi")
          .select(`
            nama_materi,
            created_at,
            mapel_kelas_guru:id_mapel_kelas_guru (
              mapel:id_mapel (
                nama_mapel
              )
            )
          `)
          .in("id_mapel_kelas_guru", idMengajar)
          .order("created_at", { ascending: false })
          .limit(5)

        ;(materiTerbaru ?? []).forEach((item: any) => {
          aktivitasBaru.push({
            tipe: "Materi",
            judul: item.nama_materi ?? "Materi baru",
            keterangan:
              item.mapel_kelas_guru?.mapel?.nama_mapel ?? "-",
            tanggal: item.created_at,
          })
        })

        const { data: tugasTerbaru } = await supabase
          .from("tugas")
          .select(`
            id_tugas,
            judul,
            created_at,
            mapel_kelas_guru:id_mapel_kelas_guru (
              mapel:id_mapel (
                nama_mapel
              )
            )
          `)
          .in("id_mapel_kelas_guru", idMengajar)
          .eq("status", "aktif")
          .order("created_at", { ascending: false })
          .limit(5)

        const idsTugas =
          tugasTerbaru?.map((item) => item.id_tugas) ?? []

        let tugasSiswaData: any[] = []

        if (idsTugas.length > 0) {
          const { data } = await supabase
            .from("tugas_siswa")
            .select("id_tugas, status, selesai_at, nilai")
            .eq("nisn", profile.nisn)
            .in("id_tugas", idsTugas)

          tugasSiswaData = data ?? []
        }

        ;(tugasTerbaru ?? []).forEach((item: any) => {
          const pengerjaan = tugasSiswaData.find(
            (p) => p.id_tugas === item.id_tugas
          )

          aktivitasBaru.push({
            tipe:
              pengerjaan?.status === "selesai"
                ? "Tugas Selesai"
                : "Tugas",
            judul: item.judul ?? "Tugas baru",
            keterangan:
              pengerjaan?.status === "selesai"
                ? `Sudah dikerjakan • Nilai: ${pengerjaan.nilai ?? "-"}`
                : item.mapel_kelas_guru?.mapel?.nama_mapel ?? "-",
            tanggal: pengerjaan?.selesai_at ?? item.created_at,
          })
        })

        aktivitasBaru.sort((a, b) => {
          return (
            new Date(b.tanggal ?? 0).getTime() -
            new Date(a.tanggal ?? 0).getTime()
          )
        })

        setAktivitas(aktivitasBaru.slice(0, 8))
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

  const kelasText = kelasAktif?.kelas
    ? `${kelasAktif.kelas.tingkat} ${kelasAktif.kelas.nama_kelas}`
    : "-"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-500 dark:text-slate-400">
          Tahun Ajaran: {namaTahunAjaran || "-"}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Kelas"
          value={kelasText}
          icon={<GraduationCap className="h-6 w-6" />}
        />

        <StatCard
          title="Materi Aktif"
          value={String(totalMateri)}
          icon={<BookOpen className="h-6 w-6" />}
        />

        <StatCard
          title="Tugas Aktif"
          value={String(totalTugas)}
          icon={<FileText className="h-6 w-6" />}
        />

        <StatCard
          title="Tugas Dikerjakan"
          value={String(tugasDikerjakan)}
          icon={<Activity className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold">
            Data Siswa
          </h3>

          <div className="mt-4 space-y-2 text-sm">
            <Info label="NISN" value={siswa?.nisn} />
            <Info label="Nama Lengkap" value={siswa?.nama_lengkap} />
            <Info label="Kelas" value={kelasText} />
            <Info label="Status Kelas" value={kelasAktif?.status} />
            <Info label="Tempat Lahir" value={siswa?.tempat_lahir} />
            <Info
              label="Tanggal Lahir"
              value={
                siswa?.tanggal_lahir
                  ? new Date(siswa.tanggal_lahir).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )
                  : "-"
              }
            />
            <Info
              label="Jenis Kelamin"
              value={siswa?.jenkel === "P" ? "Perempuan" : "Laki-laki"}
            />
            <Info label="Agama" value={siswa?.agama} />
            <Info
              label="Tahun Masuk"
              value={String(siswa?.tahun_masuk)}
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold">
            Aktivitas Terbaru
          </h3>

          <div className="mt-4 space-y-3">
            {aktivitas.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Belum ada aktivitas belajar.
              </p>
            ) : (
              aktivitas.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border p-4 text-sm dark:border-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {item.judul}
                    </p>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
                      {item.tipe}
                    </span>
                  </div>

                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {item.keterangan}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {item.tanggal
                      ? new Date(item.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </p>
                </div>
              ))
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
          <h3 className="mt-2 text-2xl font-bold">{value}</h3>
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
  value?: string
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