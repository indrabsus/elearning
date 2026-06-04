"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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

type TahunAjaran = {
  id_tahun_ajaran: string
  nama_tahun_ajaran: string
  aktif: boolean
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const getTahunAjaran = async () => {
      const { data, error } = await supabase
        .from("tahun_ajaran")
        .select("id_tahun_ajaran, nama_tahun_ajaran, aktif")
        .order("nama_tahun_ajaran", { ascending: false })

      if (error) {
        setError(error.message)
        return
      }

      const list = data ?? []
      setTahunAjaranList(list)

      const tahunAktif = list.find((item) => item.aktif)

      if (tahunAktif) {
        setSelectedTahunAjaran(tahunAktif.id_tahun_ajaran)
      } else if (list.length > 0) {
        setSelectedTahunAjaran(list[0].id_tahun_ajaran)
      }
    }

    getTahunAjaran()
  }, [])

  const simpanTahunAjaran = () => {
    const tahunDipilih = tahunAjaranList.find(
      (item) => item.id_tahun_ajaran === selectedTahunAjaran
    )

    localStorage.setItem("id_tahun_ajaran", selectedTahunAjaran)
    localStorage.setItem(
      "nama_tahun_ajaran",
      tahunDipilih?.nama_tahun_ajaran || ""
    )
  }

  const handleLogin = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    setError("")

    if (!email || !password) {
      setError("Email dan password wajib diisi")
      return
    }

    if (!selectedTahunAjaran) {
      setError("Tahun ajaran wajib dipilih")
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError("User tidak ditemukan")
      setLoading(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

const userId = userData.user?.id

const { data: profile, error: profileError } = await supabase
  .from("profil")
  .select("*")
  .eq("user_id", userId)
  .single()

    if (profileError || !profile) {
      setError("Profile user tidak ditemukan")
      setLoading(false)
      return
    }

    simpanTahunAjaran()

    if (profile.role === "admin") {
      router.push("/dashboard")
      return
    }

    if (profile.role === "siswa") {
  if (!profile.id_siswa) {
    router.push("/verifikasi-siswa")
    return
  }

  const { data: siswaKelas, error: siswaKelasError } = await supabase
    .from("siswa_kelas")
    .select("id_siswa_kelas, id_kelas")
    .eq("id_siswa", profile.id_siswa)
    .eq("id_tahun_ajaran", selectedTahunAjaran)
    .maybeSingle()

  if (siswaKelasError) {
    setError(siswaKelasError.message)
    setLoading(false)
    return
  }

  if (!siswaKelas || !siswaKelas.id_kelas) {
    router.push("/verifikasi-siswa?mode=kelas")
    return
  }

  router.push("/siswa/dashboard")
  return
}

    if (profile.role === "guru") {
      if (!profile.uid_guru) {
        router.push("/verifikasi-guru")
        return
      }

      const { data: pembagianMengajar, error: pembagianError } =
        await supabase
          .from("mapel_kelas_guru")
          .select("id_mkg")
          .eq("uid_guru", profile.uid_guru)
          .eq("id_tahun_ajaran", selectedTahunAjaran)
          .limit(1)

      if (pembagianError) {
        setError(pembagianError.message)
        setLoading(false)
        return
      }

      if (!pembagianMengajar || pembagianMengajar.length === 0) {
        router.push("/verifikasi-guru?mode=mengajar")
        return
      }

      router.push("/guru/dashboard")
      return
    }

    setError("Role user tidak dikenali")
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Login E-Learning
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Masukkan email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tahun Ajaran</Label>
              <select
                value={selectedTahunAjaran}
                onChange={(e) => setSelectedTahunAjaran(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih tahun ajaran</option>

                {tahunAjaranList.map((tahun) => (
                  <option
                    key={tahun.id_tahun_ajaran}
                    value={tahun.id_tahun_ajaran}
                  >
                    {tahun.nama_tahun_ajaran}
                    {tahun.aktif ? " (Aktif)" : ""}
                  </option>
                ))}
              </select>
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
              {loading ? "Memproses..." : "Login"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Belum punya akun?{" "}
            <Link href="/register" className="font-medium underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}