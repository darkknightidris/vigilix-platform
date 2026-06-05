import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getAISuggestion(vuln: any, plan: string) {
  const prompt = `You are a security expert. Analyze this vulnerability and provide a detailed fix recommendation in Bahasa Indonesia.

Vulnerability Details:
- Title: ${vuln.title}
- Severity: ${vuln.severity}
- CVSS Score: ${vuln.cvss_score || "N/A"}
- Description: ${vuln.description || "No description"}
- Affected Component: ${vuln.affected_component || "N/A"}

Provide:
1. **Ringkasan Masalah** - Jelaskan vulnerability ini
2. **Dampak** - Apa yang bisa terjadi jika tidak difix
3. **Langkah Fix** - Step by step cara memperbaiki
4. **Kode Contoh** - Contoh implementasi fix (jika relevan)
5. **Referensi** - OWASP atau CVE yang relevan

Jawab dalam Bahasa Indonesia yang jelas dan teknikal.`

  if (plan === "team") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }]
      })
    })
    const data = await response.json()
    return data.content[0].text

  } else if (plan === "pro") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    })
    const data = await response.json()
    return data.content[0].text

  } else {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    })
    const data = await response.json()
    return data.choices[0].message.content
  }
}

export async function POST(req: NextRequest) {
  try {
    const { vulnId, userId } = await req.json()

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single()

    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: org } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", profile.organization_id)
      .single()

    const plan = org?.plan || "free"

    const { data: vuln } = await supabase
      .from("vulnerabilities")
      .select("*")
      .eq("id", vulnId)
      .single()

    if (!vuln) return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 })

    const suggestion = await getAISuggestion(vuln, plan)

    return NextResponse.json({ suggestion, model: plan === "team" ? "Claude Sonnet" : plan === "pro" ? "Claude Haiku" : "Llama 3.3" })

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
