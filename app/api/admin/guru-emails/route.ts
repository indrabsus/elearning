// app/api/admin/guru-emails/route.ts

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, uid_guru")
      .not("uid_guru", "is", null)

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers()

    if (usersError) {
      return NextResponse.json(
        { error: usersError.message },
        { status: 400 }
      )
    }

    const result = profiles.map((profile) => {
      const user = usersData.users.find(
        (item) => item.id === profile.id
      )

      return {
        uid_guru: String(profile.uid_guru),
        email: user?.email ?? null,
      }
    })

    return NextResponse.json({
      data: result,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Server error",
      },
      { status: 500 }
    )
  }
}