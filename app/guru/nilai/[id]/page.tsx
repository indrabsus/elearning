"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, ExternalLink, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

type DetailJawaban = {
  id_tugas_siswa: string
  id_tugas: string
  nisn: string
  status: string | null
  nilai: number | null
  selesai_at: string | null
  jawaban: string | null
  file_url: string | null
  catatan_guru: string | null
  siswa: {
    nama_lengkap: string | null
  } | null
  tugas: {
    judul: string
    deskripsi: string | null
    tipe_tugas: string | null
    mapel_kelas_guru: {
      uid_guru: number | null
      mapel: {
        nama_mapel: string | null
      } | null
      kelas: {
        tingkat: number | null
        nama_kelas: string | null
      } | null
    } | null
  } | null
}

type JawabanPG = {
  id_jawaban: string
  id_soal: string
  id_opsi: string | null
  is_benar: boolean | null
  nilai: number | null
  bank_soal: {
    pertanyaan: string
    gambar_url: string | null
    audio_url: string | null
  } | null
  opsi_jawaban: {
    label: string
    isi_opsi: string
    gambar_url: string | null
  } | null
}

export default function DetailNilaiGuruPage() {
  const router = useRouter()
  const params = useParams()
  const idTugasSiswa = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<DetailJawaban | null>(null)
  const [jawabanPG, setJawabanPG] = useState<JawabanPG[]>([])

  const [nilai, setNilai] = useState("")
  const [catatanGuru, setCatatanGuru] = useState("")

  useEffect(() => {
    const loadData = async () => {
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

      const { data, error } = await supabase
        .from("tugas_siswa")
        .select(`
          id_tugas_siswa,
          id_tugas,
          nisn,
          status,
          nilai,
          selesai_at,
          jawaban,
          file_url,
          catatan_guru,
          siswa:nisn (
            nama_lengkap
          ),
          tugas:id_tugas (
            judul,
            deskripsi,
            tipe_tugas,
            mapel_kelas_guru:id_mapel_kelas_guru (
              uid_guru,
              mapel:id_mapel (
                nama_mapel
              ),
              kelas:id_kelas (
                tingkat,
                nama_kelas
              )
            )
          )
        `)
        .eq("id_tugas_siswa", idTugasSiswa)
        .single()

      if (error || !data) {
        alert(error?.message || "Data jawaban tidak ditemukan")
        router.push("/guru/nilai")
        return
      }

      const hasil = data as DetailJawaban

      if (hasil.tugas?.mapel_kelas_guru?.uid_guru !== profile.uid_guru) {
        alert("Anda tidak memiliki akses ke data ini")
        router.push("/guru/nilai")
        return
      }

      setDetail(hasil)
      setNilai(hasil.nilai !== null && hasil.nilai !== undefined ? String(hasil.nilai) : "")
      setCatatanGuru(hasil.catatan_guru ?? "")

      if (hasil.tugas?.tipe_tugas === "pilihan_ganda") {
        const { data: pgData, error: pgError } = await supabase
          .from("jawaban_tugas_siswa")
          .select(`
            id_jawaban,
            id_soal,
            id_opsi,
            is_benar,
            nilai,
            bank_soal:id_soal (
              pertanyaan,
              gambar_url,
              audio_url
            ),
            opsi_jawaban:id_opsi (
              label,
              isi_opsi,
              gambar_url
            )
          `)
          .eq("id_tugas_siswa", idTugasSiswa)

        if (pgError) {
          alert(pgError.message)
          setLoading(false)
          return
        }

        setJawabanPG((pgData ?? []) as JawabanPG[])
      }

      setLoading(false)
    }

    loadData()
  }, [idTugasSiswa, router])

  const simpanNilai = async () => {
    if (!detail) return

    if (nilai === "") {
      alert("Nilai wajib diisi")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("tugas_siswa")
      .update({
        nilai: Number(nilai),
        catatan_guru: catatanGuru || null,
        status: "dinilai",
      })
      .eq("id_tugas_siswa", detail.id_tugas_siswa)

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    alert("Nilai berhasil disimpan")
    setSaving(false)
    router.push("/guru/nilai")
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

  const tipeTugas = detail?.tugas?.tipe_tugas

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/guru/nilai")}
        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-blue-600 dark:text-blue-400">
          {detail?.tugas?.mapel_kelas_guru?.mapel?.nama_mapel ?? "-"} • Kelas{" "}
          {detail?.tugas?.mapel_kelas_guru?.kelas?.tingkat}{" "}
          {detail?.tugas?.mapel_kelas_guru?.kelas?.nama_kelas}
        </p>

        <h1 className="mt-2 text-2xl font-bold">
          {detail?.tugas?.judul}
        </h1>

        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {detail?.tugas?.deskripsi || "Tidak ada deskripsi."}
        </p>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <Info label="Siswa" value={detail?.siswa?.nama_lengkap ?? "-"} />
          <Info label="NISN" value={detail?.nisn ?? "-"} />
          <Info label="Dikumpulkan" value={formatTanggal(detail?.selesai_at ?? null)} />
        </div>
      </div>

      {tipeTugas === "essay" && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Jawaban Essay</h2>

          <div className="mt-4 whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-950">
            {detail?.jawaban || "Siswa belum mengisi jawaban."}
          </div>
        </div>
      )}

      {tipeTugas === "upload_file" && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">File Jawaban</h2>

          {detail?.file_url ? (
            <a
              href={detail.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <ExternalLink size={18} />
              Buka File Jawaban
            </a>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Siswa belum upload file.
            </p>
          )}
        </div>
      )}

      {tipeTugas === "pilihan_ganda" && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Jawaban Pilihan Ganda</h2>

          <div className="mt-4 space-y-4">
            {jawabanPG.length === 0 ? (
              <p className="text-sm text-slate-500">
                Belum ada jawaban pilihan ganda.
              </p>
            ) : (
              jawabanPG.map((item, index) => (
                <div
                  key={item.id_jawaban}
                  className="rounded-xl border p-4 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        Soal {index + 1}
                      </p>

                      <p className="mt-1 font-semibold">
                        {item.bank_soal?.pertanyaan ?? "-"}
                      </p>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        item.is_benar
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {item.is_benar ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}
                      {item.is_benar ? "Benar" : "Salah"}
                    </div>
                  </div>

                  {item.bank_soal?.gambar_url && (
                    <img
                      src={item.bank_soal.gambar_url}
                      alt="Gambar soal"
                      className="mt-3 max-h-60 rounded-xl border object-contain"
                    />
                  )}

                  {item.bank_soal?.audio_url && (
                    <audio controls className="mt-3 w-full">
                      <source src={item.bank_soal.audio_url} />
                    </audio>
                  )}

                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                    <p>
                      <b>Jawaban siswa:</b>{" "}
                      {item.opsi_jawaban
                        ? `${item.opsi_jawaban.label}. ${item.opsi_jawaban.isi_opsi}`
                        : "Opsi sudah berubah/dihapus"}
                    </p>
                    <p className="mt-1">
                      <b>Nilai soal:</b> {item.nilai ?? 0}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Penilaian Guru</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nilai</label>
            <input
              type="number"
              value={nilai}
              onChange={(e) => setNilai(e.target.value)}
              min={0}
              max={100}
              className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <input
              value={detail?.status ?? "-"}
              disabled
              className="mt-2 w-full rounded-xl border bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Catatan Guru</label>
          <textarea
            value={catatanGuru}
            onChange={(e) => setCatatanGuru(e.target.value)}
            rows={4}
            placeholder="Tulis catatan atau feedback untuk siswa..."
            className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>

        <button
          type="button"
          onClick={simpanNilai}
          disabled={saving}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? "Menyimpan..." : "Simpan Nilai"}
        </button>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}