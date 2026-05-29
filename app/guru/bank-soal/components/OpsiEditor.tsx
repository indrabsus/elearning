"use client"

import { CheckCircle2, ImagePlus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { OpsiForm } from "../page"

type Props = {
  opsi: OpsiForm[]
  setOpsi: React.Dispatch<React.SetStateAction<OpsiForm[]>>
}

export default function OpsiEditor({ opsi, setOpsi }: Props) {
  const uploadFile = async (file: File, index: number) => {
    const ext = file.name.split(".").pop()
    const fileName = `opsi/${Date.now()}-${Math.random()
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

    setOpsi((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              gambar_url: publicUrl.publicUrl,
            }
          : item
      )
    )
  }

  const ubahOpsi = (
    index: number,
    field: keyof OpsiForm,
    value: string | boolean
  ) => {
    setOpsi((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    )
  }

  const pilihJawabanBenar = (index: number) => {
    setOpsi((prev) =>
      prev.map((item, i) => ({
        ...item,
        is_benar: i === index,
      }))
    )
  }

  const tambahOpsi = () => {
    const nextLabel = String.fromCharCode(65 + opsi.length)

    setOpsi((prev) => [
      ...prev,
      {
        label: nextLabel,
        isi_opsi: "",
        gambar_url: "",
        is_benar: false,
      },
    ])
  }

  const hapusOpsi = (index: number) => {
    if (opsi.length <= 2) {
      alert("Minimal harus ada 2 opsi")
      return
    }

    setOpsi((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({
          ...item,
          label: String.fromCharCode(65 + i),
        }))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">Opsi Jawaban</label>

        <button
          type="button"
          onClick={tambahOpsi}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Tambah Opsi
        </button>
      </div>

      {opsi.map((item, index) => (
        <div
          key={index}
          className="space-y-4 rounded-2xl border bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {item.label}
            </div>

            <button
              type="button"
              onClick={() => hapusOpsi(index)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 size={14} />
              Hapus
            </button>
          </div>

          <input
            type="text"
            value={item.isi_opsi}
            onChange={(e) =>
              ubahOpsi(index, "isi_opsi", e.target.value)
            }
            placeholder={`Isi opsi ${item.label}`}
            className="w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
          />

          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-500">
              Gambar Opsi (Opsional)
            </label>

            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadFile(file, index)
                }}
                className="hidden"
              />

              <div className="flex h-24 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <ImagePlus size={22} />
                <span className="mt-2 text-sm">
                  Upload Gambar Opsi
                </span>
              </div>
            </label>

            {item.gambar_url && (
              <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-950">
                <img
                  src={item.gambar_url}
                  alt={`Opsi ${item.label}`}
                  className="max-h-52 w-full object-contain"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => pilihJawabanBenar(index)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              item.is_benar
                ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            }`}
          >
            <CheckCircle2 size={18} />
            {item.is_benar
              ? "Jawaban Benar"
              : "Jadikan Jawaban Benar"}
          </button>
        </div>
      ))}
    </div>
  )
}