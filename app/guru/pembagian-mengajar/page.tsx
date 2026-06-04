"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Guru = {
  uid: string
  nama_lengkap: string | null
}

type Mapel = {
  id_mapel: string
  nama_mapel: string | null
}

type Kelas = {
  id_kelas: string
  tingkat: number | null
  nama_kelas: string | null
}

type PembagianMengajar = {
  id_mkg: string
  uid_guru: string
  id_mapel: string
  id_kelas: string
  id_tahun_ajaran: string
  mapel: Mapel | Mapel[] | null
  kelas: Kelas | Kelas[] | null
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function GuruPembagianMengajarPage() {
  const router = useRouter()

  const [guru, setGuru] = useState<Guru | null>(null)
  const [mapelList, setMapelList] = useState<Mapel[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [dataMengajar, setDataMengajar] = useState<PembagianMengajar[]>([])

  const [idMapel, setIdMapel] = useState("")
  const [idKelas, setIdKelas] = useState("")
  const [search, setSearch] = useState("")

  const [idTahunAjaran, setIdTahunAjaran] = useState("")
  const [namaTahunAjaran, setNamaTahunAjaran] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reloadData = async () => {
    setLoading(true)

    const tahunId = localStorage.getItem("id_tahun_ajaran") || ""
    const tahunNama = localStorage.getItem("nama_tahun_ajaran") || ""

    setIdTahunAjaran(tahunId)
    setNamaTahunAjaran(tahunNama)

    if (!tahunId) {
      alert("Tahun ajaran belum dipilih. Silakan login ulang.")
      router.push("/")
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push("/")
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("profil")
      .select("role, uid_guru")
      .eq("user_id", userData.user.id)
      .single()

    if (profileError || !profile || profile.role !== "guru") {
      router.push("/")
      return
    }

    if (!profile.uid_guru) {
      router.push("/verifikasi-guru")
      return
    }

    const uidGuru = String(profile.uid_guru)

    const { data: guruData, error: guruError } = await supabase
      .from("guru")
      .select("uid, nama_lengkap")
      .eq("uid", uidGuru)
      .single()

    if (guruError || !guruData) {
      router.push("/verifikasi-guru")
      return
    }

    setGuru(guruData as Guru)

    const [mapelRes, kelasRes, mengajarRes] = await Promise.all([
      supabase
        .from("mapel")
        .select("id_mapel, nama_mapel")
        .order("nama_mapel", { ascending: true }),

      supabase
        .from("kelas")
        .select("id_kelas, tingkat, nama_kelas")
        .order("tingkat", { ascending: true })
        .order("nama_kelas", { ascending: true }),

      supabase
        .from("mapel_kelas_guru")
        .select(`
          id_mkg,
          uid_guru,
          id_mapel,
          id_kelas,
          id_tahun_ajaran,
          mapel:id_mapel (
            id_mapel,
            nama_mapel
          ),
          kelas:id_kelas (
            id_kelas,
            tingkat,
            nama_kelas
          )
        `)
        .eq("uid_guru", uidGuru)
        .eq("id_tahun_ajaran", tahunId),
    ])

    if (mapelRes.error) {
      alert(mapelRes.error.message)
      setLoading(false)
      return
    }

    if (kelasRes.error) {
      alert(kelasRes.error.message)
      setLoading(false)
      return
    }

    if (mengajarRes.error) {
      alert(mengajarRes.error.message)
      setLoading(false)
      return
    }

    setMapelList((mapelRes.data ?? []) as Mapel[])
    setKelasList((kelasRes.data ?? []) as Kelas[])
    setDataMengajar((mengajarRes.data ?? []) as unknown as PembagianMengajar[])

    setLoading(false)
  }

  useEffect(() => {
    reloadData()
  }, [])

  const resetForm = () => {
    setIdMapel("")
    setIdKelas("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!guru) {
      alert("Data guru tidak ditemukan")
      return
    }

    if (!idTahunAjaran) {
      alert("Tahun ajaran belum dipilih")
      return
    }

    if (!idMapel || !idKelas) {
      alert("Mapel dan kelas wajib dipilih")
      return
    }

    setSaving(true)

    const { data: existing, error: checkError } = await supabase
      .from("mapel_kelas_guru")
      .select("id_mkg")
      .eq("uid_guru", guru.uid)
      .eq("id_mapel", idMapel)
      .eq("id_kelas", idKelas)
      .eq("id_tahun_ajaran", idTahunAjaran)
      .maybeSingle()

    if (checkError) {
      alert(checkError.message)
      setSaving(false)
      return
    }

    if (existing) {
      alert("Pembagian mengajar ini sudah ada")
      setSaving(false)
      return
    }

    const { error } = await supabase.from("mapel_kelas_guru").insert({
      uid_guru: guru.uid,
      id_mapel: idMapel,
      id_kelas: idKelas,
      id_tahun_ajaran: idTahunAjaran,
    })

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    alert("Pembagian mengajar berhasil ditambahkan")
    setSaving(false)
    resetForm()
    reloadData()
  }

  const handleDelete = async (id: string) => {
    const yakin = confirm("Yakin ingin menghapus pembagian mengajar ini?")
    if (!yakin) return

    const { error } = await supabase
      .from("mapel_kelas_guru")
      .delete()
      .eq("id_mkg", id)
      .eq("uid_guru", guru?.uid ?? "")

    if (error) {
      alert(error.message)
      return
    }

    reloadData()
  }

  const filteredData = dataMengajar.filter((item) => {
    const keyword = search.toLowerCase()
    const mapel = firstItem(item.mapel)
    const kelas = firstItem(item.kelas)

    return (
      String(mapel?.nama_mapel ?? "").toLowerCase().includes(keyword) ||
      String(kelas?.nama_kelas ?? "").toLowerCase().includes(keyword) ||
      String(kelas?.tingkat ?? "").includes(keyword)
    )
  })

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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Pembagian Mengajar
        </h1>

        <p className="text-gray-500 dark:text-gray-400">
          Tahun Ajaran: {namaTahunAjaran || "-"}
        </p>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Guru: {guru?.nama_lengkap || "-"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Tambah Mapel & Kelas
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mapel
              </label>

              <select
                value={idMapel}
                onChange={(e) => setIdMapel(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="">Pilih Mapel</option>
                {mapelList.map((mapel) => (
                  <option key={mapel.id_mapel} value={mapel.id_mapel}>
                    {mapel.nama_mapel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Kelas
              </label>

              <select
                value={idKelas}
                onChange={(e) => setIdKelas(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="">Pilih Kelas</option>
                {kelasList.map((kelas) => (
                  <option key={kelas.id_kelas} value={kelas.id_kelas}>
                    {kelas.tingkat} - {kelas.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={18} />
              {saving ? "Menyimpan..." : "Tambah"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Data Mengajar Saya
            </h2>

            <div className="relative w-full sm:w-64">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Cari data..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-5 space-y-4 md:hidden">
            {filteredData.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-gray-500 dark:border-gray-800">
                Data pembagian mengajar belum ada.
              </div>
            ) : (
              filteredData.map((item) => {
                const mapel = firstItem(item.mapel)
                const kelas = firstItem(item.kelas)

                return (
                  <div
                    key={item.id_mkg}
                    className="rounded-xl border p-4 shadow-sm dark:border-gray-800"
                  >
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {mapel?.nama_mapel ?? "-"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Kelas {kelas?.tingkat ?? "-"} {kelas?.nama_kelas ?? "-"}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id_mkg)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                    >
                      <Trash2 size={16} />
                      Hapus
                    </button>
                  </div>
                )
              })
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
                    Mapel
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    Kelas
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Data pembagian mengajar belum ada.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    const mapel = firstItem(item.mapel)
                    const kelas = firstItem(item.kelas)

                    return (
                      <tr
                        key={item.id_mkg}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {index + 1}
                        </td>

                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {mapel?.nama_mapel ?? "-"}
                        </td>

                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          Kelas {kelas?.tingkat ?? "-"}{" "}
                          {kelas?.nama_kelas ?? "-"}
                        </td>

                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(item.id_mkg)
                            }
                            className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Total data: {filteredData.length}
          </p>
        </div>
      </div>
    </div>
  )
}