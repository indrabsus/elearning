"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Mapel = {
  nama_mapel: string | null
}

type MapelKelasGuru = {
  mapel: Mapel | Mapel[] | null
}

type TugasRelasi = {
  id_tugas: string
  judul: string
  tipe_tugas: string | null
  mapel_kelas_guru: MapelKelasGuru | MapelKelasGuru[] | null
}

type NilaiItem = {
  id_tugas_siswa: string
  nilai: number | null
  status: string | null
  selesai_at: string | null
  tugas: TugasRelasi | TugasRelasi[] | null
}

type GroupedNilai = {
  mapel: string
  items: NilaiItem[]
  rataRata: number
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function SiswaNilaiPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [dataNilai, setDataNilai] = useState<GroupedNilai[]>([])

  useEffect(() => {
    const getData = async () => {
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

      const { data, error } = await supabase
        .from("tugas_siswa")
        .select(`
          id_tugas_siswa,
          nilai,
          status,
          selesai_at,
          tugas:id_tugas (
            id_tugas,
            judul,
            tipe_tugas,
            mapel_kelas_guru:id_mapel_kelas_guru (
              mapel:id_mapel (
                nama_mapel
              )
            )
          )
        `)
        .eq("nisn", profile.nisn)
        .not("nilai", "is", null)
        .order("selesai_at", { ascending: false })

      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }

      const nilaiList =
        (data ?? []) as unknown as NilaiItem[]

      const grouped = nilaiList.reduce<Record<string, NilaiItem[]>>(
        (acc, item) => {
          const tugas = firstItem(item.tugas)
          const mengajar = firstItem(tugas?.mapel_kelas_guru)
          const mapel = firstItem(mengajar?.mapel)

          const namaMapel = mapel?.nama_mapel ?? "Tanpa Mapel"

          if (!acc[namaMapel]) acc[namaMapel] = []
          acc[namaMapel].push(item)

          return acc
        },
        {}
      )

      const hasil: GroupedNilai[] = Object.entries(grouped).map(
        ([mapel, items]) => {
          const total = items.reduce(
            (sum, item) => sum + Number(item.nilai ?? 0),
            0
          )

          return {
            mapel,
            items,
            rataRata:
              items.length > 0
                ? Math.round(total / items.length)
                : 0,
          }
        }
      )

      setDataNilai(hasil)
      setLoading(false)
    }

    getData()
  }, [router])

  const formatTanggal = (value: string | null) => {
    if (!value) return "-"

    return new Date(value).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
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
        <h1 className="text-2xl font-bold">Nilai Siswa</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Rekap nilai tugas berdasarkan mata pelajaran.
        </p>
      </div>

      {dataNilai.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Belum ada nilai tugas.
        </div>
      ) : (
        <div className="space-y-6">
          {dataNilai.map((group) => (
            <div
              key={group.mapel}
              className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-3 border-b pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <BarChart3 size={20} />
                    <h2 className="text-xl font-semibold">
                      {group.mapel}
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Total tugas dinilai: {group.items.length}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 px-4 py-3 text-center dark:bg-blue-950">
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Rata-rata
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-200">
                    {group.rataRata}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left dark:border-slate-800">
                      <th className="py-3 pr-4 text-slate-500">No</th>
                      <th className="py-3 pr-4 text-slate-500">Tugas</th>
                      <th className="py-3 pr-4 text-slate-500">Tipe</th>
                      <th className="py-3 pr-4 text-slate-500">
                        Tanggal Kumpul
                      </th>
                      <th className="py-3 pr-4 text-slate-500">Status</th>
                      <th className="py-3 pr-4 text-slate-500">Nilai</th>
                    </tr>
                  </thead>

                  <tbody>
                    {group.items.map((item, index) => {
                      const tugas = firstItem(item.tugas)

                      return (
                        <tr
                          key={item.id_tugas_siswa}
                          className="border-b dark:border-slate-800"
                        >
                          <td className="py-3 pr-4">{index + 1}</td>

                          <td className="min-w-56 py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <FileText size={16} />
                              <span className="font-medium">
                                {tugas?.judul ?? "-"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 pr-4">
                            {getTipeLabel(tugas?.tipe_tugas ?? null)}
                          </td>

                          <td className="py-3 pr-4">
                            {formatTanggal(item.selesai_at)}
                          </td>

                          <td className="py-3 pr-4 capitalize">
                            {item.status ?? "-"}
                          </td>

                          <td className="py-3 pr-4">
                            <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                              {item.nilai}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}