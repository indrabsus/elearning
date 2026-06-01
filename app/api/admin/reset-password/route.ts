import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { uid } = await req.json()

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("uid_guru", uid)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: "Guru belum memiliki akun" },
        { status: 404 }
      )
    }

    const { error } =
      await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        {
          password: "123456",
        }
      )

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch {
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    )
  }
}