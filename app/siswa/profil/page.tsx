"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Save, KeyRound, Pencil, X } from "lucide-react"

type Siswa = {
  id_siswa: string
  nama_lengkap: string | null
  tempat_lahir: string | null
  tanggal_lahir: string | null
  jenkel: string | null
  no_hp: string | null
  agama: string | null
  alamat: string | null
  nisn: string | null
  nama_ayah: string | null
  pekerjaan_ayah: string | null
  nama_ibu: string | null
  pekerjaan_ibu: string | null
  no_hp_ortu: string | null
  asal_sekolah: string | null
  tahun_masuk: number | null
  status: string | null
  created_at: string | null
  no_skulio: number | null
}

type Profil = {
  id_profil: string
  user_id: string | null
  role: string | null
  id_siswa: string | null
  nama: string | null
  siswa: Siswa | Siswa[] | null
}

function getSiswa(data: Siswa | Siswa[] | null): Siswa | null {
  if (!data) return null
  return Array.isArray(data) ? data[0] ?? null : data
}

function formatTanggal(tanggal: string | null) {
  if (!tanggal) return "-"
  return new Date(tanggal).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function valueOrEmpty(value: string | number | null) {
  return value === null || value === undefined ? "" : String(value)
}

export default function ProfilSiswaPage() {
  const router = useRouter()

  const [userId, setUserId] = useState("")
  const [siswa, setSiswa] = useState<Siswa | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [passwordBaru, setPasswordBaru] = useState("")
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("")

  const [form, setForm] = useState({
    nama_lengkap: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenkel: "",
    no_hp: "",
    agama: "",
    alamat: "",
    nisn: "",
    nama_ayah: "",
    pekerjaan_ayah: "",
    nama_ibu: "",
    pekerjaan_ibu: "",
    no_hp_ortu: "",
    asal_sekolah: "",
    tahun_masuk: "",
    status: "",
  })

  const isiForm = (data: Siswa) => {
    setForm({
      nama_lengkap: valueOrEmpty(data.nama_lengkap),
      tempat_lahir: valueOrEmpty(data.tempat_lahir),
      tanggal_lahir: valueOrEmpty(data.tanggal_lahir),
      jenkel: valueOrEmpty(data.jenkel),
      no_hp: valueOrEmpty(data.no_hp),
      agama: valueOrEmpty(data.agama),
      alamat: valueOrEmpty(data.alamat),
      nisn: valueOrEmpty(data.nisn),
      nama_ayah: valueOrEmpty(data.nama_ayah),
      pekerjaan_ayah: valueOrEmpty(data.pekerjaan_ayah),
      nama_ibu: valueOrEmpty(data.nama_ibu),
      pekerjaan_ibu: valueOrEmpty(data.pekerjaan_ibu),
      no_hp_ortu: valueOrEmpty(data.no_hp_ortu),
      asal_sekolah: valueOrEmpty(data.asal_sekolah),
      tahun_masuk: valueOrEmpty(data.tahun_masuk),
      status: valueOrEmpty(data.status),
    })
  }

  const getProfilSiswa = async () => {
    setLoading(true)
    setError("")
    setSuccess("")

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      router.replace("/login")
      return
    }

    const uid = userData.user.id
    setUserId(uid)

    const { data, error } = await supabase
      .from("profil")
      .select(`
        id_profil,
        user_id,
        role,
        id_siswa,
        nama,
        siswa:id_siswa (
          id_siswa,
          nama_lengkap,
          tempat_lahir,
          tanggal_lahir,
          jenkel,
          no_hp,
          agama,
          alamat,
          nisn,
          nama_ayah,
          pekerjaan_ayah,
          nama_ibu,
          pekerjaan_ibu,
          no_hp_ortu,
          asal_sekolah,
          tahun_masuk,
          status,
          created_at,
          no_skulio
        )
      `)
      .eq("user_id", uid)
      .maybeSingle()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setError("Profil tidak ditemukan.")
      setLoading(false)
      return
    }

    const profil = data as unknown as Profil

    if (profil.role !== "siswa") {
      setError("Halaman ini khusus untuk siswa.")
      setLoading(false)
      return
    }

    if (!profil.id_siswa) {
      router.replace("/verifikasi-siswa")
      return
    }

    const siswaData = getSiswa(profil.siswa)

    if (!siswaData) {
      setError("Data siswa belum terhubung.")
      setLoading(false)
      return
    }

    setSiswa(siswaData)
    isiForm(siswaData)
    setLoading(false)
  }

  useEffect(() => {
    getProfilSiswa()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const simpanProfil = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!siswa) return

    setSaving(true)
    setError("")
    setSuccess("")

    if (!form.nama_lengkap.trim()) {
      setError("Nama lengkap wajib diisi.")
      setSaving(false)
      return
    }

    const payload = {
      nama_lengkap: form.nama_lengkap.trim(),
      tempat_lahir: form.tempat_lahir.trim() || null,
      tanggal_lahir: form.tanggal_lahir || null,
      jenkel: form.jenkel || null,
      no_hp: form.no_hp.trim() || null,
      agama: form.agama || null,
      alamat: form.alamat.trim() || null,
      nisn: form.nisn.trim() || null,
      nama_ayah: form.nama_ayah.trim() || null,
      pekerjaan_ayah: form.pekerjaan_ayah.trim() || null,
      nama_ibu: form.nama_ibu.trim() || null,
      pekerjaan_ibu: form.pekerjaan_ibu.trim() || null,
      no_hp_ortu: form.no_hp_ortu.trim() || null,
      asal_sekolah: form.asal_sekolah.trim() || null,
      tahun_masuk: form.tahun_masuk ? Number(form.tahun_masuk) : null,
      status: form.status || null,
    }

    const { data, error } = await supabase
      .from("siswa")
      .update(payload)
      .eq("id_siswa", siswa.id_siswa)
      .select(`
        id_siswa,
        nama_lengkap,
        tempat_lahir,
        tanggal_lahir,
        jenkel,
        no_hp,
        agama,
        alamat,
        nisn,
        nama_ayah,
        pekerjaan_ayah,
        nama_ibu,
        pekerjaan_ibu,
        no_hp_ortu,
        asal_sekolah,
        tahun_masuk,
        status,
        created_at,
        no_skulio
      `)
      .single()

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    await supabase
      .from("profil")
      .update({
        nama: payload.nama_lengkap,
      })
      .eq("user_id", userId)

    setSiswa(data as Siswa)
    isiForm(data as Siswa)
    setEditMode(false)
    setSuccess("Profil berhasil diperbarui.")
    setSaving(false)
  }

  const gantiPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError("")
    setSuccess("")

    if (!passwordBaru || !konfirmasiPassword) {
      setError("Password baru dan konfirmasi wajib diisi.")
      return
    }

    if (passwordBaru.length < 6) {
      setError("Password minimal 6 karakter.")
      return
    }

    if (passwordBaru !== konfirmasiPassword) {
      setError("Konfirmasi password tidak sama.")
      return
    }

    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: passwordBaru,
    })

    if (error) {
      setError(error.message)
      setSavingPassword(false)
      return
    }

    setPasswordBaru("")
    setKonfirmasiPassword("")
    setSuccess("Password berhasil diubah.")
    setSavingPassword(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
            Memuat profil siswa...
          </div>
        </div>
      </main>
    )
  }

  if (!siswa) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-6 text-red-500 shadow dark:bg-slate-900">
            {error || "Data siswa tidak ditemukan."}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                Profil Siswa
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Kelola data profil dan password akun.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditMode((prev) => !prev)
                isiForm(siswa)
                setError("")
                setSuccess("")
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {editMode ? <X size={18} /> : <Pencil size={18} />}
              {editMode ? "Batal Edit" : "Edit Profil"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950">
              {success}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
              {siswa.nama_lengkap?.charAt(0)?.toUpperCase() ?? "S"}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {siswa.nama_lengkap ?? "-"}
              </h2>
              <p className="text-sm text-slate-500">
                No Skulio: {siswa.no_skulio ?? "-"}
              </p>
              <p className="text-sm text-slate-500">
                NISN: {siswa.nisn ?? "-"}
              </p>
            </div>
          </div>
        </div>

        {editMode ? (
          <form
            onSubmit={simpanProfil}
            className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900"
          >
            <h2 className="mb-4 text-lg font-semibold">Edit Profil</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputField label="Nama Lengkap" name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange} />
              <InputField label="Tempat Lahir" name="tempat_lahir" value={form.tempat_lahir} onChange={handleChange} />
              <InputField label="Tanggal Lahir" name="tanggal_lahir" type="date" value={form.tanggal_lahir} onChange={handleChange} />

              <div>
                <label className="text-sm font-medium">Jenis Kelamin</label>
                <select
                  name="jenkel"
                  value={form.jenkel}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Pilih</option>
                  <option value="l">Laki-laki</option>
                  <option value="p">Perempuan</option>
                </select>
              </div>

              <InputField label="No HP" name="no_hp" value={form.no_hp} onChange={handleChange} />
              <InputField label="Agama" name="agama" value={form.agama} onChange={handleChange} />
              <InputField label="NISN" name="nisn" value={form.nisn} onChange={handleChange} />
              <InputField label="Asal Sekolah" name="asal_sekolah" value={form.asal_sekolah} onChange={handleChange} />
              <InputField disabled={true} label="Tahun Masuk" name="tahun_masuk" type="number" value={form.tahun_masuk} onChange={handleChange} />
              <InputField disabled={true} label="Status" name="status" value={form.status} onChange={handleChange} />
              <InputField label="Nama Ayah" name="nama_ayah" value={form.nama_ayah} onChange={handleChange} />
              <InputField label="Pekerjaan Ayah" name="pekerjaan_ayah" value={form.pekerjaan_ayah} onChange={handleChange} />
              <InputField label="Nama Ibu" name="nama_ibu" value={form.nama_ibu} onChange={handleChange} />
              <InputField label="Pekerjaan Ibu" name="pekerjaan_ibu" value={form.pekerjaan_ibu} onChange={handleChange} />
              <InputField label="No HP Orang Tua" name="no_hp_ortu" value={form.no_hp_ortu} onChange={handleChange} />

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Alamat</label>
                <textarea
                  name="alamat"
                  value={form.alamat}
                  onChange={handleChange}
                  rows={3}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
              <h3 className="mb-4 text-lg font-semibold">Data Pribadi</h3>
              <div className="space-y-3 text-sm">
                <Info label="Nama Lengkap" value={siswa.nama_lengkap} />
                <Info label="Tempat Lahir" value={siswa.tempat_lahir} />
                <Info label="Tanggal Lahir" value={formatTanggal(siswa.tanggal_lahir)} />
                <Info label="Jenis Kelamin" value={siswa.jenkel === "l" ? "Laki-laki" : "Perempuan"} />
                <Info label="Agama" value={siswa.agama} />
                <Info label="No HP" value={siswa.no_hp} />
                <Info label="Alamat" value={siswa.alamat} />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
              <h3 className="mb-4 text-lg font-semibold">Data Sekolah</h3>
              <div className="space-y-3 text-sm">
                <Info label="ID Siswa" value={siswa.id_siswa} />
                <Info label="No Skulio" value={siswa.no_skulio?.toString() ?? "-"} />
                <Info label="NISN" value={siswa.nisn} />
                <Info label="Asal Sekolah" value={siswa.asal_sekolah} />
                <Info label="Tahun Masuk" value={siswa.tahun_masuk?.toString() ?? "-"} />
                <Info label="Status" value={siswa.status} />
                <Info label="Tanggal Input" value={formatTanggal(siswa.created_at)} />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900 lg:col-span-2">
              <h3 className="mb-4 text-lg font-semibold">Data Orang Tua</h3>
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <Info label="Nama Ayah" value={siswa.nama_ayah} />
                <Info label="Pekerjaan Ayah" value={siswa.pekerjaan_ayah} />
                <Info label="Nama Ibu" value={siswa.nama_ibu} />
                <Info label="Pekerjaan Ibu" value={siswa.pekerjaan_ibu} />
                <Info label="No HP Orang Tua" value={siswa.no_hp_ortu} />
              </div>
            </section>
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
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
              <label className="text-sm font-medium">Konfirmasi Password</label>
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
    </main>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800 dark:text-white">
        {value || "-"}
      </p>
    </div>
  )
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string
  name: string
  value: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
  type?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="mt-2 w-full rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900"
      />
    </div>
  )
}