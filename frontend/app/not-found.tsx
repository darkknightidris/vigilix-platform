import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-700 mb-4">404</p>
        <p className="text-white font-medium mb-2">Halaman tidak ditemukan</p>
        <Link href="/dashboard" className="text-blue-400 hover:underline text-sm">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  )
}