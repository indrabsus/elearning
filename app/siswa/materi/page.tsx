"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, ExternalLink, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Kelas = {
  tingkat: number | null
  nama_kelas: string | null
}

type SiswaKelas = {
  id_kelas: string | null
  kelas: Kelas | Kelas[] | null
}

type Mapel = {
  nama_mapel: string | null
}

type MapelKelasGuru = {
  id_kelas: string | null
  id_mapel: string | null
  mapel: Mapel | Mapel[] | null
  kelas: Kelas | Kelas[] | null
}

type Materi = {
  id_materi: string
  nama_materi: string | null
  deskripsi: string | null
  url: string | null
  created_at: string
  id_mkg: string | null
  mapel_kelas_guru: MapelKelasGuru | MapelKelasGuru[] | null
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const ITEMS_PER_PAGE = 9

export default function SiswaMateriPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [materiList, setMateriList] = useState<Materi[]>([])
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
        .from("profil")
        .select("role, id_siswa, user_id")
        .eq("user_id", userData.user.id)
        .single()

      if (!profile || profile.role !== "siswa") {
        router.push("/")
        return
      }

      if (!profile.id_siswa) {
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
          .eq("id_siswa", profile.id_siswa)
          .eq("id_tahun_ajaran", idTahunAjaran)
          .maybeSingle()

      if (siswaKelasError) {
        alert(siswaKelasError.message)
        setLoading(false)
        return
      }

      const siswaKelas =
        siswaKelasData as unknown as SiswaKelas | null

      if (!siswaKelas?.id_kelas) {
        setMateriList([])
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
          .select("id_mkg")
          .eq("id_kelas", siswaKelas.id_kelas)
          .eq("id_tahun_ajaran", idTahunAjaran)

      if (mengajarError) {
        alert(mengajarError.message)
        setLoading(false)
        return
      }

      const idsMengajar =
        mengajarData?.map((item) => item.id_mkg) ?? []

      if (idsMengajar.length === 0) {
        setMateriList([])
        setLoading(false)
        return
      }

      const { data: materiData, error: materiError } = await supabase
        .from("materi")
        .select(`
          id_materi,
          nama_materi,
          deskripsi,
          url,
          created_at,
          id_mkg,
          mapel_kelas_guru:id_mkg (
            id_kelas,
            id_mapel,
            mapel:id_mapel (
              nama_mapel
            ),
            kelas:id_kelas (
              tingkat,
              nama_kelas
            )
          )
        `)
        .in("id_mkg", idsMengajar)
        .order("created_at", { ascending: false })

      if (materiError) {
        alert(materiError.message)
        setLoading(false)
        return
      }

      setMateriList((materiData ?? []) as unknown as Materi[])
      setLoading(false)
    }

    getData()
  }, [router])

  useEffect(() => {
    setPage(1)
  }, [search])

  const getMateriRelasi = (item: Materi) => {
    const mengajar = firstItem(item.mapel_kelas_guru)
    const mapel = firstItem(mengajar?.mapel)
    const kelas = firstItem(mengajar?.kelas)

    return { mengajar, mapel, kelas }
  }

  const filteredMateri = materiList.filter((item) => {
    const keyword = search.toLowerCase()
    const { mapel } = getMateriRelasi(item)

    return (
      String(item.nama_materi ?? "").toLowerCase().includes(keyword) ||
      String(item.deskripsi ?? "").toLowerCase().includes(keyword) ||
      String(mapel?.nama_mapel ?? "").toLowerCase().includes(keyword)
    )
  })

  const totalPages = Math.ceil(filteredMateri.length / ITEMS_PER_PAGE)

  const paginatedMateri = filteredMateri.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  const isYoutube = (url?: string | null) => {
    if (!url) return false

    return (
      url.includes("youtube.com") ||
      url.includes("youtu.be")
    )
  }

  const getYoutubeEmbed = (url: string) => {
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0]
      return `https://www.youtube.com/embed/${id}`
    }

    if (url.includes("watch?v=")) {
      const id = url.split("watch?v=")[1]?.split("&")[0]
      return `https://www.youtube.com/embed/${id}`
    }

    return url
  }

  const formatTanggal = (value: string) => {
    return new Date(value).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
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
          Materi Pembelajaran
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
            placeholder="Cari materi..."
            className="w-full rounded-xl border bg-white py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
      </div>

      {paginatedMateri.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Belum ada materi untuk kelas ini.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedMateri.map((item) => {
            const { mapel } = getMateriRelasi(item)

            return (
              <div
                key={item.id_materi}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {item.url && isYoutube(item.url) && (
                  <iframe
                    src={getYoutubeEmbed(item.url)}
                    className="aspect-video w-full"
                    allowFullScreen
                  />
                )}

                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <BookOpen size={16} />
                    {mapel?.nama_mapel ?? "-"}
                  </div>

                  <h2 className="text-lg font-semibold">
                    {item.nama_materi}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
                    {item.deskripsi || "Tidak ada deskripsi."}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    Dibuat: {formatTanggal(item.created_at)}
                  </p>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <ExternalLink size={16} />
                      Buka Materi
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total materi: {filteredMateri.length}
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