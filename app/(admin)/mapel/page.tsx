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

type Mapel = {
  id_mapel: string;
  nama_mapel: string | null;
  created_at?: string;
};

const ITEMS_PER_PAGE = 10;

const getMapelData = async (): Promise<Mapel[]> => {
  const { data, error } = await supabase
    .from("mapel")
    .select("*")
    .order("nama_mapel", { ascending: true });

  if (error) {
    console.error(error.message);
    return [];
  }

  return data ?? [];
};

export default function KelolaMapelPage() {
  const [mapel, setMapel] = useState<Mapel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [namaMapel, setNamaMapel] = useState("");

  const [editId, setEditId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] =
    useState<keyof Mapel>("nama_mapel");
  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("asc");

  const reloadMapel = async () => {
    setLoading(true);
    const data = await getMapelData();
    setMapel(data);
    setLoading(false);
  };

  useEffect(() => {
    reloadMapel();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const resetForm = () => {
    setNamaMapel("");
    setEditId(null);
  };

  const handleSort = (key: keyof Mapel) => {
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

    if (!namaMapel) {
      alert("Nama mapel wajib diisi");
      return;
    }

    setSaving(true);

    if (editId) {
      const { error } = await supabase
        .from("mapel")
        .update({
          nama_mapel: namaMapel,
        })
        .eq("id_mapel", editId);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("mapel")
        .insert({
          nama_mapel: namaMapel,
        });

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    resetForm();
    reloadMapel();
  };

  const handleEdit = (item: Mapel) => {
    setEditId(item.id_mapel);
    setNamaMapel(item.nama_mapel ?? "");
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Yakin ingin menghapus mapel ini?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("mapel")
      .delete()
      .eq("id_mapel", id);

    if (error) {
      alert(error.message);
      return;
    }

    reloadMapel();
  };

  const filteredMapel = mapel.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      String(item.nama_mapel ?? "")
        .toLowerCase()
        .includes(keyword) ||
      String(item.id_mapel ?? "")
        .toLowerCase()
        .includes(keyword)
    );
  });

  const sortedMapel = [...filteredMapel].sort((a, b) => {
    const aValue = String(a[sortKey] ?? "").toLowerCase();
    const bValue = String(b[sortKey] ?? "").toLowerCase();

    if (aValue < bValue) {
      return sortDirection === "asc" ? -1 : 1;
    }

    if (aValue > bValue) {
      return sortDirection === "asc" ? 1 : -1;
    }

    return 0;
  });

  const totalPages = Math.ceil(
    sortedMapel.length / ITEMS_PER_PAGE
  );

  const paginatedMapel = sortedMapel.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Kelola Mapel
        </h1>

        <p className="text-gray-500 dark:text-gray-400">
          Tambah, edit, dan hapus mata pelajaran.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {editId ? "Edit Mapel" : "Tambah Mapel"}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nama Mapel
              </label>

              <input
                type="text"
                placeholder="Contoh: Bahasa Inggris"
                value={namaMapel}
                onChange={(e) =>
                  setNamaMapel(e.target.value)
                }
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
              Data Mapel
            </h2>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Cari mapel..."
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
                        handleSort("nama_mapel")
                      }
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                    >
                      Nama Mapel
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
                      colSpan={3}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : paginatedMapel.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Data mapel belum ada.
                    </td>
                  </tr>
                ) : (
                  paginatedMapel.map((item, index) => (
                    <tr
                      key={item.id_mapel}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {(page - 1) * ITEMS_PER_PAGE +
                          index +
                          1}
                      </td>

                      <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                        {item.nama_mapel}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(item)
                            }
                            className="rounded-lg bg-yellow-100 p-2 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                item.id_mapel
                              )
                            }
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
              Total data: {filteredMapel.length}
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