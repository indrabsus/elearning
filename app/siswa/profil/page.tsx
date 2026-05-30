"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Save, KeyRound } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Siswa = {
  nisn: string
  nama_lengkap: string
  tempat_lahir: string
  tanggal_lahir: string
  jenkel: string
  agama: string
  tahun_masuk: number
}

export default function ProfilSiswaPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [siswa, setSiswa] = useState<Siswa | null>(null)

  const [namaLengkap, setNamaLengkap] = useState("")
  const [tempatLahir, setTempatLahir] = useState("")
  const [tanggalLahir, setTanggalLahir] = useState("")
  const [jenkel, setJenkel] = useState("")
  const [agama, setAgama] = useState("")
  const [tahunMasuk, setTahunMasuk] = useState("")

  const [passwordBaru, setPasswordBaru] = useState("")
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("")

  useEffect(() => {
    const getData = async () => {
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

      const { data: siswaData, error } = await supabase
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
        .eq("nisn", profile.nisn)
        .single()

      if (error || !siswaData) {
        router.push("/verifikasi-siswa")
        return
      }

      const data = siswaData as Siswa

      setSiswa(data)
      setNamaLengkap(data.nama_lengkap ?? "")
      setTempatLahir(data.tempat_lahir ?? "")
      setTanggalLahir(data.tanggal_lahir ?? "")
      setJenkel(data.jenkel ?? "")
      setAgama(data.agama ?? "")
      setTahunMasuk(String(data.tahun_masuk ?? ""))

      setLoading(false)
    }

    getData()
  }, [router])

  const simpanProfil = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    if (!siswa) return

    if (!namaLengkap || !tanggalLahir) {
      alert("Nama lengkap dan tanggal lahir wajib diisi")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("siswa")
      .update({
        nama_lengkap: namaLengkap,
        tempat_lahir: tempatLahir || null,
        tanggal_lahir: tanggalLahir,
        jenkel: jenkel || null,
        agama: agama || null,
        tahun_masuk: tahunMasuk ? Number(tahunMasuk) : null,
      })
      .eq("nisn", siswa.nisn)

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    alert("Profil berhasil diperbarui")
    setSaving(false)
  }

  const gantiPassword = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    if (!passwordBaru || !konfirmasiPassword) {
      alert("Password baru dan konfirmasi wajib diisi")
      return
    }

    if (passwordBaru.length < 6) {
      alert("Password minimal 6 karakter")
      return
    }

    if (passwordBaru !== konfirmasiPassword) {
      alert("Konfirmasi password tidak sama")
      return
    }

    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: passwordBaru,
    })

    if (error) {
      alert(error.message)
      setSavingPassword(false)
      return
    }

    alert("Password berhasil diganti")
    setPasswordBaru("")
    setKonfirmasiPassword("")
    setSavingPassword(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil Siswa</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Kelola data pribadi dan password akun.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Data Siswa</h2>

          <form onSubmit={simpanProfil} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">NISN</label>
              <input
                value={siswa?.nisn ?? ""}
                disabled
                className="mt-2 w-full rounded-xl border bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Nama Lengkap</label>
              <input
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tempat Lahir</label>
              <input
                value={tempatLahir}
                onChange={(e) => setTempatLahir(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tanggal Lahir</label>
              <input
                type="date"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Jenis Kelamin</label>
              <select
                value={jenkel}
                onChange={(e) => setJenkel(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Pilih jenis kelamin</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Agama</label>
              <input
                value={agama}
                onChange={(e) => setAgama(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tahun Masuk</label>
              <input
                type="number"
                value={tahunMasuk}
                onChange={(e) => setTahunMasuk(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Ganti Password</h2>

          <form onSubmit={gantiPassword} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Password Baru</label>
              <input
                type="password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Konfirmasi Password
              </label>
              <input
                type="password"
                value={konfirmasiPassword}
                onChange={(e) => setKonfirmasiPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <KeyRound size={18} />
              {savingPassword ? "Menyimpan..." : "Ganti Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}