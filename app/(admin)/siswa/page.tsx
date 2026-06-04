"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Siswa = {
  id_siswa: string;
  no_skulio: number | null;
  nama_lengkap: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jenkel: string | null;
  agama: string | null;
  tahun_masuk: number | null;
  created_at?: string;
  kelas_text?: string;
};

const ITEMS_PER_PAGE = 10;

const fetchAll = async (
  table: string,
  selectQuery: string,
  orderColumn?: string
) => {
  const pageSize = 1000;
  let from = 0;
  let to = pageSize - 1;
  let allData: any[] = [];
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(selectQuery).range(from, to);

    if (orderColumn) {
      query = query.order(orderColumn, { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error(error.message);
      break;
    }

    allData = [...allData, ...(data ?? [])];

    if (!data || data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
      to += pageSize;
    }
  }

  return allData;
};

const getSiswaData = async (): Promise<Siswa[]> => {
  const idTahunAjaran = localStorage.getItem("id_tahun_ajaran") || "";

  const siswaData = await fetchAll("siswa", "*", "nama_lengkap");

  if (!idTahunAjaran) {
    return siswaData ?? [];
  }

  const siswaKelasData = await fetchAll(
    "siswa_kelas",
    `
      id_siswa,
      id_kelas,
      id_tahun_ajaran,
      kelas:id_kelas (
        tingkat,
        nama_kelas
      )
    `
  );

  const siswaKelasFiltered = siswaKelasData.filter(
    (item) => item.id_tahun_ajaran === idTahunAjaran
  );

  const kelasMap = new Map<string, string>();

  siswaKelasFiltered.forEach((item: any) => {
    const kelas = Array.isArray(item.kelas) ? item.kelas[0] : item.kelas;

    kelasMap.set(
      item.id_siswa,
      kelas ? `${kelas.tingkat ?? "-"} ${kelas.nama_kelas ?? "-"}` : "-"
    );
  });

  return siswaData.map((item) => ({
    ...item,
    kelas_text: kelasMap.get(item.id_siswa) ?? "Belum dapat kelas",
  }));
};

export default function KelolaSiswaPage() {
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [noSkulio, setNoSkulio] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [jenkel, setJenkel] = useState("");
  const [agama, setAgama] = useState("");
  const [tahunMasuk, setTahunMasuk] = useState("");

  const [editId, setEditId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Siswa>("nama_lengkap");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const reloadSiswa = async () => {
    setLoading(true);
    const data = await getSiswaData();
    setSiswa(data);
    setLoading(false);
  };

  useEffect(() => {
    reloadSiswa();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const resetForm = () => {
    setNoSkulio("");
    setNamaLengkap("");
    setTempatLahir("");
    setTanggalLahir("");
    setJenkel("");
    setAgama("");
    setTahunMasuk("");
    setEditId(null);
  };

  const handleSort = (key: keyof Siswa) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !namaLengkap ||
      !tempatLahir ||
      !tanggalLahir ||
      !jenkel ||
      !agama ||
      !tahunMasuk
    ) {
      alert("Semua field wajib diisi");
      return;
    }

    setSaving(true);

    const payload = {
      nama_lengkap: namaLengkap,
      tempat_lahir: tempatLahir,
      tanggal_lahir: tanggalLahir,
      jenkel,
      agama,
      tahun_masuk: Number(tahunMasuk),
    };

    if (editId) {
      const { error } = await supabase
        .from("siswa")
        .update(payload)
        .eq("id_siswa", editId);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("siswa").insert(payload);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    resetForm();
    reloadSiswa();
  };

  const handleEdit = (item: Siswa) => {
    setEditId(item.id_siswa);
    setNoSkulio(String(item.no_skulio ?? ""));
    setNamaLengkap(item.nama_lengkap ?? "");
    setTempatLahir(item.tempat_lahir ?? "");
    setTanggalLahir(item.tanggal_lahir ?? "");
    setJenkel(item.jenkel ?? "");
    setAgama(item.agama ?? "");
    setTahunMasuk(String(item.tahun_masuk ?? ""));
  };

  const handleDelete = async (id_siswa: string) => {
    const confirmDelete = confirm("Yakin ingin menghapus data siswa ini?");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("siswa")
      .delete()
      .eq("id_siswa", id_siswa);

    if (error) {
      alert(error.message);
      return;
    }

    reloadSiswa();
  };

  const filteredSiswa = siswa.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      String(item.no_skulio ?? "").toLowerCase().includes(keyword) ||
      String(item.nama_lengkap ?? "").toLowerCase().includes(keyword) ||
      String(item.kelas_text ?? "").toLowerCase().includes(keyword) ||
      String(item.jenkel ?? "").toLowerCase().includes(keyword) ||
      String(item.agama ?? "").toLowerCase().includes(keyword)
    );
  });

  const sortedSiswa = [...filteredSiswa].sort((a, b) => {
    const aValue = String(a[sortKey] ?? "").toLowerCase();
    const bValue = String(b[sortKey] ?? "").toLowerCase();

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;

    return 0;
  });

  const totalPages = Math.ceil(sortedSiswa.length / ITEMS_PER_PAGE);

  const paginatedSiswa = sortedSiswa.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Kelola Siswa
        </h1>

        <p className="text-gray-500 dark:text-gray-400">
          Tambah, edit, dan hapus data siswa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {editId ? "Edit Siswa" : "Tambah Siswa"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No Skulio
              </label>

              <input
                type="text"
                value={noSkulio || "Otomatis"}
                disabled
                className="mt-2 w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-2 text-gray-500 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nama Lengkap
              </label>

              <input
                type="text"
                placeholder="Masukkan nama lengkap"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tempat Lahir
                </label>

                <input
                  type="text"
                  placeholder="Contoh: Bandung"
                  value={tempatLahir}
                  onChange={(e) => setTempatLahir(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tanggal Lahir
                </label>

                <input
                  type="date"
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Jenis Kelamin
                </label>

                <select
                  value={jenkel}
                  onChange={(e) => setJenkel(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Pilih</option>
                  <option value="l">Laki-laki</option>
                  <option value="p">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Agama
                </label>

                <input
                  type="text"
                  placeholder="Contoh: Islam"
                  value={agama}
                  onChange={(e) => setAgama(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tahun Masuk
              </label>

              <input
                type="number"
                placeholder="Contoh: 2024"
                value={tahunMasuk}
                onChange={(e) => setTahunMasuk(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={18} />

                {saving ? "Menyimpan..." : editId ? "Update" : "Tambah"}
              </button>

              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Data Siswa
            </h2>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Cari siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white sm:w-64"
              />
            </div>
          </div>

          <div className="mt-5 space-y-4 md:hidden">
            {loading ? (
              <div className="rounded-xl border p-6 text-center text-gray-500">
                Loading data...
              </div>
            ) : paginatedSiswa.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-gray-500">
                Data siswa belum ada.
              </div>
            ) : (
              paginatedSiswa.map((item, index) => (
                <div
                  key={item.id_siswa}
                  className="rounded-xl border p-4 shadow-sm dark:border-gray-800"
                >
                  <p className="break-words font-semibold">
                    {(page - 1) * ITEMS_PER_PAGE + index + 1}.{" "}
                    {item.nama_lengkap || "-"}
                  </p>

                  <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                      <b>No Skulio:</b> {item.no_skulio || "-"}
                    </p>

                    <p>
                      <b>Kelas:</b>{" "}
                      <span
                        className={
                          item.kelas_text === "Belum dapat kelas"
                            ? "font-semibold text-red-600"
                            : "font-semibold text-green-600"
                        }
                      >
                        {item.kelas_text ?? "Belum dapat kelas"}
                      </span>
                    </p>

                    <p>
                      <b>Nama:</b> {item.nama_lengkap || "-"}
                    </p>

                    <p>
                      <b>JK:</b> {item.jenkel == 'l' ? 'Laki-laki' : 'Perempuan'}
                    </p>

                    <p>
                      <b>Agama:</b> {item.agama || "-"}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="rounded-lg bg-yellow-500 py-2 text-sm text-white"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id_siswa)}
                      className="rounded-lg bg-red-600 py-2 text-sm text-white"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-800">
                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    No
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("no_skulio")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      No Skulio
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("kelas_text")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Kelas
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("nama_lengkap")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Nama
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    JK
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    Agama
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : paginatedSiswa.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Data siswa belum ada.
                    </td>
                  </tr>
                ) : (
                  paginatedSiswa.map((item, index) => (
                    <tr
                      key={item.id_siswa}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {(page - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>

                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                        {item.no_skulio || "-"}
                      </td>

                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                        {item.kelas_text === "Belum dapat kelas" ? (
                          <span className="text-red-500">-</span>
                        ) : (
                          item.kelas_text
                        )}
                      </td>

                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {item.nama_lengkap || "-"}
                      </td>

                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {item.jenkel == 'l' ? 'Laki-laki' : item.jenkel == 'p' ? 'Perempuan' : '-'}
                      </td>

                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {item.agama || "-"}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-lg bg-yellow-100 p-2 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id_siswa)}
                            className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total data: {filteredSiswa.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((prev) => prev - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Sebelumnya
              </button>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {page} / {totalPages || 1}
              </span>

              <button
                type="button"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}