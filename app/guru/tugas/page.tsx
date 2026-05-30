"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
  ListChecks,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Mengajar = {
  id_mapel_kelas_guru: string
  mapel: {
    nama_mapel: string | null
  } | null
  kelas: {
    tingkat: number | null
    nama_kelas: string | null
  } | null
}

type Tugas = {
  id_tugas: string
  id_mapel_kelas_guru: string
  judul: string
  deskripsi: string | null
  deadline: string | null
  status: string | null
  tipe_tugas: string | null
  created_at: string | null
  mapel_kelas_guru: Mengajar | null
}

const ITEMS_PER_PAGE = 10

export default function GuruTugasPage() {
  const router = useRouter()

  const [uidGuru, setUidGuru] = useState<number | null>(null)
  const [mengajarList, setMengajarList] = useState<Mengajar[]>([])
  const [tugasList, setTugasList] = useState<Tugas[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [idMengajar, setIdMengajar] = useState("")
  const [judul, setJudul] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [deadline, setDeadline] = useState("")
  const [status, setStatus] = useState("aktif")
  const [tipeTugas, setTipeTugas] = useState("essay")

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] =
    useState<"judul" | "mapel" | "kelas" | "deadline">("judul")
  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("asc")

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

    const guruUid = Number(profile.uid_guru)
    setUidGuru(guruUid)

    return guruUid
  }

  const reloadData = async (uid?: number) => {
    setLoading(true)

    const guruUid = uid || uidGuru || (await getUserGuru())
    const idTahunAjaran = localStorage.getItem("id_tahun_ajaran") || ""

    if (!guruUid) {
      setLoading(false)
      return
    }

    if (!idTahunAjaran) {
      alert("Tahun ajaran belum dipilih. Silakan login ulang.")
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

    const daftarMengajar = (mengajarData ?? []) as Mengajar[]
    setMengajarList(daftarMengajar)

    const ids = daftarMengajar.map((item) => item.id_mapel_kelas_guru)

    if (ids.length === 0) {
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
        tipe_tugas,
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

    if (tugasError) {
      alert(tugasError.message)
      setLoading(false)
      return
    }

    setTugasList((tugasData ?? []) as Tugas[])
    setLoading(false)
  }

  useEffect(() => {
    reloadData()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search])

  const resetForm = () => {
    setEditId(null)
    setIdMengajar("")
    setJudul("")
    setDeskripsi("")
    setDeadline("")
    setStatus("aktif")
    setTipeTugas("essay")
  }

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    if (!idMengajar || !judul || !tipeTugas) {
      alert("Mapel/kelas, judul, dan tipe tugas wajib diisi")
      return
    }

    setSaving(true)

    const payload = {
      id_mapel_kelas_guru: idMengajar,
      judul,
      deskripsi: deskripsi || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      status,
      tipe_tugas: tipeTugas,
    }

    if (editId) {
      const { error } = await supabase
        .from("tugas")
        .update(payload)
        .eq("id_tugas", editId)

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase
        .from("tugas")
        .insert(payload)

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

  const handleEdit = (item: Tugas) => {
    setEditId(item.id_tugas)
    setIdMengajar(item.id_mapel_kelas_guru)
    setJudul(item.judul)
    setDeskripsi(item.deskripsi ?? "")
    setStatus(item.status ?? "aktif")
    setTipeTugas(item.tipe_tugas ?? "essay")

    if (item.deadline) {
      const d = new Date(item.deadline)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)

      setDeadline(local)
    } else {
      setDeadline("")
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  const handleDelete = async (id: string) => {
    const yakin = confirm("Yakin ingin menghapus tugas ini?")
    if (!yakin) return

    const { error } = await supabase
      .from("tugas")
      .delete()
      .eq("id_tugas", id)

    if (error) {
      alert(error.message)
      return
    }

    reloadData()
  }

  const handleSort = (
    key: "judul" | "mapel" | "kelas" | "deadline"
  ) => {
    if (sortKey === key) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : "asc"
      )
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }

    setPage(1)
  }

  const filteredTugas = tugasList.filter((item) => {
    const keyword = search.toLowerCase()

    return (
      item.judul.toLowerCase().includes(keyword) ||
      String(item.deskripsi ?? "").toLowerCase().includes(keyword) ||
      String(item.tipe_tugas ?? "").toLowerCase().includes(keyword) ||
      String(item.status ?? "").toLowerCase().includes(keyword) ||
      String(item.mapel_kelas_guru?.mapel?.nama_mapel ?? "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.mapel_kelas_guru?.kelas?.nama_kelas ?? "")
        .toLowerCase()
        .includes(keyword)
    )
  })

  const getSortValue = (item: Tugas) => {
    if (sortKey === "judul") return item.judul ?? ""
    if (sortKey === "mapel") {
      return item.mapel_kelas_guru?.mapel?.nama_mapel ?? ""
    }
    if (sortKey === "kelas") {
      return `${item.mapel_kelas_guru?.kelas?.tingkat ?? ""} ${
        item.mapel_kelas_guru?.kelas?.nama_kelas ?? ""
      }`
    }
    return item.deadline ?? ""
  }

  const sortedTugas = [...filteredTugas].sort((a, b) => {
    const aValue = getSortValue(a).toLowerCase()
    const bValue = getSortValue(b).toLowerCase()

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedTugas.length / ITEMS_PER_PAGE)

  const paginatedTugas = sortedTugas.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  const formatTanggal = (value: string | null) => {
    if (!value) return "-"

    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
        <h1 className="text-2xl font-bold">Kelola Tugas</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Buat tugas essay, upload file, atau pilihan ganda.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">
            {editId ? "Edit Tugas" : "Tambah Tugas"}
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
                    {item.mapel?.nama_mapel} - Kelas{" "}
                    {item.kelas?.tingkat} {item.kelas?.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Judul</label>

              <input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Tugas Procedure Text"
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Tipe Tugas
              </label>

              <select
                value={tipeTugas}
                onChange={(e) => setTipeTugas(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="essay">Essay</option>
                <option value="upload_file">Upload File</option>
                <option value="pilihan_ganda">Pilihan Ganda</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Deskripsi
              </label>

              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                rows={4}
                placeholder="Tulis instruksi tugas..."
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Deadline
              </label>

              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="aktif">Aktif</option>
                <option value="draft">Draft</option>
                <option value="ditutup">Ditutup</option>
              </select>
            </div>

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

        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Data Tugas</h2>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari tugas..."
                className="w-full rounded-xl border bg-white py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 sm:w-72"
              />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left dark:border-slate-800">
                  <th className="py-3 pr-4 text-slate-500">No</th>

                  <th className="py-3 pr-4 text-slate-500">
                    <button
                      type="button"
                      onClick={() => handleSort("judul")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Judul
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-slate-500">
                    <button
                      type="button"
                      onClick={() => handleSort("mapel")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Mapel
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-slate-500">
                    <button
                      type="button"
                      onClick={() => handleSort("kelas")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Kelas
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-slate-500">
                    Tipe
                  </th>

                  <th className="py-3 pr-4 text-slate-500">
                    <button
                      type="button"
                      onClick={() => handleSort("deadline")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Deadline
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-slate-500">
                    Status
                  </th>

                  <th className="py-3 pr-4 text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedTugas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-slate-500"
                    >
                      Data tugas belum ada.
                    </td>
                  </tr>
                ) : (
                  paginatedTugas.map((item, index) => (
                    <tr
                      key={item.id_tugas}
                      className="border-b dark:border-slate-800"
                    >
                      <td className="py-3 pr-4">
                        {(page - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>

                      <td className="min-w-56 py-3 pr-4">
                        <p className="font-medium">{item.judul}</p>
                        <p className="line-clamp-1 text-xs text-slate-500">
                          {item.deskripsi || "-"}
                        </p>
                      </td>

                      <td className="py-3 pr-4">
                        {item.mapel_kelas_guru?.mapel?.nama_mapel ?? "-"}
                      </td>

                      <td className="py-3 pr-4">
                        {item.mapel_kelas_guru?.kelas?.tingkat}{" "}
                        {item.mapel_kelas_guru?.kelas?.nama_kelas}
                      </td>

                      <td className="py-3 pr-4 capitalize">
                        {String(item.tipe_tugas ?? "-").replace("_", " ")}
                      </td>

                      <td className="min-w-40 py-3 pr-4">
                        {formatTanggal(item.deadline)}
                      </td>

                      <td className="py-3 pr-4 capitalize">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
                          {item.status ?? "-"}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          {item.tipe_tugas === "pilihan_ganda" && (
                            <Link
                              href={`/guru/tugas/${item.id_tugas}/soal`}
                              className="rounded-lg bg-blue-100 p-2 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300"
                              title="Kelola soal"
                            >
                              <ListChecks size={16} />
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-lg bg-yellow-100 p-2 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id_tugas)}
                            className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Total data: {filteredTugas.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
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
                type="button"
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
    </div>
  )
}