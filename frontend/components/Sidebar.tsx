"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/billing", label: "Billing", icon: "💳" },
  { href: "/settings", label: "Settings", icon: "⚙" },
  { href: "/audit-log", label: "Audit Log", icon: "📋" },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-white font-bold text-lg tracking-tight">Vigilix</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active ? "bg-blue-600 text-white font-medium" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
