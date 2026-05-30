"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Kelas = {
  tingkat: number | null
  nama_kelas: string | null
}

type Mapel = {
  nama_mapel: string | null
}

type SiswaKelas = {
  id_kelas: string | null
  kelas: Kelas | Kelas[] | null
}

type MapelKelasGuru = {
  mapel: Mapel | Mapel[] | null
  kelas: Kelas | Kelas[] | null
}

type Tugas = {
  id_tugas: string
  id_mapel_kelas_guru: string
  judul: string
  deskripsi: string | null
  deadline: string | null
  status: string | null
  created_at: string | null
  tipe_tugas: string | null
  mapel_kelas_guru: MapelKelasGuru | MapelKelasGuru[] | null
}

type TugasSiswa = {
  id_tugas_siswa: string
  id_tugas: string
  nisn: string
  status: string | null
  mulai_at: string | null
  selesai_at: string | null
  nilai: number | null
  jawaban: string | null
  file_url: string | null
}

type TugasView = Tugas & {
  pengerjaan: TugasSiswa | null
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const ITEMS_PER_PAGE = 9

export default function SiswaTugasPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [tugasList, setTugasList] = useState<TugasView[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [kelasText, setKelasText] = useState("-")

  useEffect(() => {
    const getData = async () => {
      setLoading(true)

      const idTahunAjaran =
        localStorage.getItem("id_tahun_ajaran") || ""

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

      const { data: siswaKelasData, error: siswaKelasError } =
        await supabase
          .from("siswa_kelas")
          .select(`
            id_kelas,
            kelas:id_kelas (
              tingkat,
              nama_kelas
            )
          `)
          .eq("nisn", profile.nisn)
          .eq("id_tahun_ajaran", idTahunAjaran)
          .eq("status", "aktif")
          .maybeSingle()

      if (siswaKelasError) {
        alert(siswaKelasError.message)
        setLoading(false)
        return
      }

      const siswaKelas =
        siswaKelasData as unknown as SiswaKelas | null

      if (!siswaKelas?.id_kelas) {
        setTugasList([])
        setLoading(false)
        return
      }

      const kelas = firstItem(siswaKelas.kelas)

      setKelasText(
        kelas
          ? `${kelas.tingkat ?? "-"} ${kelas.nama_kelas ?? "-"}`
          : "-"
      )

      const { data: mengajarData, error: mengajarError } =
        await supabase
          .from("mapel_kelas_guru")
          .select("id_mapel_kelas_guru")
          .eq("id_kelas", siswaKelas.id_kelas)
          .eq("id_tahun_ajaran", idTahunAjaran)

      if (mengajarError) {
        alert(mengajarError.message)
        setLoading(false)
        return
      }

      const idsMengajar =
        mengajarData?.map((item) => item.id_mapel_kelas_guru) ?? []

      if (idsMengajar.length === 0) {
        setTugasList([])
        setLoading(false)
        return
      }

      const { data: tugasData, error: tugasError } = await supabase
        .from("tugas")
        .select(`
          id_tugas,
          id_mapel_kelas_guru,
          judul,
          deskripsi,
          deadline,
          status,
          created_at,
          tipe_tugas,
          mapel_kelas_guru:id_mapel_kelas_guru (
            mapel:id_mapel (
              nama_mapel
            ),
            kelas:id_kelas (
              tingkat,
              nama_kelas
            )
          )
        `)
        .in("id_mapel_kelas_guru", idsMengajar)
        .eq("status", "aktif")
        .order("created_at", { ascending: false })

      if (tugasError) {
        alert(tugasError.message)
        setLoading(false)
        return
      }

      const tugas = (tugasData ?? []) as unknown as Tugas[]
      const idsTugas = tugas.map((item) => item.id_tugas)

      let pengerjaanData: TugasSiswa[] = []

      if (idsTugas.length > 0) {
        const { data: tugasSiswaData, error: tugasSiswaError } =
          await supabase
            .from("tugas_siswa")
            .select(`
              id_tugas_siswa,
              id_tugas,
              nisn,
              status,
              mulai_at,
              selesai_at,
              nilai,
              jawaban,
              file_url
            `)
            .eq("nisn", profile.nisn)
            .in("id_tugas", idsTugas)

        if (tugasSiswaError) {
          alert(tugasSiswaError.message)
          setLoading(false)
          return
        }

        pengerjaanData =
          (tugasSiswaData ?? []) as unknown as TugasSiswa[]
      }

      const tugasView: TugasView[] = tugas.map((item) => ({
        ...item,
        pengerjaan:
          pengerjaanData.find(
            (pengerjaan) => pengerjaan.id_tugas === item.id_tugas
          ) ?? null,
      }))

      setTugasList(tugasView)
      setLoading(false)
    }

    getData()
  }, [router])

  useEffect(() => {
    setPage(1)
  }, [search])

  const getTugasRelasi = (item: Tugas) => {
    const mengajar = firstItem(item.mapel_kelas_guru)
    const mapel = firstItem(mengajar?.mapel)
    const kelas = firstItem(mengajar?.kelas)

    return { mengajar, mapel, kelas }
  }

  const filteredTugas = tugasList.filter((item) => {
    const keyword = search.toLowerCase()
    const { mapel } = getTugasRelasi(item)

    return (
      item.judul.toLowerCase().includes(keyword) ||
      String(item.deskripsi ?? "").toLowerCase().includes(keyword) ||
      String(item.tipe_tugas ?? "").toLowerCase().includes(keyword) ||
      String(mapel?.nama_mapel ?? "").toLowerCase().includes(keyword)
    )
  })

  const totalPages = Math.ceil(filteredTugas.length / ITEMS_PER_PAGE)

  const paginatedTugas = filteredTugas.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  const formatTanggal = (value: string | null) => {
    if (!value) return "-"

    return new Date(value).toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isLewatDeadline = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline).getTime() < Date.now()
  }

  const sudahSelesai = (item: TugasView) => {
    return (
      item.pengerjaan?.status === "selesai" ||
      item.pengerjaan?.status === "dinilai"
    )
  }

  const getStatusLabel = (item: TugasView) => {
    if (sudahSelesai(item)) return "Sudah Dikerjakan"
    if (item.pengerjaan?.status === "dikerjakan") return "Sedang Dikerjakan"
    if (isLewatDeadline(item.deadline)) return "Terlambat"
    return "Belum Dikerjakan"
  }

  const getStatusClass = (item: TugasView) => {
    if (sudahSelesai(item)) {
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    }

    if (item.pengerjaan?.status === "dikerjakan") {
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    }

    if (isLewatDeadline(item.deadline)) {
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
    }

    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  }

  const getTipeLabel = (tipe: string | null) => {
    if (tipe === "pilihan_ganda") return "Pilihan Ganda"
    if (tipe === "upload_file") return "Upload File"
    if (tipe === "essay") return "Essay"
    return "-"
  }

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
        <h1 className="text-2xl font-bold">
          Tugas Siswa
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Kelas: {kelasText}
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tugas..."
            className="w-full rounded-xl border bg-white py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
      </div>

      {paginatedTugas.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Belum ada tugas aktif untuk kelas ini.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedTugas.map((item) => {
            const { mapel } = getTugasRelasi(item)
            const lewatDeadline = isLewatDeadline(item.deadline)
            const selesai = sudahSelesai(item)

            return (
              <div
                key={item.id_tugas}
                className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <FileText size={16} />
                    {mapel?.nama_mapel ?? "-"}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                      item
                    )}`}
                  >
                    {getStatusLabel(item)}
                  </span>
                </div>

                <h2 className="text-lg font-semibold">
                  {item.judul}
                </h2>

                <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
                  {item.deskripsi || "Tidak ada deskripsi."}
                </p>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <BookOpen size={16} />
                    {getTipeLabel(item.tipe_tugas)}
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Clock size={16} />
                    Deadline: {formatTanggal(item.deadline)}
                  </div>

                  {item.pengerjaan?.nilai !== null &&
                    item.pengerjaan?.nilai !== undefined && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 size={16} />
                        Nilai: {item.pengerjaan.nilai}
                      </div>
                    )}

                  {lewatDeadline && !selesai && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle size={16} />
                      Deadline sudah lewat
                    </div>
                  )}
                </div>

                <Link
                  href={`/siswa/tugas/${item.id_tugas}`}
                  className={`mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ${
                    lewatDeadline && !selesai
                      ? "pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800"
                      : selesai
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {selesai ? "Lihat Jawaban" : "Kerjakan"}
                </Link>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total tugas: {filteredTugas.length}
        </p>

        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-700"
          >
            Sebelumnya
          </button>

          <span className="text-sm text-slate-500 dark:text-slate-400">
            {page} / {totalPages || 1}
          </span>

          <button
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-700"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  )
}