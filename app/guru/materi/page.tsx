"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Mapel = {
  nama_mapel: string | null
}

type Kelas = {
  tingkat: number | null
  nama_kelas: string | null
}

type Mengajar = {
  id_mapel_kelas_guru: string
  mapel: Mapel | Mapel[] | null
  kelas: Kelas | Kelas[] | null
}

type Materi = {
  id_materi: string
  id_mapel_kelas_guru: string
  nama_materi: string
  deskripsi: string | null
  url: string | null
  created_at: string
  mapel_kelas_guru: Mengajar | Mengajar[] | null
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function KelolaMateriPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [uidGuru, setUidGuru] = useState("")
  const [mengajarList, setMengajarList] = useState<Mengajar[]>([])
  const [materiList, setMateriList] = useState<Materi[]>([])

  const [search, setSearch] = useState("")
  const [idMengajar, setIdMengajar] = useState("")
  const [namaMateri, setNamaMateri] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [url, setUrl] = useState("")
  const [editId, setEditId] = useState<string | null>(null)

  const getUserGuru = async () => {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push("/")
      return null
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, uid_guru")
      .eq("id", userData.user.id)
      .single()

    if (!profile || profile.role !== "guru") {
      router.push("/")
      return null
    }

    if (!profile.uid_guru) {
      router.push("/verifikasi-guru")
      return null
    }

    setUidGuru(String(profile.uid_guru))
    return String(profile.uid_guru)
  }

  const reloadData = async (uid?: string) => {
    setLoading(true)

    const guruUid = uid || uidGuru || (await getUserGuru())

    if (!guruUid) {
      setLoading(false)
      return
    }

    const idTahunAjaran =
      localStorage.getItem("id_tahun_ajaran") || ""

    if (!idTahunAjaran) {
      alert("Tahun ajaran belum dipilih. Silakan login ulang.")
      setLoading(false)
      router.push("/")
      return
    }

    const { data: mengajarData, error: mengajarError } = await supabase
      .from("mapel_kelas_guru")
      .select(`
        id_mapel_kelas_guru,
        mapel:id_mapel (
          nama_mapel
        ),
        kelas:id_kelas (
          tingkat,
          nama_kelas
        )
      `)
      .eq("uid_guru", guruUid)
      .eq("id_tahun_ajaran", idTahunAjaran)

    if (mengajarError) {
      alert(mengajarError.message)
      setLoading(false)
      return
    }

    const daftarMengajar =
      (mengajarData ?? []) as unknown as Mengajar[]

    setMengajarList(daftarMengajar)

    const ids = daftarMengajar.map(
      (item) => item.id_mapel_kelas_guru
    )

    if (ids.length === 0) {
      setMateriList([])
      setLoading(false)
      return
    }

    const { data: materiData, error } = await supabase
      .from("materi")
      .select(`
        id_materi,
        id_mapel_kelas_guru,
        nama_materi,
        deskripsi,
        url,
        created_at,
        mapel_kelas_guru:id_mapel_kelas_guru (
          id_mapel_kelas_guru,
          mapel:id_mapel (
            nama_mapel
          ),
          kelas:id_kelas (
            tingkat,
            nama_kelas
          )
        )
      `)
      .in("id_mapel_kelas_guru", ids)
      .order("created_at", { ascending: false })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setMateriList((materiData ?? []) as unknown as Materi[])
    setLoading(false)
  }

  useEffect(() => {
    reloadData()
  }, [])

  const resetForm = () => {
    setIdMengajar("")
    setNamaMateri("")
    setDeskripsi("")
    setUrl("")
    setEditId(null)
  }

  const normalizeUrl = (input: string) => {
    const trimmed = input.trim()

    if (!trimmed) return ""

    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed
    }

    return `https://${trimmed}`
  }

  const isYoutubeUrl = (input: string) => {
    return (
      input.includes("youtube.com/watch") ||
      input.includes("youtu.be/") ||
      input.includes("youtube.com/embed/")
    )
  }

  const getYoutubeEmbedUrl = (input: string) => {
    try {
      const normalized = normalizeUrl(input)
      const parsedUrl = new URL(normalized)

      if (parsedUrl.hostname.includes("youtu.be")) {
        const videoId = parsedUrl.pathname.replace("/", "")
        return `https://www.youtube.com/embed/${videoId}`
      }

      if (parsedUrl.pathname.includes("/embed/")) {
        return normalized
      }

      const videoId = parsedUrl.searchParams.get("v")

      if (!videoId) return null

      return `https://www.youtube.com/embed/${videoId}`
    } catch {
      return null
    }
  }

  const getMengajarLabel = (item: Mengajar) => {
    const mapel = firstItem(item.mapel)
    const kelas = firstItem(item.kelas)

    return `${mapel?.nama_mapel ?? "-"} - ${kelas?.tingkat ?? "-"} ${
      kelas?.nama_kelas ?? "-"
    }`
  }

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    if (!idMengajar || !namaMateri) {
      alert("Mapel/kelas dan nama materi wajib diisi")
      return
    }

    const finalUrl = normalizeUrl(url)

    setSaving(true)

    if (editId) {
      const { error } = await supabase
        .from("materi")
        .update({
          id_mapel_kelas_guru: idMengajar,
          nama_materi: namaMateri,
          deskripsi,
          url: finalUrl || null,
        })
        .eq("id_materi", editId)

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("materi").insert({
        id_mapel_kelas_guru: idMengajar,
        nama_materi: namaMateri,
        deskripsi,
        url: finalUrl || null,
      })

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    resetForm()
    reloadData()
  }

  const handleEdit = (item: Materi) => {
    setEditId(item.id_materi)
    setIdMengajar(item.id_mapel_kelas_guru)
    setNamaMateri(item.nama_materi)
    setDeskripsi(item.deskripsi ?? "")
    setUrl(item.url ?? "")
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Yakin ingin menghapus materi ini?")

    if (!confirmDelete) return

    const { error } = await supabase
      .from("materi")
      .delete()
      .eq("id_materi", id)

    if (error) {
      alert(error.message)
      return
    }

    reloadData()
  }

  const filteredMateri = materiList.filter((item) => {
    const keyword = search.toLowerCase()

    const mengajar = firstItem(item.mapel_kelas_guru)
    const mapel = firstItem(mengajar?.mapel)
    const kelas = firstItem(mengajar?.kelas)

    return (
      item.nama_materi.toLowerCase().includes(keyword) ||
      String(item.deskripsi ?? "").toLowerCase().includes(keyword) ||
      String(item.url ?? "").toLowerCase().includes(keyword) ||
      String(mapel?.nama_mapel ?? "")
        .toLowerCase()
        .includes(keyword) ||
      String(kelas?.nama_kelas ?? "")
        .toLowerCase()
        .includes(keyword) ||
      String(kelas?.tingkat ?? "").includes(keyword)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola Materi</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Tambah, edit, dan hapus materi berdasarkan mapel dan kelas yang Anda ajar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">
            {editId ? "Edit Materi" : "Tambah Materi"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">
                Mapel dan Kelas
              </label>

              <select
                value={idMengajar}
                onChange={(e) => setIdMengajar(e.target.value)}
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

            <div>
              <label className="text-sm font-medium">
                Nama Materi
              </label>

              <input
                type="text"
                value={namaMateri}
                onChange={(e) => setNamaMateri(e.target.value)}
                placeholder="Contoh: Procedure Text"
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Deskripsi
              </label>

              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Tulis deskripsi materi..."
                rows={4}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                URL Materi
              </label>

              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/... atau link materi biasa"
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />

              <p className="mt-1 text-xs text-slate-500">
                Bisa link Google Drive, website, PDF, atau YouTube.
              </p>
            </div>

            {url && isYoutubeUrl(normalizeUrl(url)) && (
              <div className="overflow-hidden rounded-xl border dark:border-slate-800">
                <iframe
                  src={getYoutubeEmbedUrl(url) ?? ""}
                  title="Preview YouTube"
                  className="aspect-video w-full"
                  allowFullScreen
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={18} />
                {saving ? "Menyimpan..." : editId ? "Update" : "Tambah"}
              </button>

              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border px-4 py-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Data Materi</h2>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari materi..."
                className="w-full rounded-xl border bg-white py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 sm:w-64"
              />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left dark:border-slate-800">
                  <th className="py-3 pr-4 text-slate-500">No</th>
                  <th className="py-3 pr-4 text-slate-500">Materi</th>
                  <th className="py-3 pr-4 text-slate-500">Mapel</th>
                  <th className="py-3 pr-4 text-slate-500">Kelas</th>
                  <th className="py-3 pr-4 text-slate-500">URL</th>
                  <th className="py-3 pr-4 text-slate-500">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Loading data...
                    </td>
                  </tr>
                ) : filteredMateri.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Data materi belum ada.
                    </td>
                  </tr>
                ) : (
                  filteredMateri.map((item, index) => {
                    const mengajar = firstItem(item.mapel_kelas_guru)
                    const mapel = firstItem(mengajar?.mapel)
                    const kelas = firstItem(mengajar?.kelas)

                    return (
                      <tr
                        key={item.id_materi}
                        className="border-b dark:border-slate-800"
                      >
                        <td className="py-3 pr-4">{index + 1}</td>

                        <td className="min-w-56 py-3 pr-4 font-medium">
                          <p>{item.nama_materi}</p>
                          <p className="line-clamp-1 text-xs text-slate-500">
                            {item.deskripsi || "-"}
                          </p>

                          {item.url && isYoutubeUrl(item.url) && (
                            <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">
                              YouTube Video
                            </span>
                          )}
                        </td>

                        <td className="py-3 pr-4">
                          {mapel?.nama_mapel ?? "-"}
                        </td>

                        <td className="py-3 pr-4">
                          {kelas
                            ? `${kelas.tingkat ?? "-"} ${
                                kelas.nama_kelas ?? "-"
                              }`
                            : "-"}
                        </td>

                        <td className="py-3 pr-4">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              Buka
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="rounded-lg bg-yellow-100 p-2 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item.id_materi)}
                              className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Total data: {filteredMateri.length}
          </p>
        </div>
      </div>
    </div>
  )
}