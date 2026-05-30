"use client"

import { Pencil, Trash2, Image, Volume2 } from "lucide-react"
import type { BankSoal, Mapel } from "../page"

type Props = {
  data: BankSoal[]
  page: number
  itemsPerPage: number
  onEdit: (soal: BankSoal) => void
  onDelete: (id: string) => void
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function SoalTable({
  data,
  page,
  itemsPerPage,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left dark:border-slate-800">
            <th className="py-3 pr-4 text-slate-500">No</th>
            <th className="py-3 pr-4 text-slate-500">Pertanyaan</th>
            <th className="py-3 pr-4 text-slate-500">Mapel</th>
            <th className="py-3 pr-4 text-slate-500">Tipe</th>
            <th className="py-3 pr-4 text-slate-500">Level</th>
            <th className="py-3 pr-4 text-slate-500">Media</th>
            <th className="py-3 pr-4 text-slate-500">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-slate-500">
                Data soal belum ada.
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const mapel = firstItem<Mapel>(item.mapel)

              return (
                <tr
                  key={item.id_soal}
                  className="border-b dark:border-slate-800"
                >
                  <td className="py-3 pr-4">
                    {(page - 1) * itemsPerPage + index + 1}
                  </td>

                  <td className="min-w-72 py-3 pr-4">
                    <p className="line-clamp-2 font-medium">
                      {item.pertanyaan}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Opsi: {item.opsi_jawaban?.length ?? 0}
                    </p>
                  </td>

                  <td className="py-3 pr-4">
                    {mapel?.nama_mapel ?? "-"}
                  </td>

                  <td className="py-3 pr-4 uppercase">
                    {item.tipe_soal ?? "-"}
                  </td>

                  <td className="py-3 pr-4 capitalize">
                    {item.tingkat_kesulitan ?? "-"}
                  </td>

                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      {item.gambar_url && (
                        <a
                          href={item.gambar_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          title="Lihat gambar"
                        >
                          <Image size={16} />
                        </a>
                      )}

                      {item.audio_url && (
                        <a
                          href={item.audio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-purple-100 p-2 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          title="Dengar audio"
                        >
                          <Volume2 size={16} />
                        </a>
                      )}

                      {!item.gambar_url && !item.audio_url && (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="rounded-lg bg-yellow-100 p-2 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(item.id_soal)}
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
  )
}