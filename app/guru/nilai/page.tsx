"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Calculator,
  CheckCircle2,
  Eye,
  FileText,
  Search,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Mapel = {
  nama_mapel: string | null
}

type Kelas = {
  tingkat: number | null
  nama_kelas: string | null
}

type SiswaRelasi = {
  nama_lengkap: string | null
}

type Mengajar = {
  id_mapel_kelas_guru: string
  kelas: Kelas | Kelas[] | null
  mapel: Mapel | Mapel[] | null
}

type Tugas = {
  id_tugas: string
  id_mapel_kelas_guru: string
  judul: string
  deskripsi: string | null
  deadline: string | null
  tipe_tugas: string | null
  status: string | null
  created_at: string | null
  mapel_kelas_guru: Mengajar | Mengajar[] | null
}

type TugasSiswa = {
  id_tugas_siswa: string
  id_tugas: string
  nisn: string
  status: string | null
  nilai: number | null
  selesai_at: string | null
  jawaban: string | null
  file_url: string | null
  siswa: SiswaRelasi | SiswaRelasi[] | null
}

type TugasView = Tugas & {
  totalSiswa: number
  totalMengumpulkan: number
  totalDinilai: number
  rataRata: number
}

type JawabanHitungUlang = {
  id_jawaban: string
  id_soal: string
  id_opsi: string | null
  opsi_jawaban:
    | {
        is_benar: boolean | null
      }
    | {
        is_benar: boolean | null
      }[]
    | null
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function GuruNilaiPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  const [mengajarList, setMengajarList] = useState<Mengajar[]>([])
  const [selectedMengajar, setSelectedMengajar] = useState("")
  const [tugasList, setTugasList] = useState<TugasView[]>([])
  const [selectedTugas, setSelectedTugas] = useState<TugasView | null>(null)
  const [jawabanList, setJawabanList] = useState<TugasSiswa[]>([])

  const [search, setSearch] = useState("")

  const loadData = async () => {
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

    const uidGuru = Number(profile.uid_guru)

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

    const daftarMengajar =
      (mengajarData ?? []) as unknown as Mengajar[]

    setMengajarList(daftarMengajar)

    const defaultMengajar =
      selectedMengajar || daftarMengajar[0]?.id_mapel_kelas_guru || ""

    setSelectedMengajar(defaultMengajar)

    await loadTugas(defaultMengajar)

    setLoading(false)
  }

  const loadTugas = async (idMengajar: string) => {
    if (!idMengajar) {
      setTugasList([])
      setSelectedTugas(null)
      setJawabanList([])
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
        tipe_tugas,
        status,
        created_at,
        mapel_kelas_guru:id_mapel_kelas_guru (
          id_mapel_kelas_guru,
          kelas:id_kelas (
            tingkat,
            nama_kelas
          ),
          mapel:id_mapel (
            nama_mapel
          )
        )
      `)
      .eq("id_mapel_kelas_guru", idMengajar)
      .order("created_at", { ascending: false })

    if (tugasError) {
      alert(tugasError.message)
      return
    }

    const tugas = (tugasData ?? []) as unknown as Tugas[]

    const { data: mengajarDetail } = await supabase
      .from("mapel_kelas_guru")
      .select("id_kelas")
      .eq("id_mapel_kelas_guru", idMengajar)
      .single()

    let totalSiswaKelas = 0

    if (mengajarDetail?.id_kelas) {
      const idTahunAjaran =
        localStorage.getItem("id_tahun_ajaran") || ""

      const { count } = await supabase
        .from("siswa_kelas")
        .select("*", { count: "exact", head: true })
        .eq("id_kelas", mengajarDetail.id_kelas)
        .eq("id_tahun_ajaran", idTahunAjaran)
        .eq("status", "aktif")

      totalSiswaKelas = count ?? 0
    }

    const tugasView: TugasView[] = []

    for (const item of tugas) {
      const { data: pengerjaan } = await supabase
        .from("tugas_siswa")
        .select("status, nilai")
        .eq("id_tugas", item.id_tugas)

      const list = pengerjaan ?? []

      const mengumpulkan = list.filter(
        (p) => p.status === "selesai" || p.status === "dinilai"
      )

      const dinilai = list.filter((p) => p.nilai !== null)

      const totalNilai = dinilai.reduce(
        (sum, p) => sum + Number(p.nilai ?? 0),
        0
      )

      tugasView.push({
        ...item,
        totalSiswa: totalSiswaKelas,
        totalMengumpulkan: mengumpulkan.length,
        totalDinilai: dinilai.length,
        rataRata:
          dinilai.length > 0
            ? Math.round(totalNilai / dinilai.length)
            : 0,
      })
    }

    setTugasList(tugasView)

    if (tugasView.length > 0) {
      setSelectedTugas(tugasView[0])
      await loadJawaban(tugasView[0].id_tugas)
    } else {
      setSelectedTugas(null)
      setJawabanList([])
    }
  }

  const loadJawaban = async (idTugas: string) => {
    const { data, error } = await supabase
      .from("tugas_siswa")
      .select(`
        id_tugas_siswa,
        id_tugas,
        nisn,
        status,
        nilai,
        selesai_at,
        jawaban,
        file_url,
        siswa:nisn (
          nama_lengkap
        )
      `)
      .eq("id_tugas", idTugas)
      .order("selesai_at", { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setJawabanList((data ?? []) as unknown as TugasSiswa[])
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleChangeMengajar = async (id: string) => {
    setSelectedMengajar(id)
    await loadTugas(id)
  }

  const handleSelectTugas = async (tugas: TugasView) => {
    setSelectedTugas(tugas)
    await loadJawaban(tugas.id_tugas)
  }

  const hitungUlangNilaiPG = async () => {
    if (!selectedTugas) return

    if (selectedTugas.tipe_tugas !== "pilihan_ganda") {
      alert("Hitung ulang nilai hanya untuk tugas pilihan ganda")
      return
    }

    setRecalculating(true)

    const { data: tugasSoal } = await supabase
      .from("tugas_soal")
      .select("id_soal, bobot")
      .eq("id_tugas", selectedTugas.id_tugas)

    const { data: pengerjaan } = await supabase
      .from("tugas_siswa")
      .select("id_tugas_siswa")
      .eq("id_tugas", selectedTugas.id_tugas)

    for (const siswa of pengerjaan ?? []) {
      const { data: jawaban } = await supabase
        .from("jawaban_tugas_siswa")
        .select(`
          id_jawaban,
          id_soal,
          id_opsi,
          opsi_jawaban:id_opsi (
            is_benar
          )
        `)
        .eq("id_tugas_siswa", siswa.id_tugas_siswa)

      const jawabanList =
        (jawaban ?? []) as unknown as JawabanHitungUlang[]

      let totalBenar = 0
      let totalBobot = 0

      for (const item of jawabanList) {
        const bobot =
          tugasSoal?.find((s) => s.id_soal === item.id_soal)?.bobot ?? 1

        const opsi = firstItem(item.opsi_jawaban)
        const benar = opsi?.is_benar === true
        const nilaiItem = benar ? Number(bobot) : 0

        totalBenar += nilaiItem
        totalBobot += Number(bobot)

        await supabase
          .from("jawaban_tugas_siswa")
          .update({
            is_benar: benar,
            nilai: nilaiItem,
          })
          .eq("id_jawaban", item.id_jawaban)
      }

      const nilaiAkhir =
        totalBobot > 0
          ? Math.round((totalBenar / totalBobot) * 100)
          : 0

      await supabase
        .from("tugas_siswa")
        .update({
          nilai: nilaiAkhir,
        })
        .eq("id_tugas_siswa", siswa.id_tugas_siswa)
    }

    alert("Nilai pilihan ganda berhasil dihitung ulang")
    setRecalculating(false)

    if (selectedMengajar) await loadTugas(selectedMengajar)
  }

  const filteredJawaban = jawabanList.filter((item) => {
    const keyword = search.toLowerCase()
    const siswa = firstItem(item.siswa)

    return (
      String(item.nisn).toLowerCase().includes(keyword) ||
      String(siswa?.nama_lengkap ?? "").toLowerCase().includes(keyword) ||
      String(item.status ?? "").toLowerCase().includes(keyword)
    )
  })

  const formatTanggal = (value: string | null) => {
    if (!value) return "-"

    return new Date(value).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const tipeLabel = (tipe: string | null) => {
    if (tipe === "pilihan_ganda") return "Pilihan Ganda"
    if (tipe === "upload_file") return "Upload File"
    if (tipe === "essay") return "Essay"
    return "-"
  }

  const getMengajarLabel = (item: Mengajar) => {
    const mapel = firstItem(item.mapel)
    const kelas = firstItem(item.kelas)

    return `${mapel?.nama_mapel ?? "-"} - Kelas ${
      kelas?.tingkat ?? "-"
    } ${kelas?.nama_kelas ?? "-"}`
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold">Nilai Siswa</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Lihat pengerjaan, nilai, dan progres siswa berdasarkan tugas.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="text-sm font-medium">
          Pilih Mapel dan Kelas
        </label>

        <select
          value={selectedMengajar}
          onChange={(e) => handleChangeMengajar(e.target.value)}
          className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">Pilih Mapel dan Kelas</option>
          {mengajarList.map((item) => (
            <option
              key={item.id_mapel_kelas_guru}
              value={item.id_mapel_kelas_guru}
            >
              {getMengajarLabel(item)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">
            Daftar Tugas
          </h2>

          <div className="mt-4 space-y-3">
            {tugasList.length === 0 ? (
              <p className="text-sm text-slate-500">
                Belum ada tugas.
              </p>
            ) : (
              tugasList.map((item) => (
                <button
                  key={item.id_tugas}
                  type="button"
                  onClick={() => handleSelectTugas(item)}
                  className={`w-full rounded-xl border p-4 text-left transition dark:border-slate-800 ${
                    selectedTugas?.id_tugas === item.id_tugas
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <p className="font-semibold">{item.judul}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tipeLabel(item.tipe_tugas)} • {item.status}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                      <p className="font-bold">{item.totalMengumpulkan}</p>
                      <p>Kumpul</p>
                    </div>

                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                      <p className="font-bold">{item.totalDinilai}</p>
                      <p>Dinilai</p>
                    </div>

                    <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                      <p className="font-bold">{item.rataRata}</p>
                      <p>Rata2</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-2">
          {selectedTugas ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                  title="Total Siswa"
                  value={String(selectedTugas.totalSiswa)}
                  icon={<Users size={22} />}
                />
                <StatCard
                  title="Mengumpulkan"
                  value={String(selectedTugas.totalMengumpulkan)}
                  icon={<CheckCircle2 size={22} />}
                />
                <StatCard
                  title="Dinilai"
                  value={String(selectedTugas.totalDinilai)}
                  icon={<FileText size={22} />}
                />
                <StatCard
                  title="Rata-rata"
                  value={String(selectedTugas.rataRata)}
                  icon={<BarChart3 size={22} />}
                />
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedTugas.judul}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {tipeLabel(selectedTugas.tipe_tugas)} • Deadline:{" "}
                      {formatTanggal(selectedTugas.deadline)}
                    </p>
                  </div>

                  {selectedTugas.tipe_tugas === "pilihan_ganda" && (
                    <button
                      type="button"
                      onClick={hitungUlangNilaiPG}
                      disabled={recalculating}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Calculator size={16} />
                      {recalculating
                        ? "Menghitung..."
                        : "Hitung Ulang Nilai"}
                    </button>
                  )}
                </div>

                <div className="relative mt-5">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari siswa..."
                    className="w-full rounded-xl border bg-white py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left dark:border-slate-800">
                        <th className="py-3 pr-4 text-slate-500">No</th>
                        <th className="py-3 pr-4 text-slate-500">Siswa</th>
                        <th className="py-3 pr-4 text-slate-500">Status</th>
                        <th className="py-3 pr-4 text-slate-500">Tanggal</th>
                        <th className="py-3 pr-4 text-slate-500">Nilai</th>
                        <th className="py-3 pr-4 text-slate-500">Aksi</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredJawaban.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-6 text-center text-slate-500"
                          >
                            Belum ada siswa yang mengerjakan.
                          </td>
                        </tr>
                      ) : (
                        filteredJawaban.map((item, index) => {
                          const siswa = firstItem(item.siswa)

                          return (
                            <tr
                              key={item.id_tugas_siswa}
                              className="border-b dark:border-slate-800"
                            >
                              <td className="py-3 pr-4">{index + 1}</td>
                              <td className="py-3 pr-4">
                                <p className="font-medium">
                                  {siswa?.nama_lengkap ?? "-"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {item.nisn}
                                </p>
                              </td>
                              <td className="py-3 pr-4 capitalize">
                                {item.status ?? "-"}
                              </td>
                              <td className="py-3 pr-4">
                                {formatTanggal(item.selesai_at)}
                              </td>
                              <td className="py-3 pr-4">
                                {item.nilai ?? "-"}
                              </td>
                              <td className="py-3 pr-4">
                                <Link
                                  href={`/guru/nilai/${item.id_tugas_siswa}`}
                                  className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                >
                                  <Eye size={16} />
                                  Lihat
                                </Link>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              Pilih tugas terlebih dahulu.
            </div>
          )}
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
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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