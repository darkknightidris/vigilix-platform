# Vigilix — Vulnerability Management Platform

> Ubah laporan pentest yang menumpuk jadi dashboard yang bisa dieksekusi.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square)

**Live:** [vigilix.id](https://vigilix.id)

---

## Masalah yang Diselesaikan

Tim IT security Indonesia selama ini terjebak di antara dua pilihan buruk:

- **Jira** — terlalu kompleks dan mahal untuk tim kecil
- **Spreadsheet** — tidak bisa tracking SLA dan remediation dengan benar
- **Snyk / Archer** — enterprise tools yang jauh dari jangkauan startup lokal

Vigilix hadir sebagai alternatif yang terjangkau, fokus, dan dibuat untuk konteks Indonesia.

---

## Fitur

| Fitur | Keterangan |
|-------|-----------|
| 🔐 Auth + 2FA TOTP | Login aman dengan two-factor authentication |
| 🏢 Multi-tenant | Setiap organisasi terisolasi penuh via RLS |
| 📋 CRUD Vulnerabilities | Tambah, edit, hapus, filter temuan keamanan |
| 🧮 CVSS v3.1 Calculator | Hitung severity score langsung di platform |
| 📊 Kanban Board | Drag-drop tracking status remediation |
| 📄 PDF Report Generator | Export laporan dengan logo perusahaan |
| ⏱️ SLA Countdown | Deadline tracking otomatis per temuan |
| 🔔 Webhook | Notifikasi ke Slack, Discord, dan Teams |
| 🔑 REST API + API Key | Integrasi dengan tools lain |
| 📜 Audit Log | Riwayat semua aktivitas + export CSV |
| 📧 Email Welcome | Otomatis via Resend saat user baru daftar |
| ✅ Bulk Action | Select, update status, delete massal |

---

## Stack

```
Frontend  : Next.js 15 + TypeScript → Vercel
Backend   : FastAPI (Python) → Railway
Database  : Supabase (PostgreSQL + Auth + RLS)
Email     : Resend
```

---

## Struktur Project

```
vigilix-platform/
├── frontend/          # Next.js 15 app
│   ├── app/
│   │   ├── (auth)/           # Login, Register
│   │   ├── (dashboard)/      # Projects, Vulnerabilities, Settings
│   │   └── api/              # API routes
│   ├── components/
│   └── lib/supabase/
├── backend/           # FastAPI
│   └── app/
│       ├── main.py
│       ├── routers/          # register, api_keys, audit_log
│       ├── pdf_generator.py
│       └── scheduler.py      # Cron + webhook
└── supabase/
    ├── 01_schema.sql
    └── 02_rls.sql
```

---

## Harga

| Plan | Harga | Fitur |
|------|-------|-------|
| Free Trial | Rp 0 / 30 hari | Semua fitur |
| Pro | Rp 499.000 / bulan | 5 project, 10 user, PDF report |
| Team | Rp 1.200.000 / bulan | Unlimited project & user, API, Audit log |

---

## Menjalankan Lokal

```bash
# Frontend
cd frontend
cp .env.example .env.local   # isi dengan credentials kamu
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Environment variables yang dibutuhkan:**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_API_URL=
```

---

## Roadmap

- [x] Auth + 2FA TOTP
- [x] Multi-tenant dengan RLS
- [x] CVSS v3.1 calculator
- [x] Kanban board drag-drop
- [x] PDF report generator
- [x] Webhook Slack/Discord/Teams
- [x] REST API publik + API key
- [x] Audit log + export CSV
- [x] Email welcome via Resend
- [ ] SSO / SAML
- [ ] Scanner integration (Nessus, OpenVAS)
- [ ] Dashboard analytics (MTTR, trend severity)
- [ ] Asset management
- [ ] Compliance mapping (OWASP Top 10, ISO 27001)

---

## Developer

Dibangun oleh [darkknightidris](https://github.com/darkknightidris) — bug bounty hunter aktif dari Batam, Indonesia.
Active on HackerOne, Intigriti, Bugcrowd, YesWeHack.

---

> *"Spreadsheet tidak cukup. Jira terlalu besar. Vigilix pas."*
