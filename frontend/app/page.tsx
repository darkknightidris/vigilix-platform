import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* NAVBAR */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-xl">🛡️</span>
            <span className="font-bold text-lg">Vigilix</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">
              Login
            </Link>
            <Link href="/register"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-blue-400 text-xs font-medium mb-6">
            🌏 Dibuat untuk Tim Security di Asia Tenggara & Seluruh Dunia
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Ubah Laporan Pentest yang Menumpuk
            <span className="text-blue-400"> Jadi Dashboard yang Bisa Dieksekusi</span>
          </h1>
          <p className="text-xl text-gray-400 mb-4 max-w-2xl mx-auto leading-relaxed">
            Kalau CEO tanya <span className="text-white font-medium">&quot;Kondisi keamanan kita gimana hari ini?&quot;</span> — tim kamu bisa jawab dalam 10 detik. Bukan PDF ratusan halaman. Bukan spreadsheet yang berdebu.
          </p>
          <p className="text-sm text-gray-500 mb-10">
            🇮🇩 Indonesia · 🇲🇾 Malaysia · 🇸🇬 Singapore · 🇵🇭 Philippines · 🇹🇭 Thailand · and beyond
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition">
              Start 30-Day Free Trial →
            </Link>
            <a href="#features"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-lg transition">
              See Features
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-4">No credit card required · Setup in 2 minutes · Cancel anytime</p>
        </div>
      </section>

      {/* STATS */}
      <section className="px-6 py-12 border-y border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value:"30 Days", label:"Free Trial" },
              { value:"< Rp 500K", label:"Starting price/month" },
              { value:"5 min", label:"Setup time" },
              { value:"100%", label:"Data isolated per org" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-blue-400">{s.value}</p>
                <p className="text-gray-400 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Still Managing Findings in Spreadsheets?</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Most security teams in Asia waste 3–5 hours per week just managing vulnerability data.
            Enterprise tools cost thousands per year — way too much for growing teams.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon:"😰", title:"Spreadsheets don't scale", desc:"No CVSS calculator, no status tracking, no audit trail. Sharing with clients is a nightmare." },
              { icon:"💸", title:"Enterprise tools are overpriced", desc:"Jira, Snyk, Tenable — $100–$1,000+/month. Built for Fortune 500, priced for Fortune 500." },
              { icon:"🌐", title:"Not built for Southeast Asia", desc:"USD pricing, no local payment methods, no support in your timezone. Vigilix changes that." },
            ].map(item => (
              <div key={item.title} className="p-6 bg-gray-900 rounded-xl border border-gray-800">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 py-20 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything Your Security Team Needs</h2>
          <p className="text-gray-400 text-center mb-12">Built by bug hunters and pentesters who know what actually matters.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon:"🔢", title:"CVSS v3.1 Calculator", desc:"Calculate severity scores directly in your finding form. No more switching between tabs." },
              { icon:"📋", title:"Kanban Board", desc:"Drag & drop findings from Open → In Progress → Fixed → Closed. Visual status at a glance." },
              { icon:"📄", title:"PDF Report Generator", desc:"One-click professional executive summary report. Ready to send to clients immediately." },
              { icon:"📥", title:"Burp Suite CSV Import", desc:"Import findings directly from Burp Suite Scanner export. No manual re-entry." },
              { icon:"👥", title:"Multi-tenant Team Collaboration", desc:"Invite team members, assign findings, set deadlines. Full org isolation with RLS." },
              { icon:"🔒", title:"Enterprise-grade Security", desc:"Row-Level Security ensures each organization's data is completely isolated." },
              { icon:"📊", title:"Dashboard Analytics", desc:"Severity breakdown charts, open vs fixed tracking, project-level insights." },
              { icon:"🌏", title:"Southeast Asia First", desc:"Local payment methods (VA, QRIS, FPX), competitive pricing in local currencies." },
            ].map(f => (
              <div key={f.title} className="flex gap-4 p-5 bg-gray-900 rounded-xl border border-gray-800">
                <div className="text-3xl shrink-0">{f.icon}</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IS IT FOR */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Who Uses Vigilix?</h2>
          <p className="text-gray-400 text-center mb-12">From solo bug hunters to enterprise security teams.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon:"🎯", title:"Bug Hunters", desc:"Manage and report findings from HackerOne, Bugcrowd, and private programs." },
              { icon:"🔍", title:"Pentest Teams", desc:"Structure client deliverables and generate professional reports fast." },
              { icon:"🏢", title:"IT Security Officers", desc:"Track remediation progress across your organization's assets." },
              { icon:"🛡️", title:"MSSPs", desc:"Manage multiple clients with complete data isolation per tenant." },
            ].map(u => (
              <div key={u.title} className="p-5 bg-gray-900 rounded-xl border border-gray-800 text-center">
                <div className="text-4xl mb-3">{u.icon}</div>
                <h3 className="text-white font-semibold mb-2">{u.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-6 py-20 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Vigilix vs. The Alternatives</h2>
          <p className="text-gray-400 text-center mb-12">Why security teams in Southeast Asia choose Vigilix.</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Feature</th>
                  <th className="text-center py-3 px-4 text-blue-400 font-bold">Vigilix</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium text-sm">Spreadsheet</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium text-sm">Jira</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium text-sm">Snyk/Tenable</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ["CVSS v3.1 Calculator", "✅", "❌", "❌", "✅"],
                  ["Pentest-focused workflow", "✅", "❌", "❌", "✅"],
                  ["PDF Report Generator", "✅", "❌", "❌", "✅"],
                  ["Burp Suite Import", "✅", "❌", "❌", "Partial"],
                  ["Local payment (VA/QRIS/FPX)", "✅", "N/A", "❌", "❌"],
                  ["Affordable for SEA teams", "✅", "✅", "❌", "❌"],
                  ["Multi-tenant isolation", "✅", "❌", "Partial", "✅"],
                  ["Setup in < 5 minutes", "✅", "✅", "❌", "❌"],
                ].map(([feature, ...vals]) => (
                  <tr key={feature as string} className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-300">{feature}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`py-3 px-4 text-center ${
                        v === "✅" ? "text-green-400" :
                        v === "❌" ? "text-red-400 opacity-50" :
                        v === "N/A" ? "text-gray-600" : "text-yellow-400"
                      }`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 text-center mb-2">Priced for Southeast Asian teams. No USD surprises.</p>
          <p className="text-gray-500 text-center text-sm mb-12">
            🇮🇩 IDR · 🇲🇾 MYR (coming soon) · 🇸🇬 SGD (coming soon)
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name:"Free Trial", price:"Rp 0", period:"30 days",
                color:"border-gray-700", btnClass:"bg-gray-700 hover:bg-gray-600",
                features:["1 project","3 users","All features included","No credit card required"],
                cta:"Start Free Trial", href:"/register"
              },
              {
                name:"Pro", price:"Rp 499K", period:"/month",
                color:"border-blue-500", btnClass:"bg-blue-600 hover:bg-blue-700", popular:true,
                features:["5 projects","10 users","PDF export","CSV import","Email notifications","Priority support"],
                cta:"Get Pro", href:"/register"
              },
              {
                name:"Team", price:"Rp 1.2jt", period:"/month",
                color:"border-purple-500", btnClass:"bg-purple-600 hover:bg-purple-700",
                features:["Unlimited projects","Unlimited users","API access","SSO (coming soon)","Audit logs","Dedicated support"],
                cta:"Get Team", href:"/register"
              },
            ].map(plan => (
              <div key={plan.name} className={`relative p-6 bg-gray-900 rounded-xl border-2 ${plan.color}`}>
                {(plan as any).popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                  </div>
                )}
                <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}
                  className={`block w-full py-2.5 text-center text-white font-medium rounded-lg transition ${plan.btnClass}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm mt-6">
            All prices in IDR. MYR and SGD pricing coming soon. Enterprise pricing available on request.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-20 bg-gray-900/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q:"Is my data secure?", a:"Yes. Each organization's data is completely isolated using Row-Level Security (RLS) in PostgreSQL. No other tenant can access your data, ever." },
              { q:"Can I use Vigilix as a freelance bug hunter?", a:"Absolutely. The Free Trial and Pro plans are perfect for individual bug hunters managing findings from HackerOne, Bugcrowd, Intigriti, and private programs." },
              { q:"What payment methods are available?", a:"We support bank transfer (Virtual Account), QRIS, and credit cards via Xendit for Indonesian customers. MYR and SGD payment methods coming soon for Malaysia and Singapore." },
              { q:"Can I generate reports to send to clients?", a:"Yes. All paid plans include one-click PDF report generation with executive summary, severity breakdown, and full finding details — ready to send to clients professionally." },
              { q:"How is Vigilix different from Jira or Snyk?", a:"Vigilix is purpose-built for security findings — it includes a CVSS v3.1 calculator, security-focused kanban workflow, Burp Suite import, and professional PDF reports. At a fraction of the cost, priced for Southeast Asian teams." },
              { q:"Is there a self-hosted option?", a:"Not yet, but it's on our roadmap for enterprise customers who require on-premise deployment. Contact us for early access." },
              { q:"What languages is Vigilix available in?", a:"Currently the interface supports both English and Bahasa Indonesia. Additional Southeast Asian languages are planned." },
            ].map(item => (
              <div key={item.q} className="p-5 bg-gray-900 rounded-xl border border-gray-800">
                <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to Manage Vulnerabilities the Right Way?</h2>
          <p className="text-gray-400 mb-2">Join security teams across Southeast Asia and beyond.</p>
          <p className="text-gray-500 text-sm mb-8">
            🇮🇩 Indonesia · 🇲🇾 Malaysia · 🇸🇬 Singapore · 🇵🇭 Philippines · 🌏 Worldwide
          </p>
          <Link href="/register"
            className="inline-block px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg transition">
            Start Free Trial — No Credit Card Required →
          </Link>
          <p className="text-gray-500 text-sm mt-4">30-day trial · Full access · Cancel anytime</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🛡️</span>
            <span className="font-bold">Vigilix</span>
            <span className="text-gray-500 text-sm ml-2">Vulnerability Management for Security Teams</span>
          </div>
          <div className="flex items-center gap-6 text-gray-500 text-sm">
            <span>🌏 Southeast Asia Focused</span>
            <span>🌐 Available Worldwide</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 Vigilix. Made with ❤️ in Southeast Asia</p>
        </div>
      </footer>

    </div>
  )
}
