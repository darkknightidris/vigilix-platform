import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { orgName, plan, price, method, senderName, userEmail, userId } = await req.json()

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "noreply@vigilix.id",
        to: "idris092004@vigilix.id",
        subject: `[PEMBAYARAN] ${orgName} - Plan ${plan.toUpperCase()} - ${price}`,
        html: `
          <h2>Konfirmasi Pembayaran Masuk</h2>
          <table>
            <tr><td><strong>Organisasi</strong></td><td>${orgName}</td></tr>
            <tr><td><strong>Plan</strong></td><td>${plan.toUpperCase()}</td></tr>
            <tr><td><strong>Jumlah</strong></td><td>${price}</td></tr>
            <tr><td><strong>Metode</strong></td><td>${method}</td></tr>
            <tr><td><strong>Nama Pengirim</strong></td><td>${senderName}</td></tr>
            <tr><td><strong>Email User</strong></td><td>${userEmail}</td></tr>
            <tr><td><strong>User ID</strong></td><td>${userId}</td></tr>
          </table>
          <hr/>
          <p>Jalankan SQL ini untuk aktifkan plan:</p>
          <pre>UPDATE organizations SET plan = '${plan}' WHERE id = (SELECT organization_id FROM profiles WHERE id = '${userId}');</pre>
        `
      })
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
