"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
  Eye,
  X,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Kelas = {
  id_kelas: string
  tingkat: number | null
  nama_kelas: string | null
  created_at: string
  jumlah_siswa?: number
}

type Siswa = {
  nisn: string
  nama_lengkap: string | null
  tempat_lahir: string | null
  tanggal_lahir: string | null
  jenkel: string | null
}

type SiswaKelas = {
  id_siswa_kelas: string
  nisn: string
  id_kelas: string
  id_tahun_ajaran: string
  status: string | null
  siswa: Siswa | Siswa[] | null
  kelas: {
    tingkat: number | null
    nama_kelas: string | null
  } | {
    tingkat: number | null
    nama_kelas: string | null
  }[] | null
}

const ITEMS_PER_PAGE = 10

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function KelolaKelasPage() {
  const [kelas, setKelas] = useState<Kelas[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState("")
  const [tingkat, setTingkat] = useState("")
  const [namaKelas, setNamaKelas] = useState("")
  const [editId, setEditId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<keyof Kelas>("tingkat")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const [idTahunAjaran, setIdTahunAjaran] = useState("")
  const [namaTahunAjaran, setNamaTahunAjaran] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedKelas, setSelectedKelas] = useState<Kelas | null>(null)
  const [anggotaKelas, setAnggotaKelas] = useState<SiswaKelas[]>([])
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [semuaSiswaKelas, setSemuaSiswaKelas] = useState<SiswaKelas[]>([])
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([])
  const [searchSiswa, setSearchSiswa] = useState("")
  const [loadingModal, setLoadingModal] = useState(false)

  const reloadKelas = async () => {
    setLoading(true)

    const tahunId = localStorage.getItem("id_tahun_ajaran") || ""
    const tahunNama = localStorage.getItem("nama_tahun_ajaran") || ""

    setIdTahunAjaran(tahunId)
    setNamaTahunAjaran(tahunNama)

    if (!tahunId) {
      alert("Tahun ajaran belum dipilih. Silakan login ulang.")
      setLoading(false)
      return
    }

    const { data: kelasData, error: kelasError } = await supabase
      .from("kelas")
      .select("*")
      .order("tingkat", { ascending: true })
      .order("nama_kelas", { ascending: true })

    if (kelasError) {
      alert(kelasError.message)
      setLoading(false)
      return
    }

    const { data: siswaKelasData, error: siswaKelasError } = await supabase
      .from("siswa_kelas")
      .select("id_kelas")
      .eq("id_tahun_ajaran", tahunId)
      .eq("status", "aktif")

    if (siswaKelasError) {
      alert(siswaKelasError.message)
      setLoading(false)
      return
    }

    const jumlahMap = new Map<string, number>()

    ;(siswaKelasData ?? []).forEach((item) => {
      jumlahMap.set(item.id_kelas, (jumlahMap.get(item.id_kelas) ?? 0) + 1)
    })

    const kelasFinal = (kelasData ?? []).map((item) => ({
      ...item,
      jumlah_siswa: jumlahMap.get(item.id_kelas) ?? 0,
    }))

    setKelas(kelasFinal)
    setLoading(false)
  }

  useEffect(() => {
    reloadKelas()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search])

  const resetForm = () => {
    setTingkat("")
    setNamaKelas("")
    setEditId(null)
  }

  const handleSort = (key: keyof Kelas) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }

    setPage(1)
  }

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    if (!tingkat || !namaKelas) {
      alert("Tingkat dan nama kelas wajib diisi")
      return
    }

    setSaving(true)

    if (editId) {
      const { error } = await supabase
        .from("kelas")
        .update({
          tingkat: Number(tingkat),
          nama_kelas: namaKelas,
        })
        .eq("id_kelas", editId)

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("kelas").insert({
        tingkat: Number(tingkat),
        nama_kelas: namaKelas,
      })

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    resetForm()
    reloadKelas()
  }

  const handleEdit = (item: Kelas) => {
    setEditId(item.id_kelas)
    setTingkat(String(item.tingkat ?? ""))
    setNamaKelas(item.nama_kelas ?? "")
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Yakin ingin menghapus kelas ini?")
    if (!confirmDelete) return

    const { error } = await supabase
      .from("kelas")
      .delete()
      .eq("id_kelas", id)

    if (error) {
      alert(error.message)
      return
    }

    reloadKelas()
  }

  const openAnggotaModal = async (kelasItem: Kelas) => {
    setSelectedKelas(kelasItem)
    setModalOpen(true)
    setSelectedSiswa([])
    setSearchSiswa("")
    await loadModalData(kelasItem.id_kelas)
  }

  const loadModalData = async (idKelas: string) => {
    if (!idTahunAjaran) return

    setLoadingModal(true)

    const [siswaRes, semuaSiswaKelasRes, anggotaRes] = await Promise.all([
      supabase
        .from("siswa")
        .select("nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenkel")
        .order("nama_lengkap", { ascending: true }),

      supabase
        .from("siswa_kelas")
        .select(`
          id_siswa_kelas,
          nisn,
          id_kelas,
          id_tahun_ajaran,
          status,
          kelas:id_kelas (
            tingkat,
            nama_kelas
          )
        `)
        .eq("id_tahun_ajaran", idTahunAjaran)
        .eq("status", "aktif"),

      supabase
        .from("siswa_kelas")
        .select(`
          id_siswa_kelas,
          nisn,
          id_kelas,
          id_tahun_ajaran,
          status,
          siswa:nisn (
            nisn,
            nama_lengkap,
            tempat_lahir,
            tanggal_lahir,
            jenkel
          ),
          kelas:id_kelas (
            tingkat,
            nama_kelas
          )
        `)
        .eq("id_tahun_ajaran", idTahunAjaran)
        .eq("id_kelas", idKelas)
        .eq("status", "aktif"),
    ])

    if (siswaRes.error) {
      alert(siswaRes.error.message)
      setLoadingModal(false)
      return
    }

    if (semuaSiswaKelasRes.error) {
      alert(semuaSiswaKelasRes.error.message)
      setLoadingModal(false)
      return
    }

    if (anggotaRes.error) {
      alert(anggotaRes.error.message)
      setLoadingModal(false)
      return
    }

    setSiswaList((siswaRes.data ?? []) as Siswa[])
    setSemuaSiswaKelas((semuaSiswaKelasRes.data ?? []) as unknown as SiswaKelas[])
    setAnggotaKelas((anggotaRes.data ?? []) as unknown as SiswaKelas[])

    setLoadingModal(false)
  }

  const getSiswaKelasAktif = (nisn: string) => {
    return semuaSiswaKelas.find((item) => item.nisn === nisn)
  }

  const togglePilihSiswa = (nisn: string) => {
    const dataKelasAktif = getSiswaKelasAktif(nisn)

    if (dataKelasAktif) return

    setSelectedSiswa((prev) =>
      prev.includes(nisn)
        ? prev.filter((item) => item !== nisn)
        : [...prev, nisn]
    )
  }

  const handleTambahAnggota = async () => {
    if (!selectedKelas) return

    if (!idTahunAjaran) {
      alert("Tahun ajaran belum dipilih")
      return
    }

    if (selectedSiswa.length === 0) {
      alert("Pilih minimal satu siswa")
      return
    }

    const siswaSudahPunyaKelas = selectedSiswa.filter((nisn) =>
      semuaSiswaKelas.some((item) => item.nisn === nisn)
    )

    if (siswaSudahPunyaKelas.length > 0) {
      alert("Ada siswa yang sudah memiliki kelas di tahun ajaran ini")
      return
    }

    setSaving(true)

    const insertData = selectedSiswa.map((nisn) => ({
      nisn,
      id_kelas: selectedKelas.id_kelas,
      id_tahun_ajaran: idTahunAjaran,
      status: "aktif",
    }))

    const { error } = await supabase.from("siswa_kelas").insert(insertData)

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    alert("Siswa berhasil ditambahkan ke kelas")
    setSaving(false)
    setSelectedSiswa([])
    await loadModalData(selectedKelas.id_kelas)
    await reloadKelas()
  }

  const handleHapusAnggota = async (idSiswaKelas: string) => {
    if (!selectedKelas) return

    const yakin = confirm("Hapus siswa ini dari kelas?")
    if (!yakin) return

    const { error } = await supabase
      .from("siswa_kelas")
      .delete()
      .eq("id_siswa_kelas", idSiswaKelas)

    if (error) {
      alert(error.message)
      return
    }

    await loadModalData(selectedKelas.id_kelas)
    await reloadKelas()
  }

  const filteredKelas = kelas.filter((item) => {
    const keyword = search.toLowerCase()

    return (
      String(item.tingkat ?? "").includes(keyword) ||
      String(item.nama_kelas ?? "").toLowerCase().includes(keyword)
    )
  })

  const sortedKelas = [...filteredKelas].sort((a, b) => {
    const aValue = a[sortKey]
    const bValue = b[sortKey]

    if (sortKey === "tingkat" || sortKey === "jumlah_siswa") {
      const aNumber = Number(aValue ?? 0)
      const bNumber = Number(bValue ?? 0)

      return sortDirection === "asc"
        ? aNumber - bNumber
        : bNumber - aNumber
    }

    const aString = String(aValue ?? "").toLowerCase()
    const bString = String(bValue ?? "").toLowerCase()

    if (aString < bString) return sortDirection === "asc" ? -1 : 1
    if (aString > bString) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedKelas.length / ITEMS_PER_PAGE)

  const paginatedKelas = sortedKelas.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  const filteredSiswaModal = useMemo(() => {
    const keyword = searchSiswa.toLowerCase()

    return siswaList.filter((item) => {
      return (
        String(item.nisn ?? "").toLowerCase().includes(keyword) ||
        String(item.nama_lengkap ?? "").toLowerCase().includes(keyword)
      )
    })
  }, [siswaList, searchSiswa])

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Kelola Kelas
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Tahun Ajaran: {namaTahunAjaran || "-"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {editId ? "Edit Kelas" : "Tambah Kelas"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tingkat
              </label>

              <input
                type="number"
                placeholder="Contoh: 10, 11, 12"
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nama Kelas
              </label>

              <input
                type="text"
                placeholder="Contoh: PPLG 1"
                value={namaKelas}
                onChange={(e) => setNamaKelas(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
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
                  className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Data Kelas
            </h2>

            <div className="relative w-full sm:w-64">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Cari kelas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-5 space-y-4 md:hidden">
            {loading ? (
              <div className="rounded-xl border p-6 text-center text-gray-500">
                Loading data...
              </div>
            ) : paginatedKelas.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-gray-500">
                Data kelas belum ada.
              </div>
            ) : (
              paginatedKelas.map((item, index) => (
                <div
                  key={item.id_kelas}
                  className="rounded-xl border p-4 shadow-sm dark:border-gray-800"
                >
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {index + 1}. Kelas {item.tingkat} {item.nama_kelas}
                  </p>

                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Jumlah siswa: {item.jumlah_siswa ?? 0}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => openAnggotaModal(item)}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 py-2 text-white"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="inline-flex items-center justify-center rounded-lg bg-yellow-500 py-2 text-white"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id_kelas)}
                      className="inline-flex items-center justify-center rounded-lg bg-red-600 py-2 text-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-800">
                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    No
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("tingkat")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Tingkat
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("nama_kelas")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Nama Kelas
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("jumlah_siswa")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Jumlah Siswa
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : paginatedKelas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Data kelas belum ada.
                    </td>
                  </tr>
                ) : (
                  paginatedKelas.map((item, index) => (
                    <tr
                      key={item.id_kelas}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {(page - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>

                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {item.tingkat}
                      </td>

                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                        {item.nama_kelas}
                      </td>

                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          <Users size={14} />
                          {item.jumlah_siswa ?? 0}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openAnggotaModal(item)}
                            className="rounded-lg bg-blue-100 p-2 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300"
                            title="Lihat anggota"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-lg bg-yellow-100 p-2 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id_kelas)}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total data: {filteredKelas.length}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((prev) => prev - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Sebelumnya
              </button>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {page} / {totalPages || 1}
              </span>

              <button
                type="button"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && selectedKelas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3 border-b p-4 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  Anggota Kelas {selectedKelas.tingkat}{" "}
                  {selectedKelas.nama_kelas}
                </h2>
                <p className="text-sm text-gray-500">
                  Tahun Ajaran: {namaTahunAjaran || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-80px)] gap-4 overflow-y-auto p-4 lg:grid-cols-2">
              <div className="rounded-xl border p-4 dark:border-gray-800">
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  Anggota Saat Ini
                </h3>

                <div className="mt-4 space-y-3">
                  {loadingModal ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                  ) : anggotaKelas.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Belum ada anggota.
                    </p>
                  ) : (
                    anggotaKelas.map((item) => {
                      const siswa = firstItem(item.siswa)

                      return (
                        <div
                          key={item.id_siswa_kelas}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3 dark:border-gray-800"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium">
                              {siswa?.nama_lengkap ?? item.nisn}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.nisn}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleHapusAnggota(item.id_siswa_kelas)
                            }
                            className="shrink-0 rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4 dark:border-gray-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    Tambah Siswa
                  </h3>

                  <button
                    type="button"
                    onClick={handleTambahAnggota}
                    disabled={saving || selectedSiswa.length === 0}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Tambah {selectedSiswa.length > 0 ? selectedSiswa.length : ""}
                  </button>
                </div>

                <div className="relative mt-4">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    value={searchSiswa}
                    onChange={(e) => setSearchSiswa(e.target.value)}
                    placeholder="Cari siswa..."
                    className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">
                  {filteredSiswaModal.map((item) => {
                    const kelasAktif = getSiswaKelasAktif(item.nisn)
                    const kelasAktifData = firstItem(kelasAktif?.kelas)
                    const disabled = !!kelasAktif
                    const checked = selectedSiswa.includes(item.nisn)

                    return (
                      <label
                        key={item.nisn}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm dark:border-gray-800 ${
                          disabled
                            ? "cursor-not-allowed bg-gray-100 opacity-70 dark:bg-gray-800"
                            : checked
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePilihSiswa(item.nisn)}
                          className="mt-1"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="break-words font-medium">
                            {item.nama_lengkap ?? "-"}
                          </p>
                          <p className="text-xs text-gray-500">
                            NISN: {item.nisn}
                          </p>

                          {disabled && (
                            <p className="mt-1 text-xs text-red-500">
                              Sudah di kelas {kelasAktifData?.tingkat ?? "-"}{" "}
                              {kelasAktifData?.nama_kelas ?? "-"}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}