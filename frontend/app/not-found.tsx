import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-gray-800 mb-4">404</p>
        <h2 className="text-white text-xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-gray-400 text-sm mb-8">The page you are looking for does not exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">
            Go to Dashboard
          </Link>
          <Link href="/"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}