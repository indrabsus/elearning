"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Search,
  Save,
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Mapel = {
  nama_mapel: string | null
}

type Kelas = {
  tingkat: number | null
  nama_kelas: string | null
}

type MapelKelasGuru = {
  id_mapel: string | null
  id_kelas: string | null
  uid_guru: number | null
  mapel: Mapel | Mapel[] | null
  kelas: Kelas | Kelas[] | null
}

type Tugas = {
  id_tugas: string
  judul: string
  tipe_tugas: string | null
  id_mkg: string
  mapel_kelas_guru: MapelKelasGuru | MapelKelasGuru[] | null
}

type OpsiJawaban = {
  id_opsi: string
  label: string
  isi_opsi: string
  is_benar: boolean | null
  gambar_url: string | null
}

type BankSoal = {
  id_soal: string
  pertanyaan: string
  tipe_soal: string | null
  tingkat_kesulitan: string | null
  gambar_url: string | null
  audio_url: string | null
  opsi_jawaban: OpsiJawaban[]
}

type TugasSoal = {
  id_tugas_soal: string
  id_tugas: string
  id_soal: string
  nomor: number
  bobot: number | null
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function KelolaSoalTugasPage() {
  const router = useRouter()
  const params = useParams()
  const idTugas = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [tugas, setTugas] = useState<Tugas | null>(null)
  const [bankSoal, setBankSoal] = useState<BankSoal[]>([])
  const [tugasSoal, setTugasSoal] = useState<TugasSoal[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [search, setSearch] = useState("")
  const [bobotDefault, setBobotDefault] = useState("1")

  const loadData = async () => {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push("/")
      return
    }

    const { data: profile } = await supabase
      .from("profil")
      .select("role, uid_guru")
      .eq("user_id", userData.user.id)
      .single()

    if (!profile || profile.role !== "guru" || !profile.uid_guru) {
      router.push("/")
      return
    }

    const uidGuru = Number(profile.uid_guru)

    const { data: tugasData, error: tugasError } = await supabase
      .from("tugas")
      .select(`
        id_tugas,
        judul,
        tipe_tugas,
        id_mkg,
        mapel_kelas_guru:id_mkg (
          id_mapel,
          id_kelas,
          uid_guru,
          mapel:id_mapel (
            nama_mapel
          ),
          kelas:id_kelas (
            tingkat,
            nama_kelas
          )
        )
      `)
      .eq("id_tugas", idTugas)
      .single()

    if (tugasError || !tugasData) {
      alert(tugasError?.message || "Tugas tidak ditemukan")
      router.push("/guru/tugas")
      return
    }

    const tugasFinal = tugasData as unknown as Tugas
    const relasiMengajar = firstItem(tugasFinal.mapel_kelas_guru)

    if (Number(relasiMengajar?.uid_guru) !== uidGuru) {
      alert("Anda tidak memiliki akses ke tugas ini")
      router.push("/guru/tugas")
      return
    }

    if (tugasFinal.tipe_tugas !== "pilihan_ganda") {
      alert("Halaman ini hanya untuk tugas pilihan ganda")
      router.push("/guru/tugas")
      return
    }

    setTugas(tugasFinal)

    const idMapel = relasiMengajar?.id_mapel

    if (!idMapel) {
      alert("Mapel tugas tidak ditemukan")
      setLoading(false)
      return
    }

    const { data: soalData, error: soalError } = await supabase
      .from("bank_soal")
      .select(`
        id_soal,
        pertanyaan,
        tipe_soal,
        tingkat_kesulitan,
        gambar_url,
        audio_url,
        opsi_jawaban (
          id_opsi,
          label,
          isi_opsi,
          is_benar,
          gambar_url
        )
      `)
      .eq("uid_guru", uidGuru)
      .eq("id_mapel", idMapel)
      .eq("tipe_soal", "pg")
      .order("created_at", { ascending: false })

    if (soalError) {
      alert(soalError.message)
      setLoading(false)
      return
    }

    setBankSoal((soalData ?? []) as unknown as BankSoal[])

    const { data: tugasSoalData, error: tugasSoalError } = await supabase
      .from("tugas_soal")
      .select(`
        id_tugas_soal,
        id_tugas,
        id_soal,
        nomor,
        bobot
      `)
      .eq("id_tugas", idTugas)
      .order("nomor", { ascending: true })

    if (tugasSoalError) {
      alert(tugasSoalError.message)
      setLoading(false)
      return
    }

    const relasi = (tugasSoalData ?? []) as TugasSoal[]
    setTugasSoal(relasi)
    setSelectedIds(relasi.map((item) => item.id_soal))

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleSoal = (idSoal: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(idSoal)) {
        return prev.filter((id) => id !== idSoal)
      }

      return [...prev, idSoal]
    })
  }

  const handleSimpan = async () => {
    if (!idTugas) return

    if (selectedIds.length === 0) {
      alert("Pilih minimal satu soal")
      return
    }

    setSaving(true)

    const { error: deleteError } = await supabase
      .from("tugas_soal")
      .delete()
      .eq("id_tugas", idTugas)

    if (deleteError) {
      alert(deleteError.message)
      setSaving(false)
      return
    }

    const dataInsert = selectedIds.map((idSoal, index) => ({
      id_tugas: idTugas,
      id_soal: idSoal,
      nomor: index + 1,
      bobot: Number(bobotDefault) || 1,
    }))

    const { error: insertError } = await supabase
      .from("tugas_soal")
      .insert(dataInsert)

    if (insertError) {
      alert(insertError.message)
      setSaving(false)
      return
    }

    alert("Soal berhasil disimpan ke tugas")
    setSaving(false)
    loadData()
  }

  const handleKosongkan = async () => {
    const yakin = confirm("Yakin ingin menghapus semua soal dari tugas ini?")
    if (!yakin) return

    const { error } = await supabase
      .from("tugas_soal")
      .delete()
      .eq("id_tugas", idTugas)

    if (error) {
      alert(error.message)
      return
    }

    setSelectedIds([])
    loadData()
  }

  const filteredSoal = bankSoal.filter((item) => {
    const keyword = search.toLowerCase()

    return (
      item.pertanyaan.toLowerCase().includes(keyword) ||
      String(item.tingkat_kesulitan ?? "").toLowerCase().includes(keyword)
    )
  })

  const selectedSoal = selectedIds
    .map((id) => bankSoal.find((soal) => soal.id_soal === id))
    .filter(Boolean) as BankSoal[]

  const relasiMengajar = firstItem(tugas?.mapel_kelas_guru)
  const mapel = firstItem(relasiMengajar?.mapel)
  const kelas = firstItem(relasiMengajar?.kelas)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/guru/tugas")}
        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <div>
        <h1 className="text-2xl font-bold">
          Pilih Soal Tugas
        </h1>

        <p className="text-slate-500 dark:text-slate-400">
          {tugas?.judul ?? "-"} • {mapel?.nama_mapel ?? "-"} • Kelas{" "}
          {kelas?.tingkat ?? "-"} {kelas?.nama_kelas ?? "-"}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">
              Bank Soal
            </h2>

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

          <div className="mt-5 space-y-3">
            {filteredSoal.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-slate-500 dark:border-slate-800">
                Belum ada soal pilihan ganda untuk mapel ini.
              </div>
            ) : (
              filteredSoal.map((soal) => {
                const checked = selectedIds.includes(soal.id_soal)

                return (
                  <div
                    key={soal.id_soal}
                    className={`rounded-2xl border p-4 transition dark:border-slate-800 ${
                      checked
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "bg-white dark:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSoal(soal.id_soal)}
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                          checked
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {checked && <CheckCircle2 size={18} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {soal.pertanyaan}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Level: {soal.tingkat_kesulitan ?? "-"} • Opsi:{" "}
                          {soal.opsi_jawaban?.length ?? 0}
                        </p>

                        {soal.gambar_url && (
                          <img
                            src={soal.gambar_url}
                            alt="Gambar soal"
                            className="mt-3 max-h-48 rounded-xl border object-contain"
                          />
                        )}

                        {soal.audio_url && (
                          <audio controls className="mt-3 w-full">
                            <source src={soal.audio_url} />
                          </audio>
                        )}

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {[...(soal.opsi_jawaban ?? [])]
                            .sort((a, b) =>
                              a.label.localeCompare(b.label)
                            )
                            .map((opsi) => (
                              <div
                                key={opsi.id_opsi}
                                className={`rounded-xl border p-3 text-sm dark:border-slate-800 ${
                                  opsi.is_benar
                                    ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                                    : "bg-slate-50 dark:bg-slate-900"
                                }`}
                              >
                                <b>{opsi.label}.</b> {opsi.isi_opsi}

                                {opsi.gambar_url && (
                                  <img
                                    src={opsi.gambar_url}
                                    alt={`Opsi ${opsi.label}`}
                                    className="mt-2 max-h-28 rounded-lg border object-contain"
                                  />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">
            Soal Terpilih
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Total: {selectedIds.length} soal
          </p>

          <div className="mt-4">
            <label className="text-sm font-medium">
              Bobot Default
            </label>

            <input
              type="number"
              value={bobotDefault}
              onChange={(e) => setBobotDefault(e.target.value)}
              min={0}
              step="0.5"
              className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="mt-5 max-h-[460px] space-y-3 overflow-y-auto pr-1">
            {selectedSoal.length === 0 ? (
              <p className="text-sm text-slate-500">
                Belum ada soal yang dipilih.
              </p>
            ) : (
              selectedSoal.map((soal, index) => (
                <div
                  key={soal.id_soal}
                  className="rounded-xl border p-3 text-sm dark:border-slate-800"
                >
                  <p className="font-semibold">
                    {index + 1}. {soal.pertanyaan}
                  </p>

                  <button
                    type="button"
                    onClick={() => toggleSoal(soal.id_soal)}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Hapus dari pilihan
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={handleSimpan}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Menyimpan..." : "Simpan Soal"}
            </button>

            <button
              type="button"
              onClick={handleKosongkan}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-950"
            >
              <Trash2 size={18} />
              Kosongkan Soal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}