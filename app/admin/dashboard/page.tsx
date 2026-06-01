"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Layers3,
  Users,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type DashboardStats = {
  totalGuru: number;
  totalSiswa: number;
  totalKelas: number;
  totalMapel: number;
};

export default function AdminDashboardPage() {
  const [namaTahunAjaran, setNamaTahunAjaran] = useState("");

  const [stats, setStats] = useState<DashboardStats>({
    totalGuru: 0,
    totalSiswa: 0,
    totalKelas: 0,
    totalMapel: 0,
  });

  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    const getDashboardStats = async () => {
      setLoading(true);

      const tahunNama =
        localStorage.getItem("nama_tahun_ajaran") || "";

      setNamaTahunAjaran(tahunNama);

      const [guru, siswa, kelas, mapel] = await Promise.all([
        supabase.from("guru").select("*", { count: "exact", head: true }),
        supabase.from("siswa").select("*", { count: "exact", head: true }),
        supabase.from("kelas").select("*", { count: "exact", head: true }),
        supabase.from("mapel").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalGuru: guru.count ?? 0,
        totalSiswa: siswa.count ?? 0,
        totalKelas: kelas.count ?? 0,
        totalMapel: mapel.count ?? 0,
      });

      setLoading(false);
    };

    getDashboardStats();
  }, []);

  const cards = [
    {
      title: "Total Guru",
      value: stats.totalGuru,
      icon: Users,
      desc: "Data guru aktif",
    },
    {
      title: "Total Siswa",
      value: stats.totalSiswa,
      icon: GraduationCap,
      desc: "Data siswa aktif",
    },
    {
      title: "Total Kelas",
      value: stats.totalKelas,
      icon: Layers3,
      desc: "Kelola kelas sekolah",
    },
    {
      title: "Total Mapel",
      value: stats.totalMapel,
      icon: BookOpen,
      desc: "Mata pelajaran tersedia",
    },
  ];

  const menus = [
    {
      title: "Kelola Kelas",
      desc: "Tambah, edit, dan hapus data kelas.",
      href: "/admin/kelas",
      icon: Layers3,
    },
    {
      title: "Kelola Mapel",
      desc: "Atur mata pelajaran untuk e-learning.",
      href: "/admin/mapel",
      icon: BookOpen,
    },
    {
      title: "Kelola Guru",
      desc: "Kelola data guru dan akun pengajar.",
      href: "/admin/guru",
      icon: Users,
    },
    {
      title: "Kelola Siswa",
      desc: "Kelola data siswa dan kelasnya.",
      href: "/admin/siswa",
      icon: GraduationCap,
    },
    {
      title: "Pembagian Mengajar",
      desc: "Hubungkan guru dengan mapel dan kelas.",
      href: "/admin/pembagian-mengajar",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-6">

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {card.title}
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-gray-800 dark:text-white">
                    {loading ? "..." : card.value}
                  </h2>
                </div>

                <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                  <Icon size={24} />
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {card.desc}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Menu Admin
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <Link
                key={menu.href}
                href={menu.href}
                className="group block rounded-2xl border border-gray-200 p-5 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-gray-100 p-3 text-gray-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-gray-800 dark:text-gray-200">
                    <Icon size={22} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      {menu.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {menu.desc}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}