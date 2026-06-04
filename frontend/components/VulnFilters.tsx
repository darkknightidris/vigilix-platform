"use client"
import { useState, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

const severities = ["all","critical","high","medium","low","info"]
const statuses = ["all","open","in_progress","fixed","closed"]

export default function VulnFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentSeverity = searchParams.get("severity") || "all"
  const currentStatus = searchParams.get("status") || "all"
  const currentSearch = searchParams.get("q") || ""
  const [search, setSearch] = useState(currentSearch)

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all" || value === "") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter("q", search)
  }

  const severityColors: Record<string,string> = {
    all:"bg-gray-700 text-white",
    critical:"bg-red-600 text-white",high:"bg-orange-500 text-white",
    medium:"bg-yellow-500 text-white",low:"bg-blue-500 text-white",info:"bg-gray-500 text-white"
  }

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari temuan..."
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500" />
        <button type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">
          Cari
        </button>
        {(currentSearch || currentSeverity !== "all" || currentStatus !== "all") && (
          <button type="button" onClick={() => { setSearch(""); router.push(pathname) }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
            Reset
          </button>
        )}
      </form>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center">Severity:</span>
        {severities.map(s => (
          <button key={s} onClick={() => updateFilter("severity", s)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
              currentSeverity === s
                ? severityColors[s] || "bg-gray-700 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}>
            {s === "all" ? "Semua" : s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center">Status:</span>
        {statuses.map(s => (
          <button key={s} onClick={() => updateFilter("status", s)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
              currentStatus === s
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}>
            {s === "all" ? "Semua" : s.replace("_"," ")}
          </button>
        ))}
      </div>
      {isPending && <p className="text-xs text-gray-500">Memfilter...</p>}
    </div>
  )
}