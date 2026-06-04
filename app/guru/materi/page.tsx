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
  id_mkg: string
  mapel: Mapel | Mapel[] | null
  kelas: Kelas | Kelas[] | null
}

type Materi = {
  id_materi: string
  id_mkg: string
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
      .from("profil")
      .select("role, uid_guru")
      .eq("user_id", userData.user.id)
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
        id_mkg,
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
      (item) => item.id_mkg
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
        id_mkg,
        nama_materi,
        deskripsi,
        url,
        created_at,
        mapel_kelas_guru:id_mkg (
          id_mkg,
          mapel:id_mapel (
            nama_mapel
          ),
          kelas:id_kelas (
            tingkat,
            nama_kelas
          )
        )
      `)
      .in("id_mkg", ids)
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
          id_mkg: idMengajar,
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
        id_mkg: idMengajar,
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
    setIdMengajar(item.id_mkg)
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
                    key={item.id_mkg}
                    value={item.id_mkg}
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

          {/* MOBILE */}
<div className="mt-5 space-y-4 md:hidden">
  {loading ? (
    <div className="rounded-xl border p-6 text-center">
      Loading data...
    </div>
  ) : filteredMateri.length === 0 ? (
    <div className="rounded-xl border p-6 text-center">
      Data materi belum ada.
    </div>
  ) : (
    filteredMateri.map((item) => {
      const mengajar = firstItem(item.mapel_kelas_guru)
      const mapel = firstItem(mengajar?.mapel)
      const kelas = firstItem(mengajar?.kelas)

      return (
        <div
          key={item.id_materi}
          className="rounded-xl border p-4 shadow-sm"
        >
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              {item.nama_materi}
            </h3>

            <p className="text-sm text-slate-500">
              {item.deskripsi || "-"}
            </p>

            <div className="text-sm space-y-1">
              <p>
                <b>Mapel:</b> {mapel?.nama_mapel ?? "-"}
              </p>

              <p>
                <b>Kelas:</b>{" "}
                {kelas
                  ? `${kelas.tingkat} ${kelas.nama_kelas}`
                  : "-"}
              </p>

              <p>
                <b>Tanggal:</b>{" "}
                {new Date(item.created_at).toLocaleDateString(
                  "id-ID"
                )}
              </p>
            </div>

            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600"
              >
                <ExternalLink size={16} />
                Buka Materi
              </a>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleEdit(item)}
                className="rounded-lg bg-yellow-500 py-2 text-white"
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(item.id_materi)}
                className="rounded-lg bg-red-500 py-2 text-white"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )
    })
  )}
</div>

{/* DESKTOP */}
<div className="mt-5 hidden md:block overflow-x-auto">
  <table className="w-full border-collapse text-sm">
    <thead>
      <tr className="border-b text-left dark:border-slate-800">
        <th className="py-3 pr-4">No</th>
        <th className="py-3 pr-4">Materi</th>
        <th className="py-3 pr-4">Mapel</th>
        <th className="py-3 pr-4">Kelas</th>
        <th className="py-3 pr-4">URL</th>
        <th className="py-3 pr-4">Aksi</th>
      </tr>
    </thead>

    <tbody>
      {filteredMateri.map((item, index) => {
        const mengajar = firstItem(item.mapel_kelas_guru)
        const mapel = firstItem(mengajar?.mapel)
        const kelas = firstItem(mengajar?.kelas)

        return (
          <tr
            key={item.id_materi}
            className="border-b dark:border-slate-800"
          >
            <td className="py-3 pr-4">
              {index + 1}
            </td>

            <td className="py-3 pr-4">
              {item.nama_materi}
            </td>

            <td className="py-3 pr-4">
              {mapel?.nama_mapel ?? "-"}
            </td>

            <td className="py-3 pr-4">
              {kelas
                ? `${kelas.tingkat} ${kelas.nama_kelas}`
                : "-"}
            </td>

            <td className="py-3 pr-4">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600"
                >
                  Buka
                </a>
              ) : (
                "-"
              )}
            </td>

            <td className="py-3 pr-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="rounded-lg bg-yellow-600 p-2"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() =>
                    handleDelete(item.id_materi)
                  }
                  className="rounded-lg bg-red-600 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        )
      })}
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