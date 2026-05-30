"use client"

import { useState } from "react"
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

export default function RegisterPage() {
  const router = useRouter()

  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("siswa")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleRegister = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    setError("")
    setSuccess("")

    if (!nama || !email || !password || !role) {
      setError("Semua field wajib diisi")
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError("Register gagal")
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        nama,
        role,
      })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    setSuccess("Register berhasil. Silakan login.")
    setLoading(false)

    setTimeout(() => {
      router.push("/")
    }, 1500)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Register E-Learning
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                type="text"
                placeholder="Masukkan nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            </div>

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
              <Label>Role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="guru">Guru</option>
                <option value="siswa">Siswa</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-green-600">
                {success}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Mendaftarkan..." : "Register"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Sudah punya akun?{" "}
            <Link href="/" className="font-medium text-slate-900 underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}