"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import SoalForm from "./components/SoalForm"
import SoalTable from "./components/SoalTable"

export type Mapel = {
  id_mapel: string
  nama_mapel: string | null
}

export type OpsiForm = {
  id_opsi?: string
  label: string
  isi_opsi: string
  gambar_url: string
  is_benar: boolean
}

export type BankSoal = {
  id_soal: string
  id_mapel: string | null
  uid_guru: number | null
  pertanyaan: string
  tipe_soal: string | null
  tingkat_kesulitan: string | null
  pembahasan: string | null
  gambar_url: string | null
  audio_url: string | null
  created_at: string | null
  mapel: Mapel | null
  opsi_jawaban: OpsiForm[]
}

const ITEMS_PER_PAGE = 10

export default function BankSoalPage() {
  const router = useRouter()

  const [uidGuru, setUidGuru] = useState<number | null>(null)
  const [mapelList, setMapelList] = useState<Mapel[]>([])
  const [soalList, setSoalList] = useState<BankSoal[]>([])
  const [editSoal, setEditSoal] = useState<BankSoal | null>(null)

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const loadSoal = async (guruUid: number) => {
    const { data, error } = await supabase
      .from("bank_soal")
      .select(`
        id_soal,
        id_mapel,
        uid_guru,
        pertanyaan,
        tipe_soal,
        tingkat_kesulitan,
        pembahasan,
        gambar_url,
        audio_url,
        created_at,
        mapel:id_mapel (
          id_mapel,
          nama_mapel
        ),
        opsi_jawaban (
          id_opsi,
          label,
          isi_opsi,
          gambar_url,
          is_benar
        )
      `)
      .eq("uid_guru", guruUid)
      .order("created_at", { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setSoalList((data ?? []) as BankSoal[])
  }

  const initPage = async () => {
    setLoading(true)

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

    const guruUid = Number(profile.uid_guru)
    setUidGuru(guruUid)

    const { data: mapelData } = await supabase
      .from("mapel")
      .select("id_mapel, nama_mapel")
      .order("nama_mapel", { ascending: true })

    setMapelList(mapelData ?? [])

    await loadSoal(guruUid)

    setLoading(false)
  }

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search])

  const handleDelete = async (id: string) => {
    const yakin = confirm("Yakin ingin menghapus soal ini?")
    if (!yakin) return

    await supabase.from("opsi_jawaban").delete().eq("id_soal", id)

    const { error } = await supabase
      .from("bank_soal")
      .delete()
      .eq("id_soal", id)

    if (error) {
      alert(error.message)
      return
    }

    if (uidGuru) await loadSoal(uidGuru)
  }

  const filteredSoal = soalList.filter((item) => {
    const keyword = search.toLowerCase()

    return (
      item.pertanyaan.toLowerCase().includes(keyword) ||
      String(item.mapel?.nama_mapel ?? "").toLowerCase().includes(keyword) ||
      String(item.tipe_soal ?? "").toLowerCase().includes(keyword) ||
      String(item.tingkat_kesulitan ?? "").toLowerCase().includes(keyword)
    )
  })

  const totalPages = Math.ceil(filteredSoal.length / ITEMS_PER_PAGE)

  const paginatedSoal = filteredSoal.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SoalForm
        uidGuru={uidGuru}
        mapelList={mapelList}
        editSoal={editSoal}
        onCancelEdit={() => setEditSoal(null)}
        onSuccess={async () => {
          setEditSoal(null)
          if (uidGuru) await loadSoal(uidGuru)
        }}
      />

      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Data Soal</h2>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari soal..."
              className="w-full rounded-xl border bg-white py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 sm:w-72"
            />
          </div>
        </div>

        <SoalTable
          data={paginatedSoal}
          page={page}
          itemsPerPage={ITEMS_PER_PAGE}
          onEdit={(soal) => {
            setEditSoal(soal)
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
          onDelete={handleDelete}
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Total data: {filteredSoal.length}
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-700"
            >
              Sebelumnya
            </button>

            <span className="text-sm text-slate-500">
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
    </div>
  )
}