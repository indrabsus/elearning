"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Guru = {
  uid: number
  nama_lengkap: string
  no_hp: string | null
}

export default function ProfilGuruPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [guru, setGuru] = useState<Guru | null>(null)
  const [email, setEmail] = useState("")

  const [namaLengkap, setNamaLengkap] = useState("")
  const [noHp, setNoHp] = useState("")

  const [passwordBaru, setPasswordBaru] = useState("")
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("")

  useEffect(() => {
    const getData = async () => {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push("/")
        return
      }

      setEmail(userData.user.email || "")

      const { data: profile } = await supabase
        .from("profil")
        .select("role, uid_guru")
        .eq("user_id", userData.user.id)
        .single()

      if (!profile || profile.role !== "guru") {
        router.push("/")
        return
      }

      if (!profile.uid_guru) {
        router.push("/verifikasi-guru")
        return
      }

      const { data: guruData, error } = await supabase
        .from("guru")
        .select("uid, nama_lengkap, no_hp")
        .eq("uid", profile.uid_guru)
        .single()

      if (error || !guruData) {
        router.push("/verifikasi-guru")
        return
      }

      const data = guruData as Guru

      setGuru(data)
      setNamaLengkap(data.nama_lengkap ?? "")
      setNoHp(data.no_hp ?? "")
      setLoading(false)
    }

    getData()
  }, [router])

  const simpanProfil = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    if (!guru) return

    if (!namaLengkap) {
      alert("Nama lengkap wajib diisi")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("guru")
      .update({
        nama_lengkap: namaLengkap,
        no_hp: noHp || null,
      })
      .eq("uid", guru.uid)

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    alert("Profil guru berhasil diperbarui")
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
        <h1 className="text-2xl font-bold">Profil Guru</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Kelola data guru dan password akun.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Data Guru</h2>

          <form onSubmit={simpanProfil} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">UID Guru</label>
              <input
                value={guru?.uid ?? ""}
                disabled
                className="mt-2 w-full rounded-xl border bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email Akun</label>
              <input
                value={email}
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
              <label className="text-sm font-medium">No HP</label>
              <input
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="Contoh: 08123456789"
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