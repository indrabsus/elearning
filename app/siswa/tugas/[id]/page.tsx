"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileUp, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Mapel = {
  nama_mapel: string | null
}

type Kelas = {
  tingkat: number | null
  nama_kelas: string | null
}

type MapelKelasGuru = {
  mapel: Mapel | Mapel[] | null
  kelas: Kelas | Kelas[] | null
}

type Tugas = {
  id_tugas: string
  id_mapel_kelas_guru: string
  judul: string
  deskripsi: string | null
  deadline: string | null
  status: string | null
  tipe_tugas: string | null
  mapel_kelas_guru: MapelKelasGuru | MapelKelasGuru[] | null
}

type TugasSiswa = {
  id_tugas_siswa: string
  id_tugas: string
  nisn: string
  status: string | null
  mulai_at: string | null
  selesai_at: string | null
  nilai: number | null
  jawaban: string | null
  file_url: string | null
}

type Opsi = {
  id_opsi: string
  id_soal: string | null
  label: string
  isi_opsi: string
  is_benar: boolean | null
  gambar_url: string | null
}

type BankSoalRelasi = {
  id_soal: string
  pertanyaan: string
  gambar_url: string | null
  audio_url: string | null
  pembahasan: string | null
  opsi_jawaban: Opsi[]
}

type SoalPG = {
  id_tugas_soal: string
  nomor: number
  bobot: number | null
  bank_soal: BankSoalRelasi | BankSoalRelasi[] | null
}

type JawabanLama = {
  id_soal: string | null
  id_opsi: string | null
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function KerjakanTugasPage() {
  const router = useRouter()
  const params = useParams()
  const idTugas = params.id as string
  const hasLoaded = useRef(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [tugas, setTugas] = useState<Tugas | null>(null)
  const [tugasSiswa, setTugasSiswa] = useState<TugasSiswa | null>(null)

  const [jawabanEssay, setJawabanEssay] = useState("")
  const [fileUrl, setFileUrl] = useState("")

  const [soalPG, setSoalPG] = useState<SoalPG[]>([])
  const [jawabanPG, setJawabanPG] = useState<Record<string, string>>({})

  const loadData = async () => {
    setLoading(true)

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
        mapel_kelas_guru:id_mapel_kelas_guru (
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
      alert("Tugas tidak ditemukan")
      router.push("/siswa/tugas")
      return
    }

    const tugasFinal = tugasData as unknown as Tugas
    setTugas(tugasFinal)

    const { data: existing } = await supabase
      .from("tugas_siswa")
      .select(`
        id_tugas_siswa,
        id_tugas,
        nisn,
        status,
        mulai_at,
        selesai_at,
        nilai,
        jawaban,
        file_url
      `)
      .eq("id_tugas", idTugas)
      .eq("nisn", profile.nisn)
      .maybeSingle()

    let dataTugasSiswa: TugasSiswa | null = null

    if (existing) {
      dataTugasSiswa = existing as TugasSiswa
      setTugasSiswa(dataTugasSiswa)
      setJawabanEssay(dataTugasSiswa.jawaban ?? "")
      setFileUrl(dataTugasSiswa.file_url ?? "")
    } else {
      const { data: baru, error: insertError } = await supabase
        .from("tugas_siswa")
        .upsert(
          {
            id_tugas: idTugas,
            nisn: profile.nisn,
            status: "dikerjakan",
            mulai_at: new Date().toISOString(),
          },
          {
            onConflict: "id_tugas,nisn",
          }
        )
        .select(`
          id_tugas_siswa,
          id_tugas,
          nisn,
          status,
          mulai_at,
          selesai_at,
          nilai,
          jawaban,
          file_url
        `)
        .single()

      if (insertError || !baru) {
        alert(insertError?.message || "Gagal membuat data tugas siswa")
        setLoading(false)
        return
      }

      dataTugasSiswa = baru as TugasSiswa
      setTugasSiswa(dataTugasSiswa)
    }

    if (tugasFinal.tipe_tugas === "pilihan_ganda") {
      if (dataTugasSiswa) {
        const { data: jawabanLama, error: jawabanError } = await supabase
          .from("jawaban_tugas_siswa")
          .select("id_soal, id_opsi")
          .eq("id_tugas_siswa", dataTugasSiswa.id_tugas_siswa)

        if (jawabanError) {
          alert(jawabanError.message)
          setLoading(false)
          return
        }

        const selected: Record<string, string> = {}

        ;((jawabanLama ?? []) as JawabanLama[]).forEach((item) => {
          if (item.id_soal && item.id_opsi) {
            selected[item.id_soal] = item.id_opsi
          }
        })

        setJawabanPG(selected)
      }

      const { data: soalData, error: soalError } = await supabase
        .from("tugas_soal")
        .select(`
          id_tugas_soal,
          nomor,
          bobot,
          bank_soal:id_soal (
            id_soal,
            pertanyaan,
            gambar_url,
            audio_url,
            pembahasan,
            opsi_jawaban (
              id_opsi,
              id_soal,
              label,
              isi_opsi,
              is_benar,
              gambar_url
            )
          )
        `)
        .eq("id_tugas", idTugas)
        .order("nomor", { ascending: true })

      if (soalError) {
        alert(soalError.message)
        setLoading(false)
        return
      }

      setSoalPG((soalData ?? []) as unknown as SoalPG[])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    loadData()
  }, [])

  const uploadFile = async (file: File) => {
    const ext = file.name.split(".").pop()
    const fileName = `tugas-siswa/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from("elearning")
      .upload(fileName, file)

    if (error) {
      alert(error.message)
      return
    }

    const { data: publicUrl } = supabase.storage
      .from("elearning")
      .getPublicUrl(data.path)

    setFileUrl(publicUrl.publicUrl)
  }

  const submitEssay = async () => {
    if (!tugasSiswa) return

    if (!jawabanEssay.trim()) {
      alert("Jawaban tidak boleh kosong")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("tugas_siswa")
      .update({
        jawaban: jawabanEssay,
        status: "selesai",
        selesai_at: new Date().toISOString(),
      })
      .eq("id_tugas_siswa", tugasSiswa.id_tugas_siswa)

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    alert("Jawaban berhasil dikumpulkan")
    setSaving(false)
    router.push("/siswa/tugas")
  }

  const submitUpload = async () => {
    if (!tugasSiswa) return

    if (!fileUrl) {
      alert("Silakan upload file terlebih dahulu")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("tugas_siswa")
      .update({
        file_url: fileUrl,
        status: "selesai",
        selesai_at: new Date().toISOString(),
      })
      .eq("id_tugas_siswa", tugasSiswa.id_tugas_siswa)

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    alert("File tugas berhasil dikumpulkan")
    setSaving(false)
    router.push("/siswa/tugas")
  }

  const submitPilihanGanda = async () => {
    if (!tugasSiswa) return

    if (soalPG.length === 0) {
      alert("Soal belum tersedia")
      return
    }

    if (Object.keys(jawabanPG).length < soalPG.length) {
      alert("Semua soal wajib dijawab")
      return
    }

    setSaving(true)

    const { error: deleteError } = await supabase
      .from("jawaban_tugas_siswa")
      .delete()
      .eq("id_tugas_siswa", tugasSiswa.id_tugas_siswa)

    if (deleteError) {
      alert(deleteError.message)
      setSaving(false)
      return
    }

    const jawabanInsert = soalPG
      .map((item) => {
        const soal = firstItem(item.bank_soal)
        if (!soal) return null

        const idOpsiDipilih = jawabanPG[soal.id_soal]
        const opsiDipilih = soal.opsi_jawaban.find(
          (opsi) => opsi.id_opsi === idOpsiDipilih
        )

        const benar = opsiDipilih?.is_benar === true
        const bobot = Number(item.bobot ?? 1)

        return {
          id_tugas_siswa: tugasSiswa.id_tugas_siswa,
          id_soal: soal.id_soal,
          id_opsi: idOpsiDipilih,
          is_benar: benar,
          nilai: benar ? bobot : 0,
        }
      })
      .filter(Boolean) as {
      id_tugas_siswa: string
      id_soal: string
      id_opsi: string
      is_benar: boolean
      nilai: number
    }[]

    const totalNilaiBenar = jawabanInsert.reduce(
      (total, item) => total + Number(item.nilai ?? 0),
      0
    )

    const totalBobot = soalPG.reduce(
      (total, item) => total + Number(item.bobot ?? 1),
      0
    )

    const nilaiAkhir =
      totalBobot > 0
        ? Math.round((totalNilaiBenar / totalBobot) * 100)
        : 0

    const { error: insertError } = await supabase
      .from("jawaban_tugas_siswa")
      .insert(jawabanInsert)

    if (insertError) {
      alert(insertError.message)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from("tugas_siswa")
      .update({
        status: "selesai",
        selesai_at: new Date().toISOString(),
        nilai: nilaiAkhir,
      })
      .eq("id_tugas_siswa", tugasSiswa.id_tugas_siswa)

    if (updateError) {
      alert(updateError.message)
      setSaving(false)
      return
    }

    alert(`Tugas berhasil dikumpulkan. Nilai Anda: ${nilaiAkhir}`)
    setSaving(false)
    router.push("/siswa/tugas")
  }

  const pilihOpsi = (idSoal: string, idOpsi: string) => {
    setJawabanPG((prev) => ({
      ...prev,
      [idSoal]: idOpsi,
    }))
  }

  const formatTanggal = (value: string | null) => {
    if (!value) return "-"

    return new Date(value).toLocaleString("id-ID", {
      day: "numeric",
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

  const sudahSelesai =
    tugasSiswa?.status === "selesai" || tugasSiswa?.status === "dinilai"

  const relasiMengajar = firstItem(tugas?.mapel_kelas_guru)
  const mapel = firstItem(relasiMengajar?.mapel)

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/siswa/tugas")}
        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-blue-600 dark:text-blue-400">
          {mapel?.nama_mapel ?? "-"}
        </p>

        <h1 className="mt-2 text-2xl font-bold">{tugas?.judul}</h1>

        <p className="mt-3 text-slate-500 dark:text-slate-400">
          {tugas?.deskripsi || "Tidak ada deskripsi."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            Tipe: {tugas?.tipe_tugas}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            Deadline: {formatTanggal(tugas?.deadline ?? null)}
          </span>

          {sudahSelesai && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 dark:bg-green-950 dark:text-green-300">
              Sudah dikumpulkan
            </span>
          )}

          {tugasSiswa?.nilai !== null && tugasSiswa?.nilai !== undefined && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Nilai: {tugasSiswa.nilai}
            </span>
          )}
        </div>
      </div>

      {tugas?.tipe_tugas === "essay" && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Jawaban Essay</h2>

          <textarea
            value={jawabanEssay}
            onChange={(e) => setJawabanEssay(e.target.value)}
            disabled={sudahSelesai}
            rows={10}
            placeholder="Tulis jawaban Anda..."
            className="mt-4 w-full rounded-xl border bg-white p-4 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950"
          />

          {!sudahSelesai && (
            <button
              type="button"
              onClick={submitEssay}
              disabled={saving}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Mengirim..." : "Kumpulkan Jawaban"}
            </button>
          )}
        </div>
      )}

      {tugas?.tipe_tugas === "upload_file" && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Upload File Tugas</h2>

          {!sudahSelesai && (
            <label className="mt-4 block cursor-pointer">
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadFile(file)
                }}
                className="hidden"
              />

              <div className="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <FileUp size={28} />
                <span className="mt-2 text-sm font-medium">
                  Klik untuk upload file
                </span>
              </div>
            </label>
          )}

          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-xl border p-4 text-sm text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Lihat file yang diupload
            </a>
          )}

          {!sudahSelesai && (
            <button
              type="button"
              onClick={submitUpload}
              disabled={saving}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Mengirim..." : "Kumpulkan File"}
            </button>
          )}
        </div>
      )}

      {tugas?.tipe_tugas === "pilihan_ganda" && (
        <div className="space-y-5">
          {soalPG.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              Soal pilihan ganda belum tersedia.
            </div>
          ) : (
            soalPG.map((item) => {
              const soal = firstItem(item.bank_soal)
              if (!soal) return null

              const opsiList = [...(soal.opsi_jawaban ?? [])].sort((a, b) =>
                a.label.localeCompare(b.label)
              )

              return (
                <div
                  key={item.id_tugas_soal}
                  className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-sm text-slate-500">
                    Soal Nomor {item.nomor}
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    {soal.pertanyaan}
                  </h2>

                  {soal.gambar_url && (
                    <img
                      src={soal.gambar_url}
                      alt="Gambar soal"
                      className="mt-4 max-h-80 rounded-xl border object-contain"
                    />
                  )}

                  {soal.audio_url && (
                    <audio controls className="mt-4 w-full">
                      <source src={soal.audio_url} />
                    </audio>
                  )}

                  <div className="mt-5 space-y-3">
                    {opsiList.map((opsi) => {
                      const selected =
                        jawabanPG[soal.id_soal] === opsi.id_opsi
                      const benar = opsi.is_benar === true
                      const salahDipilih = sudahSelesai && selected && !benar

                      const warnaOpsi = sudahSelesai
                        ? benar
                          ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : salahDipilih
                          ? "border-red-600 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        : selected
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"

                      return (
                        <button
                          key={opsi.id_opsi}
                          type="button"
                          disabled={sudahSelesai}
                          onClick={() => pilihOpsi(soal.id_soal, opsi.id_opsi)}
                          className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition dark:border-slate-700 ${warnaOpsi}`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                              sudahSelesai && benar
                                ? "border-green-600 bg-green-600 text-white"
                                : sudahSelesai && salahDipilih
                                ? "border-red-600 bg-red-600 text-white"
                                : selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {sudahSelesai && benar
                              ? "✓"
                              : sudahSelesai && salahDipilih
                              ? "✕"
                              : selected
                              ? "✓"
                              : opsi.label}
                          </span>

                          <span className="flex-1">
                            <span>{opsi.isi_opsi}</span>

                            {opsi.gambar_url && (
                              <img
                                src={opsi.gambar_url}
                                alt={`Opsi ${opsi.label}`}
                                className="mt-3 max-h-40 rounded-lg border object-contain"
                              />
                            )}

                            {sudahSelesai && benar && (
                              <p className="mt-2 text-xs font-semibold text-green-600 dark:text-green-300">
                                Jawaban benar
                              </p>
                            )}

                            {sudahSelesai && salahDipilih && (
                              <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">
                                Jawaban kamu
                              </p>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}

          {!sudahSelesai && soalPG.length > 0 && (
            <button
              type="button"
              onClick={submitPilihanGanda}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Mengirim..." : "Kumpulkan Jawaban"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}