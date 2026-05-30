"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

type Siswa = {
  nisn: string
  nama_lengkap: string
  tempat_lahir: string
  tanggal_lahir: string
  jenkel: string
  agama: string
  tahun_masuk: number
}

type Kelas = {
  id_kelas: string
  tingkat: number | null
  nama_kelas: string | null
}

type SiswaKelas = {
  id_siswa_kelas: string
  id_kelas: string
  status: string | null
  kelas: Kelas | null
}

export default function VerifikasiSiswaPage() {
  const router = useRouter()

  const [nisn, setNisn] = useState("")
  const [tanggalLahir, setTanggalLahir] = useState("")
  const [siswa, setSiswa] = useState<Siswa | null>(null)
  const [siswaKelas, setSiswaKelas] = useState<SiswaKelas | null>(null)

  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [selectedKelas, setSelectedKelas] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const getKelas = async () => {
      const { data, error } = await supabase
        .from("kelas")
        .select("id_kelas, tingkat, nama_kelas")
        .order("tingkat", { ascending: true })
        .order("nama_kelas", { ascending: true })

      if (error) {
        setError(error.message)
        return
      }

      setKelasList(data ?? [])
    }

    getKelas()
  }, [])

  const cekSiswa = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    setError("")
    setSiswa(null)
    setSiswaKelas(null)
    setSelectedKelas("")
    setLoading(true)

    const nisnTrim = nisn.trim()

    if (!nisnTrim || !tanggalLahir) {
      setError("NISN dan tanggal lahir wajib diisi")
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("siswa")
      .select(`
        nisn,
        nama_lengkap,
        tempat_lahir,
        tanggal_lahir,
        jenkel,
        agama,
        tahun_masuk
      `)
      .eq("nisn", nisnTrim)
      .eq("tanggal_lahir", tanggalLahir)
      .maybeSingle()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setError("Data siswa tidak ditemukan atau tanggal lahir tidak sesuai")
      setLoading(false)
      return
    }

    setSiswa(data as Siswa)

    const idTahunAjaran =
      localStorage.getItem("id_tahun_ajaran") || ""

    if (!idTahunAjaran) {
      setError("Tahun ajaran belum dipilih. Silakan login ulang.")
      setLoading(false)
      return
    }

    const { data: siswaKelasData, error: siswaKelasError } = await supabase
      .from("siswa_kelas")
      .select(`
        id_siswa_kelas,
        id_kelas,
        status,
        kelas:id_kelas (
          id_kelas,
          tingkat,
          nama_kelas
        )
      `)
      .eq("nisn", data.nisn)
      .eq("id_tahun_ajaran", idTahunAjaran)
      .maybeSingle()

    if (siswaKelasError) {
      setError(siswaKelasError.message)
      setLoading(false)
      return
    }

    if (siswaKelasData) {
      setSiswaKelas(siswaKelasData as SiswaKelas)
      setSelectedKelas(siswaKelasData.id_kelas)
    }

    setLoading(false)
  }

  const simpanNisnKeProfile = async () => {
    if (!siswa) return

    setError("")
    setLoading(true)

    const idTahunAjaran =
      localStorage.getItem("id_tahun_ajaran") || ""

    if (!idTahunAjaran) {
      setError("Tahun ajaran belum dipilih. Silakan login ulang.")
      setLoading(false)
      router.push("/")
      return
    }

    const finalIdKelas = siswaKelas?.id_kelas || selectedKelas

    if (!finalIdKelas) {
      setError("Silakan pilih kelas untuk tahun ajaran ini")
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
      .eq("nisn", siswa.nisn)
      .neq("id", userData.user.id)
      .maybeSingle()

    if (existingProfile) {
      setError("NISN sudah digunakan akun lain")
      setLoading(false)
      return
    }

    const { data: existingSiswaKelas } = await supabase
      .from("siswa_kelas")
      .select("id_siswa_kelas")
      .eq("nisn", siswa.nisn)
      .eq("id_tahun_ajaran", idTahunAjaran)
      .maybeSingle()

    if (existingSiswaKelas) {
      const { error: updateError } = await supabase
        .from("siswa_kelas")
        .update({
          id_kelas: finalIdKelas,
          status: "aktif",
        })
        .eq("id_siswa_kelas", existingSiswaKelas.id_siswa_kelas)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from("siswa_kelas")
        .insert({
          nisn: siswa.nisn,
          id_kelas: finalIdKelas,
          id_tahun_ajaran: idTahunAjaran,
          status: "aktif",
        })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        nisn: siswa.nisn,
      })
      .eq("id", userData.user.id)

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push("/siswa/dashboard")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Verifikasi Data Siswa
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={cekSiswa} className="space-y-4">
            <div className="space-y-2">
              <Label>NISN</Label>
              <Input
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="Masukkan NISN"
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Lahir</Label>
              <Input
                type="date"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Mengecek..." : "Cek Data"}
            </Button>
          </form>

          {siswa && (
            <div className="mt-6 rounded-xl border bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 text-lg font-semibold">
                Data Ditemukan
              </h3>

              <div className="space-y-2">
                <p><b>NISN:</b> {siswa.nisn}</p>
                <p><b>Nama:</b> {siswa.nama_lengkap}</p>

                <p>
                  <b>Tempat Tanggal Lahir:</b>{" "}
                  {siswa.tempat_lahir},{" "}
                  {new Date(siswa.tanggal_lahir).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>

                <p>
                  <b>Jenis Kelamin:</b>{" "}
                  {siswa.jenkel === "P" ? "Perempuan" : "Laki-laki"}
                </p>

                <p><b>Agama:</b> {siswa.agama}</p>
                <p><b>Tahun Masuk:</b> {siswa.tahun_masuk}</p>

                {siswaKelas ? (
                  <p>
                    <b>Kelas Tahun Ajaran Ini:</b>{" "}
                    {siswaKelas.kelas?.tingkat} {siswaKelas.kelas?.nama_kelas}
                  </p>
                ) : (
                  <div className="space-y-2 pt-2">
                    <Label>Pilih Kelas Tahun Ajaran Ini</Label>

                    <select
                      value={selectedKelas}
                      onChange={(e) => setSelectedKelas(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Pilih kelas</option>

                      {kelasList.map((kelas) => (
                        <option key={kelas.id_kelas} value={kelas.id_kelas}>
                          {kelas.tingkat} - {kelas.nama_kelas}
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-slate-500">
                      Siswa belum terdaftar di kelas untuk tahun ajaran yang dipilih.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={simpanNisnKeProfile}
                className="mt-4 w-full"
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Gunakan Data Ini"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}