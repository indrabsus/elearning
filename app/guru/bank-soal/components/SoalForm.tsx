"use client"

import { useEffect, useState } from "react"
import { ImagePlus, Music, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import OpsiEditor from "./OpsiEditor"
import type { BankSoal, Mapel, OpsiForm } from "../page"

type Props = {
  uidGuru: number | null
  mapelList: Mapel[]
  editSoal: BankSoal | null
  onSuccess: () => void
  onCancelEdit: () => void
}

const defaultOpsi = (): OpsiForm[] => [
  { label: "A", isi_opsi: "", gambar_url: "", is_benar: false },
  { label: "B", isi_opsi: "", gambar_url: "", is_benar: false },
  { label: "C", isi_opsi: "", gambar_url: "", is_benar: false },
  { label: "D", isi_opsi: "", gambar_url: "", is_benar: false },
  { label: "E", isi_opsi: "", gambar_url: "", is_benar: false },
]

export default function SoalForm({
  uidGuru,
  mapelList,
  editSoal,
  onSuccess,
  onCancelEdit,
}: Props) {
  const [saving, setSaving] = useState(false)

  const [idMapel, setIdMapel] = useState("")
  const [pertanyaan, setPertanyaan] = useState("")
  const [tipeSoal, setTipeSoal] = useState("pg")
  const [tingkatKesulitan, setTingkatKesulitan] = useState("mudah")
  const [pembahasan, setPembahasan] = useState("")
  const [gambarUrl, setGambarUrl] = useState("")
  const [audioUrl, setAudioUrl] = useState("")
  const [opsi, setOpsi] = useState<OpsiForm[]>(defaultOpsi())

  useEffect(() => {
    if (!editSoal) {
      resetForm()
      return
    }

    setIdMapel(editSoal.id_mapel ?? "")
    setPertanyaan(editSoal.pertanyaan)
    setTipeSoal(editSoal.tipe_soal ?? "pg")
    setTingkatKesulitan(editSoal.tingkat_kesulitan ?? "mudah")
    setPembahasan(editSoal.pembahasan ?? "")
    setGambarUrl(editSoal.gambar_url ?? "")
    setAudioUrl(editSoal.audio_url ?? "")

    if (editSoal.opsi_jawaban?.length > 0) {
      const opsiLama = [...editSoal.opsi_jawaban]
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((item) => ({
          id_opsi: item.id_opsi,
          label: item.label,
          isi_opsi: item.isi_opsi,
          gambar_url: item.gambar_url ?? "",
          is_benar: item.is_benar,
        }))

      setOpsi(opsiLama)
    } else {
      setOpsi(defaultOpsi())
    }
  }, [editSoal])

  const resetForm = () => {
    setIdMapel("")
    setPertanyaan("")
    setTipeSoal("pg")
    setTingkatKesulitan("mudah")
    setPembahasan("")
    setGambarUrl("")
    setAudioUrl("")
    setOpsi(defaultOpsi())
  }

  const uploadFile = async (file: File, folder: "soal" | "audio") => {
    const ext = file.name.split(".").pop()
    const fileName = `${folder}/${Date.now()}-${Math.random()
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

    if (folder === "soal") setGambarUrl(publicUrl.publicUrl)
    if (folder === "audio") setAudioUrl(publicUrl.publicUrl)
  }

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    if (!uidGuru) {
      alert("UID guru tidak ditemukan")
      return
    }

    if (!idMapel || !pertanyaan || !tipeSoal) {
      alert("Mapel, pertanyaan, dan tipe soal wajib diisi")
      return
    }

    if (tipeSoal === "pg") {
      const opsiValid = opsi.filter(
        (item) => item.isi_opsi.trim() || item.gambar_url
      )

      if (opsiValid.length < 2) {
        alert("Pilihan ganda minimal memiliki 2 opsi")
        return
      }

      if (!opsiValid.some((item) => item.is_benar)) {
        alert("Pilih satu jawaban benar")
        return
      }
    }

    setSaving(true)

    let idSoal = editSoal?.id_soal

    if (editSoal) {
      const { error } = await supabase
        .from("bank_soal")
        .update({
          id_mapel: idMapel,
          pertanyaan,
          tipe_soal: tipeSoal,
          tingkat_kesulitan: tingkatKesulitan,
          pembahasan,
          gambar_url: gambarUrl || null,
          audio_url: audioUrl || null,
        })
        .eq("id_soal", editSoal.id_soal)

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }

      await supabase
        .from("opsi_jawaban")
        .delete()
        .eq("id_soal", editSoal.id_soal)
    } else {
      const { data, error } = await supabase
        .from("bank_soal")
        .insert({
          id_mapel: idMapel,
          uid_guru: uidGuru,
          pertanyaan,
          tipe_soal: tipeSoal,
          tingkat_kesulitan: tingkatKesulitan,
          pembahasan,
          gambar_url: gambarUrl || null,
          audio_url: audioUrl || null,
        })
        .select("id_soal")
        .single()

      if (error || !data) {
        alert(error?.message || "Gagal menyimpan soal")
        setSaving(false)
        return
      }

      idSoal = data.id_soal
    }

    if (tipeSoal === "pg" && idSoal) {
      const opsiInsert = opsi
        .filter((item) => item.isi_opsi.trim() || item.gambar_url)
        .map((item) => ({
          id_soal: idSoal,
          label: item.label,
          isi_opsi: item.isi_opsi || "-",
          gambar_url: item.gambar_url || null,
          is_benar: item.is_benar,
        }))

      const { error } = await supabase
        .from("opsi_jawaban")
        .insert(opsiInsert)

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }
    }

    alert(editSoal ? "Soal berhasil diupdate" : "Soal berhasil disimpan")
    setSaving(false)
    resetForm()
    onSuccess()
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">
        {editSoal ? "Edit Soal" : "Tambah Soal"}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-6">
        <div
          className={`grid gap-6 ${
            tipeSoal === "pg" ? "xl:grid-cols-2" : "grid-cols-1"
          }`}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Mapel</label>
              <select
                value={idMapel}
                onChange={(e) => setIdMapel(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
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
              <label className="text-sm font-medium">Tipe Soal</label>
              <select
                value={tipeSoal}
                onChange={(e) => setTipeSoal(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="pg">Pilihan Ganda</option>
                <option value="essay">Essay</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Tingkat Kesulitan</label>
              <select
                value={tingkatKesulitan}
                onChange={(e) => setTingkatKesulitan(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Pertanyaan</label>
              <textarea
                value={pertanyaan}
                onChange={(e) => setPertanyaan(e.target.value)}
                rows={5}
                placeholder="Tulis pertanyaan..."
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Gambar Soal Opsional
              </label>

              <label className="mt-2 block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadFile(file, "soal")
                  }}
                  className="hidden"
                />

                <div className="flex h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <ImagePlus size={24} />
                  <span className="mt-2 text-sm font-medium">
                    Upload Gambar Soal
                  </span>
                </div>
              </label>

              {gambarUrl && (
                <div className="mt-3 overflow-hidden rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-950">
                  <img
                    src={gambarUrl}
                    alt="Gambar soal"
                    className="max-h-64 w-full object-contain"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">
                Audio Soal Opsional
              </label>

              <label className="mt-2 block cursor-pointer">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadFile(file, "audio")
                  }}
                  className="hidden"
                />

                <div className="flex h-24 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition hover:border-purple-500 hover:bg-purple-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <Music size={24} />
                  <span className="mt-2 text-sm font-medium">
                    Upload Audio Soal
                  </span>
                </div>
              </label>

              {audioUrl && (
                <audio controls className="mt-3 w-full">
                  <source src={audioUrl} />
                </audio>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Pembahasan</label>
              <textarea
                value={pembahasan}
                onChange={(e) => setPembahasan(e.target.value)}
                rows={4}
                placeholder="Tulis pembahasan..."
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          {tipeSoal === "pg" && (
            <div className="space-y-4">
              <OpsiEditor opsi={opsi} setOpsi={setOpsi} />
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t pt-5 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={18} />
            {saving ? "Menyimpan..." : editSoal ? "Update Soal" : "Simpan Soal"}
          </button>

          {editSoal && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-xl border px-4 py-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Batal
            </button>
          )}
        </div>
      </form>
    </div>
  )
}