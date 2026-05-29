"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Guru = {
  uid: string
  no_hp: string
  nama_lengkap: string
}

type Kelas = {
  id_kelas: string
  tingkat: number | null
  nama_kelas: string | null
}

type Mapel = {
  id_mapel: string
  nama_mapel: string | null
}

type PilihanMengajar = {
  id_mapel: string
  id_kelas: string
}

export default function VerifikasiGuruPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const modeParam = searchParams.get("mode")

  const [mode, setMode] = useState<"verifikasi" | "mengajar">("verifikasi")

  const [uid, setUid] = useState("")
  const [noHp, setNoHp] = useState("")
  const [guru, setGuru] = useState<Guru | null>(null)

  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [mapelList, setMapelList] = useState<Mapel[]>([])

  const [idTahunAjaran, setIdTahunAjaran] = useState("")
  const [namaTahunAjaran, setNamaTahunAjaran] = useState("")

  const [pilihanMengajar, setPilihanMengajar] =
    useState<PilihanMengajar[]>([
      {
        id_mapel: "",
        id_kelas: "",
      },
    ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const initPage = async () => {
      const tahunId = localStorage.getItem("id_tahun_ajaran") || ""
      const tahunNama = localStorage.getItem("nama_tahun_ajaran") || ""

      setIdTahunAjaran(tahunId)
      setNamaTahunAjaran(tahunNama)

      if (!tahunId) {
        setError("Tahun ajaran belum dipilih. Silakan login ulang.")
        return
      }

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

      if (profile.uid_guru) {
        const { data: guruData } = await supabase
          .from("guru")
          .select("uid, no_hp, nama_lengkap")
          .eq("uid", profile.uid_guru)
          .single()

        if (guruData) {
          setGuru(guruData)
          setUid(guruData.uid)
          setNoHp(guruData.no_hp)
          setMode("mengajar")
        }
      } else {
        setMode("verifikasi")
      }

      if (modeParam === "mengajar") {
        setMode("mengajar")
      }

      const [kelasRes, mapelRes] = await Promise.all([
        supabase
          .from("kelas")
          .select("id_kelas, tingkat, nama_kelas")
          .order("tingkat", { ascending: true })
          .order("nama_kelas", { ascending: true }),

        supabase
          .from("mapel")
          .select("id_mapel, nama_mapel")
          .order("nama_mapel", { ascending: true }),
      ])

      setKelasList(kelasRes.data ?? [])
      setMapelList(mapelRes.data ?? [])
    }

    initPage()
  }, [router, modeParam])

  const cekGuru = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    setError("")
    setGuru(null)

    if (!uid || !noHp) {
      setError("UID dan nomor HP wajib diisi")
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from("guru")
      .select("uid, no_hp, nama_lengkap")
      .eq("uid", uid)
      .eq("no_hp", noHp)
      .single()

    if (error || !data) {
      setError("Data guru tidak ditemukan atau nomor HP tidak sesuai")
      setLoading(false)
      return
    }

    setGuru(data)
    setMode("mengajar")
    setLoading(false)
  }

  const tambahPilihanMengajar = () => {
    setPilihanMengajar((prev) => [
      ...prev,
      {
        id_mapel: "",
        id_kelas: "",
      },
    ])
  }

  const hapusPilihanMengajar = (index: number) => {
    setPilihanMengajar((prev) => prev.filter((_, i) => i !== index))
  }

  const ubahPilihanMengajar = (
    index: number,
    field: keyof PilihanMengajar,
    value: string
  ) => {
    setPilihanMengajar((prev) =>
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

  const simpanVerifikasiGuru = async () => {
    if (!guru) {
      setError("Data guru belum diverifikasi")
      return
    }

    if (!idTahunAjaran) {
      setError("Tahun ajaran belum dipilih. Silakan login ulang.")
      return
    }

    setError("")
    setLoading(true)

    const pilihanValid = pilihanMengajar.filter(
      (item) => item.id_mapel && item.id_kelas
    )

    if (pilihanValid.length === 0) {
      setError("Minimal pilih satu mapel dan kelas")
      setLoading(false)
      return
    }

    const kombinasiForm = pilihanValid.map(
      (item) => `${item.id_mapel}-${item.id_kelas}`
    )

    const adaDuplikatDiForm =
      new Set(kombinasiForm).size !== kombinasiForm.length

    if (adaDuplikatDiForm) {
      setError("Ada pilihan mapel dan kelas yang duplikat")
      setLoading(false)
      return
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser()

    if (userError || !userData.user) {
      setError("Session tidak ditemukan. Silakan login ulang.")
      setLoading(false)
      router.push("/")
      return
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("uid_guru", guru.uid)
      .neq("id", userData.user.id)
      .maybeSingle()

    if (existingProfile) {
      setError("UID guru sudah digunakan akun lain")
      setLoading(false)
      return
    }

    const dataInsert = pilihanValid.map((item) => ({
      uid_guru: guru.uid,
      id_mapel: item.id_mapel,
      id_kelas: item.id_kelas,
      id_tahun_ajaran: idTahunAjaran,
    }))

    for (const item of dataInsert) {
      const { data: existingMengajar } = await supabase
        .from("mapel_kelas_guru")
        .select("id_mapel_kelas_guru")
        .eq("uid_guru", item.uid_guru)
        .eq("id_mapel", item.id_mapel)
        .eq("id_kelas", item.id_kelas)
        .eq("id_tahun_ajaran", item.id_tahun_ajaran)
        .maybeSingle()

      if (existingMengajar) {
        setError("Pembagian mengajar tersebut sudah ada di tahun ajaran ini")
        setLoading(false)
        return
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        uid_guru: guru.uid,
      })
      .eq("id", userData.user.id)

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    const { error: mengajarError } = await supabase
      .from("mapel_kelas_guru")
      .insert(dataInsert)

    if (mengajarError) {
      setError(mengajarError.message)
      setLoading(false)
      return
    }

    router.push("/guru/dashboard")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Verifikasi Data Guru
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="mb-4 rounded-xl border bg-slate-50 p-3 text-sm dark:bg-slate-900">
            <b>Tahun Ajaran:</b>{" "}
            {namaTahunAjaran || "Belum dipilih"}
          </div>

          {mode === "verifikasi" && (
            <form onSubmit={cekGuru} className="space-y-4">
              <div className="space-y-2">
                <Label>UID Guru</Label>
                <Input
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="Masukkan UID guru"
                />
              </div>

              <div className="space-y-2">
                <Label>Nomor HP</Label>
                <Input
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="Contoh: 081395671763"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Mengecek..." : "Cek Data Guru"}
              </Button>
            </form>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-500">
              {error}
            </p>
          )}

          {mode === "mengajar" && guru && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
                <h3 className="mb-2 text-lg font-semibold">
                  Data Guru
                </h3>

                <p className="text-sm">
                  <b>Nama Lengkap:</b> {guru.nama_lengkap}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Silakan pilih mapel dan kelas untuk tahun ajaran{" "}
                  <b>{namaTahunAjaran}</b>.
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Pilih Mapel dan Kelas
                  </h3>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={tambahPilihanMengajar}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah
                  </Button>
                </div>

                <div className="space-y-4">
                  {pilihanMengajar.map((item, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <div>
                        <Label>Mapel</Label>
                        <select
                          value={item.id_mapel}
                          onChange={(e) =>
                            ubahPilihanMengajar(
                              index,
                              "id_mapel",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Pilih Mapel</option>
                          {mapelList.map((mapel) => (
                            <option
                              key={mapel.id_mapel}
                              value={mapel.id_mapel}
                            >
                              {mapel.nama_mapel}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label>Kelas</Label>
                        <select
                          value={item.id_kelas}
                          onChange={(e) =>
                            ubahPilihanMengajar(
                              index,
                              "id_kelas",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Pilih Kelas</option>
                          {kelasList.map((kelas) => (
                            <option
                              key={kelas.id_kelas}
                              value={kelas.id_kelas}
                            >
                              {kelas.tingkat} - {kelas.nama_kelas}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={pilihanMengajar.length === 1}
                          onClick={() => hapusPilihanMengajar(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={simpanVerifikasiGuru}
                  className="mt-5 w-full"
                  disabled={loading}
                >
                  {loading ? "Menyimpan..." : "Lanjutkan"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}