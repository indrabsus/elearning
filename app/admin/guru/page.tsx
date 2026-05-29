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

type Guru = {
  uid: string;
  nama_lengkap: string | null;
  no_hp: string | null;
  created_at?: string;
};

const ITEMS_PER_PAGE = 10;

const getGuruData = async (): Promise<Guru[]> => {
  const { data, error } = await supabase
    .from("guru")
    .select("*")
    .order("nama_lengkap", { ascending: true });

  if (error) {
    console.error(error.message);
    return [];
  }

  return data ?? [];
};

export default function KelolaGuruPage() {
  const [guru, setGuru] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [uid, setUid] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [noHp, setNoHp] = useState("");

  const [editId, setEditId] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [sortKey, setSortKey] =
    useState<keyof Guru>("nama_lengkap");

  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("asc");

  const reloadGuru = async () => {
    setLoading(true);

    const data = await getGuruData();

    setGuru(data);

    setLoading(false);
  };

  useEffect(() => {
    reloadGuru();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const resetForm = () => {
    setUid("");
    setNamaLengkap("");
    setNoHp("");
    setEditId(null);
  };

  const handleSort = (key: keyof Guru) => {
    if (sortKey === key) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  };

  const handleSubmit = async (
    e: React.BaseSyntheticEvent
  ) => {
    e.preventDefault();

    if (!uid || !namaLengkap || !noHp) {
      alert("UID, nama lengkap, dan nomor HP wajib diisi");
      return;
    }

    setSaving(true);

    if (editId) {
      const { error } = await supabase
        .from("guru")
        .update({
          nama_lengkap: namaLengkap,
          no_hp: noHp,
        })
        .eq("uid", editId);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("guru")
        .insert({
          uid,
          nama_lengkap: namaLengkap,
          no_hp: noHp,
        });

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);

    resetForm();

    reloadGuru();
  };

  const handleEdit = (item: Guru) => {
    setEditId(item.uid);

    setUid(item.uid);

    setNamaLengkap(item.nama_lengkap ?? "");

    setNoHp(item.no_hp ?? "");
  };

  const handleDelete = async (uid: string) => {
    const confirmDelete = confirm(
      "Yakin ingin menghapus data guru ini?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("guru")
      .delete()
      .eq("uid", uid);

    if (error) {
      alert(error.message);
      return;
    }

    reloadGuru();
  };

  const filteredGuru = guru.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      String(item.uid ?? "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.nama_lengkap ?? "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.no_hp ?? "")
        .toLowerCase()
        .includes(keyword)
    );
  });

  const sortedGuru = [...filteredGuru].sort((a, b) => {
    const aValue = String(a[sortKey] ?? "").toLowerCase();

    const bValue = String(b[sortKey] ?? "").toLowerCase();

    if (aValue < bValue)
      return sortDirection === "asc" ? -1 : 1;

    if (aValue > bValue)
      return sortDirection === "asc" ? 1 : -1;

    return 0;
  });

  const totalPages = Math.ceil(
    sortedGuru.length / ITEMS_PER_PAGE
  );

  const paginatedGuru = sortedGuru.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Kelola Guru
        </h1>

        <p className="text-gray-500 dark:text-gray-400">
          Tambah, edit, dan hapus data guru.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {editId ? "Edit Guru" : "Tambah Guru"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                UID Guru
              </label>

              <input
                type="text"
                placeholder="Contoh: G001"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                disabled={!!editId}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
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
                onChange={(e) =>
                  setNamaLengkap(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nomor HP
              </label>

              <input
                type="text"
                placeholder="Contoh: 081395671763"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={18} />

                {saving
                  ? "Menyimpan..."
                  : editId
                  ? "Update"
                  : "Tambah"}
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

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Data Guru
            </h2>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Cari guru..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
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
                      onClick={() =>
                        handleSort("uid")
                      }
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      UID
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() =>
                        handleSort(
                          "nama_lengkap"
                        )
                      }
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Nama Lengkap
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={() =>
                        handleSort("no_hp")
                      }
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      No HP
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
                ) : paginatedGuru.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Data guru belum ada.
                    </td>
                  </tr>
                ) : (
                  paginatedGuru.map(
                    (item, index) => (
                      <tr
                        key={item.uid}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {(page - 1) *
                            ITEMS_PER_PAGE +
                            index +
                            1}
                        </td>

                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                          {item.uid}
                        </td>

                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {item.nama_lengkap}
                        </td>

                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {item.no_hp}
                        </td>

                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  item
                                )
                              }
                              className="rounded-lg bg-yellow-100 p-2 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  item.uid
                                )
                              }
                              className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total data: {filteredGuru.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() =>
                  setPage((prev) => prev - 1)
                }
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Sebelumnya
              </button>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {page} / {totalPages || 1}
              </span>

              <button
                type="button"
                disabled={
                  page === totalPages ||
                  totalPages === 0
                }
                onClick={() =>
                  setPage((prev) => prev + 1)
                }
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