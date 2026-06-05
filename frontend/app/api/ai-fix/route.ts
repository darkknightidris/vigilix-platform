import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    const groqKey = process.env.GROQ_API_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { vulnId, userId } = await req.json()

    const { data: profile } = await supabase
      .from("profiles").select("organization_id").eq("id", userId).single()

    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: org } = await supabase
      .from("organizations").select("plan").eq("id", profile.organization_id).single()

    const plan = org?.plan || "free"

    const { data: vuln } = await supabase
      .from("vulnerabilities").select("*").eq("id", vulnId).single()

    if (!vuln) return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 })

    const prompt = `Kamu adalah security expert. Analisis vulnerability berikut dan berikan rekomendasi fix yang detail dalam Bahasa Indonesia.

Detail Vulnerability:
- Judul: ${vuln.title}
- Severity: ${vuln.severity}
- CVSS Score: ${vuln.cvss_score || "N/A"}
- Deskripsi: ${vuln.description || "Tidak ada deskripsi"}
- Komponen terdampak: ${vuln.affected_component || "N/A"}

Berikan:
1. Ringkasan Masalah - Jelaskan vulnerability ini
2. Dampak - Apa yang bisa terjadi jika tidak difix
3. Langkah Fix - Step by step cara memperbaiki
4. Contoh Kode - Contoh implementasi fix jika relevan
5. Referensi - OWASP atau CVE yang relevan`

    let suggestion = ""
    let modelName = ""

    if (plan === "team" && anthropicKey) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      })
      const data = await response.json()
      suggestion = data.content?.[0]?.text || "Gagal mendapat respons"
      modelName = "Claude Sonnet"

    } else if (plan === "pro" && anthropicKey) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      })
      const data = await response.json()
      suggestion = data.content?.[0]?.text || "Gagal mendapat respons"
      modelName = "Claude Haiku"

    } else if (groqKey) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      })
      const data = await response.json()
      suggestion = data.choices?.[0]?.message?.content || "Gagal mendapat respons"
      modelName = "Llama 3.3"
    } else {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 })
    }

    return NextResponse.json({ suggestion, model: modelName })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
