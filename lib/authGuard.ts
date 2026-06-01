// lib/authGuard.ts
import { supabase } from "@/lib/supabase"

export async function requireRole(role: "admin" | "guru" | "siswa") {
  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) {
    return { ok: false, redirect: "/" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single()

  if (!profile || profile.role !== role) {
    return { ok: false, redirect: "/" }
  }

  return { ok: true, redirect: null }
}