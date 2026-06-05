import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const orgId = formData.get("orgId") as string
    const name = formData.get("name") as string
    const removeLogo = formData.get("removeLogo") === "true"
    const logoFile = formData.get("logoFile") as File | null

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 })

    let newLogoUrl: string | null = formData.get("currentLogoUrl") as string | null

    if (logoFile && logoFile.size > 0) {
      const ext = logoFile.name.split(".").pop()
      const path = `${orgId}/logo.${ext}`
      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const { error: uploadErr } = await supabase.storage
        .from("org-logos")
        .upload(path, buffer, { upsert: true, contentType: logoFile.type })
      if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })
      const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path)
      newLogoUrl = urlData.publicUrl + `?t=${Date.now()}`
    }

    if (removeLogo) {
      for (const e of ["png","jpg","jpeg","webp"]) {
        await supabase.storage.from("org-logos").remove([`${orgId}/logo.${e}`])
      }
      newLogoUrl = null
    }

    const { error } = await supabase
      .from("organizations")
      .update({ name, logo_url: newLogoUrl })
      .eq("id", orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, logoUrl: newLogoUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
