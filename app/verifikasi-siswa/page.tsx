"use client"

import { useState } from "react"
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

export default function VerifikasiSiswaPage() {
  const router = useRouter()

  const [nisn, setNisn] = useState("")
  const [tanggalLahir, setTanggalLahir] = useState("")
  const [siswa, setSiswa] = useState<Siswa | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const cekSiswa = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    setError("")
    setSiswa(null)
    setLoading(true)

    if (!nisn || !tanggalLahir) {
      setError("NISN dan tanggal lahir wajib diisi")
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("siswa")
      .select(
        "nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenkel, agama, tahun_masuk"
      )
      .eq("nisn", nisn)
      .eq("tanggal_lahir", tanggalLahir)
      .single()

    if (error || !data) {
      setError("Data siswa tidak ditemukan atau tanggal lahir tidak sesuai")
      setLoading(false)
      return
    }

    setSiswa(data)
    setLoading(false)
  }

  const simpanNisnKeProfile = async () => {
  if (!siswa) return

  setError("")
  setLoading(true)

  const { data: userData, error: userError } =
    await supabase.auth.getUser()

  if (userError || !userData.user) {
    setError("Session tidak ditemukan. Silakan login ulang.")
    setLoading(false)
    router.push("/")
    return
  }

  // CEK APAKAH NISN SUDAH DIPAKAI
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("nisn", siswa.nisn)
    .maybeSingle()

  if (existingProfile) {
    setError("NISN sudah digunakan akun lain")
    setLoading(false)
    return
  }

  // UPDATE PROFILE
  const { error } = await supabase
    .from("profiles")
    .update({
      nisn: siswa.nisn,
    })
    .eq("id", userData.user.id)

  if (error) {
    setError(error.message)
    setLoading(false)
    return
  }

  router.push("/siswa/dashboard")
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
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

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Mengecek..." : "Cek Data"}
            </Button>
          </form>

          {siswa && (
            <div className="mt-6 rounded-xl border bg-white p-4 text-sm shadow-sm">
              <h3 className="mb-3 text-lg font-semibold">
                Data Ditemukan
              </h3>

              <div className="space-y-2">
                <p>
                  <b>NISN:</b> {siswa.nisn}
                </p>
                <p>
                  <b>Nama:</b> {siswa.nama_lengkap}
                </p>
               
               <p>
  <b>Tempat Tanggal Lahir:</b>{" "}{siswa.tempat_lahir}{", "}
  {new Date(siswa.tanggal_lahir).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  )}
</p>
                <p>
                  <b>Jenis Kelamin:</b> {siswa.jenkel == "P" ? "Perempuan" : "Laki-laki"}
                </p>
                <p>
                  <b>Agama:</b> {siswa.agama}
                </p>
                <p>
                  <b>Tahun Masuk:</b> {siswa.tahun_masuk}
                </p>
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