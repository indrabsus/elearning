"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Search, ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Guru = {
  uid: string;
  nama_lengkap: string;
};

type Mapel = {
  id_mapel: string;
  nama_mapel: string;
};

type Kelas = {
  id_kelas: string;
  tingkat: number;
  nama_kelas: string;
};

type PembagianMengajar = {
  id_mkg: string;
  uid_guru: string;
  id_mapel: string;
  id_kelas: string;
  id_tahun_ajaran: string;
  guru: Guru | null;
  mapel: Mapel | null;
  kelas: Kelas | null;
};

const ITEMS_PER_PAGE = 10;

export default function PembagianMengajarPage() {
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [dataMengajar, setDataMengajar] = useState<PembagianMengajar[]>([]);

  const [uidGuru, setUidGuru] = useState("");
  const [idMapel, setIdMapel] = useState("");
  const [idKelas, setIdKelas] = useState("");

  const [idTahunAjaran, setIdTahunAjaran] = useState("");
  const [namaTahunAjaran, setNamaTahunAjaran] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [sortKey, setSortKey] = useState<"guru" | "mapel" | "kelas">("guru");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const reloadAll = async () => {
    setLoading(true);

    const tahunId = localStorage.getItem("id_tahun_ajaran") || "";
    const tahunNama = localStorage.getItem("nama_tahun_ajaran") || "";

    setIdTahunAjaran(tahunId);
    setNamaTahunAjaran(tahunNama);

    if (!tahunId) {
      alert("Tahun ajaran belum dipilih. Silakan login ulang.");
      setLoading(false);
      return;
    }

    const [guruRes, mapelRes, kelasRes, mengajarRes] = await Promise.all([
      supabase
        .from("guru")
        .select("uid, nama_lengkap")
        .order("nama_lengkap", { ascending: true }),

      supabase
        .from("mapel")
        .select("id_mapel, nama_mapel")
        .order("nama_mapel", { ascending: true }),

      supabase
        .from("kelas")
        .select("id_kelas, tingkat, nama_kelas")
        .order("tingkat", { ascending: true })
        .order("nama_kelas", { ascending: true }),

      supabase
        .from("mapel_kelas_guru")
        .select(`
          id_mkg,
          uid_guru,
          id_mapel,
          id_kelas,
          id_tahun_ajaran,
          guru:uid_guru (
            uid,
            nama_lengkap
          ),
          mapel:id_mapel (
            id_mapel,
            nama_mapel
          ),
          kelas:id_kelas (
            id_kelas,
            tingkat,
            nama_kelas
          )
        `)
        .eq("id_tahun_ajaran", tahunId),
    ]);

    if (guruRes.error) console.error(guruRes.error.message);
    if (mapelRes.error) console.error(mapelRes.error.message);
    if (kelasRes.error) console.error(kelasRes.error.message);
    if (mengajarRes.error) console.error(mengajarRes.error.message);

    setGuruList(guruRes.data ?? []);
    setMapelList(mapelRes.data ?? []);
    setKelasList(kelasRes.data ?? []);
    setDataMengajar((mengajarRes.data ?? []) as unknown as PembagianMengajar[]);

    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const resetForm = () => {
    setUidGuru("");
    setIdMapel("");
    setIdKelas("");
  };

  const handleSort = (key: "guru" | "mapel" | "kelas") => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!uidGuru || !idMapel || !idKelas) {
      alert("Guru, mapel, dan kelas wajib dipilih");
      return;
    }

    const tahunId =
      idTahunAjaran || localStorage.getItem("id_tahun_ajaran") || "";

    if (!tahunId) {
      alert("Tahun ajaran belum dipilih. Silakan login ulang.");
      return;
    }

    setSaving(true);

    const { data: existing } = await supabase
      .from("mapel_kelas_guru")
      .select("id_mkg")
      .eq("uid_guru", uidGuru)
      .eq("id_mapel", idMapel)
      .eq("id_kelas", idKelas)
      .eq("id_tahun_ajaran", tahunId)
      .maybeSingle();

    if (existing) {
      alert("Pembagian mengajar ini sudah ada di tahun ajaran ini");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("mapel_kelas_guru").insert({
      uid_guru: uidGuru,
      id_mapel: idMapel,
      id_kelas: idKelas,
      id_tahun_ajaran: tahunId,
    });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    resetForm();
    reloadAll();
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Yakin ingin menghapus pembagian mengajar ini?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("mapel_kelas_guru")
      .delete()
      .eq("id_mkg", id);

    if (error) {
      alert(error.message);
      return;
    }

    reloadAll();
  };

  const filteredData = dataMengajar.filter((item) => {
    const keyword = search.toLowerCase();

   const guru = item.guru;
const mapel = item.mapel;
const kelas = item.kelas;

    return (
      String(guru?.nama_lengkap ?? "").toLowerCase().includes(keyword) ||
      String(mapel?.nama_mapel ?? "").toLowerCase().includes(keyword) ||
      String(kelas?.nama_kelas ?? "").toLowerCase().includes(keyword) ||
      String(kelas?.tingkat ?? "").includes(keyword)
    );
  });

  const getSortValue = (item: PembagianMengajar) => {
    const guru = item.guru;
    const mapel = item.mapel;
    const kelas = item.kelas;

    if (sortKey === "guru") return guru?.nama_lengkap ?? "";
    if (sortKey === "mapel") return mapel?.nama_mapel ?? "";
    return `${kelas?.tingkat ?? ""} ${kelas?.nama_kelas ?? ""}`;
  };

  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = getSortValue(a).toLowerCase();
    const bValue = getSortValue(b).toLowerCase();

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;

    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  const paginatedData = sortedData.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Pembagian Mengajar
        </h1>

        <p className="text-gray-500 dark:text-gray-400">
          Tahun Ajaran: {namaTahunAjaran || "-"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Tambah Pembagian
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Guru
              </label>

              <select
                value={uidGuru}
                onChange={(e) => setUidGuru(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="">Pilih Guru</option>
                {guruList.map((guru) => (
                  <option key={guru.uid} value={guru.uid}>
                    {guru.nama_lengkap}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mapel
              </label>

              <select
                value={idMapel}
                onChange={(e) => setIdMapel(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="">Pilih Mapel</option>
                {mapelList.map((mapel) => (
                  <option key={mapel.id_mapel} value={mapel.id_mapel}>
                    {mapel.nama_mapel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Kelas
              </label>

              <select
                value={idKelas}
                onChange={(e) => setIdKelas(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="">Pilih Kelas</option>
                {kelasList.map((kelas) => (
                  <option key={kelas.id_kelas} value={kelas.id_kelas}>
                    {kelas.tingkat} - {kelas.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={18} />
              {saving ? "Menyimpan..." : "Tambah"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Data Pembagian Mengajar
            </h2>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Cari data..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white sm:w-64"
              />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-800">
                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    No
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("guru")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Guru
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("mapel")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Mapel
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSort("kelas")}
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Kelas
                      <ArrowUpDown size={14} />
                    </button>
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
                      colSpan={5}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Data pembagian mengajar belum ada untuk tahun ajaran ini.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => {
                   const guru = item.guru;
                  const mapel = item.mapel;
                  const kelas = item.kelas;

                    return (
                      <tr
                        key={item.id_mkg}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {(page - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>

                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                          {guru?.nama_lengkap ?? "-"}
                        </td>

                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {mapel?.nama_mapel ?? "-"}
                        </td>

                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {kelas
                            ? `${kelas.tingkat} - ${kelas.nama_kelas}`
                            : "-"}
                        </td>

                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(item.id_mkg)
                            }
                            className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total data: {filteredData.length}
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