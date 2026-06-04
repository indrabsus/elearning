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
  id_siswa: string
  no_skulio: number | null
  nama_lengkap: string | null
  tempat_lahir: string | null
  tanggal_lahir: string | null
  jenkel: string | null
  agama: string | null
}

export default function VerifikasiSiswaPage() {
  const router = useRouter()

  const [noSkulio, setNoSkulio] = useState("")
  const [tanggalLahir, setTanggalLahir] = useState("")
  const [siswa, setSiswa] = useState<Siswa | null>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleCariSiswa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError("")
    setSiswa(null)

    const noSkulioTrim = noSkulio.trim()

    if (!noSkulioTrim) {
      setError("No Skulio wajib diisi")
      return
    }

    if (!/^\d{8}$/.test(noSkulioTrim)) {
      setError("No Skulio harus 8 digit angka")
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from("siswa")
      .select(`
        id_siswa,
        no_skulio,
        nama_lengkap,
        tempat_lahir,
        tanggal_lahir,
        jenkel,
        agama
      `)
      .eq("no_skulio", Number(noSkulioTrim))
      .maybeSingle()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setError("Data siswa tidak ditemukan. Periksa kembali No Skulio dan tanggal lahir.")
      setLoading(false)
      return
    }

    const { data: profilSudahAda, error: cekProfilError } = await supabase
      .from("profil")
      .select("id_profil, nama")
      .eq("id_siswa", data.id_siswa)
      .maybeSingle()

    if (cekProfilError) {
      setError(cekProfilError.message)
      setLoading(false)
      return
    }

    if (profilSudahAda) {
      setError("Data siswa ini sudah terhubung dengan akun lain.")
      setLoading(false)
      return
    }

    setSiswa(data as Siswa)
    setLoading(false)
  }

 const handleHubungkanAkun = async () => {
  if (!siswa) return

  setError("")
  setSaving(true)

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    setError("User belum login. Silakan login ulang.")
    setSaving(false)
    router.replace("/login")
    return
  }

  const userId = userData.user.id

  const { data: profilLogin, error: profilLoginError } = await supabase
    .from("profil")
    .select("id_profil, role, id_siswa")
    .eq("user_id", userId)
    .maybeSingle()

  if (profilLoginError) {
    setError(profilLoginError.message)
    setSaving(false)
    return
  }

  if (!profilLogin) {
    setError("Profil akun tidak ditemukan. Silakan hubungi admin.")
    setSaving(false)
    return
  }

  if (profilLogin.id_siswa) {
    setError("Akun ini sudah terhubung dengan data siswa.")
    setSaving(false)
    return
  }

  const { data: siswaSudahDipakai, error: cekSiswaError } = await supabase
    .from("profil")
    .select("user_id")
    .eq("id_siswa", siswa.id_siswa)
    .maybeSingle()

  if (cekSiswaError) {
    setError(cekSiswaError.message)
    setSaving(false)
    return
  }

  if (siswaSudahDipakai) {
    setError("Data siswa ini sudah terhubung dengan akun lain.")
    setSaving(false)
    return
  }

  const { error: updateProfilError } = await supabase
    .from("profil")
    .update({
      id_siswa: siswa.id_siswa,
      nama: siswa.nama_lengkap,
    })
    .eq("user_id", userId)

  if (updateProfilError) {
    setError(updateProfilError.message)
    setSaving(false)
    return
  }

  setSaving(false)
  router.replace("/siswa/dashboard")
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Verifikasi Siswa
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleCariSiswa} className="space-y-4">
            <div className="space-y-2">
              <Label>No Skulio</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="Masukkan 8 digit No Skulio"
                value={noSkulio}
                onChange={(e) =>
                  setNoSkulio(e.target.value.replace(/\D/g, ""))
                }
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
              {loading ? "Mencari..." : "Cari Data Siswa"}
            </Button>
          </form>

          {siswa && (
            <div className="rounded-xl border bg-slate-50 p-4 text-sm dark:bg-slate-900">
              <h3 className="mb-3 font-semibold">
                Data Ditemukan
              </h3>

              <div className="space-y-1">
                <p>
                  <span className="font-medium">No Skulio:</span>{" "}
                  {siswa.no_skulio}
                </p>
                <p>
                  <span className="font-medium">Nama:</span>{" "}
                  {siswa.nama_lengkap}
                </p>
                <p>
                  <span className="font-medium">Tempat/Tanggal Lahir:</span>{" "}
                  {siswa.tempat_lahir ?? "-"},{" "}
                  {siswa.tanggal_lahir ?? "-"}
                </p>
                <p>
                  <span className="font-medium">Jenis Kelamin:</span>{" "}
                  {siswa.jenkel ?? "-"}
                </p>
                <p>
                  <span className="font-medium">Agama:</span>{" "}
                  {siswa.agama ?? "-"}
                </p>
              </div>

              <Button
                type="button"
                className="mt-4 w-full"
                disabled={saving}
                onClick={handleHubungkanAkun}
              >
                {saving ? "Menghubungkan..." : "Hubungkan ke Akun Saya"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}