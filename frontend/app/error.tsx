"use client"
import { useEffect } from "react"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-6">⚠️</p>
        <h2 className="text-white text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-2">{error.message || "An unexpected error occurred."}</p>
        {error.digest && <p className="text-gray-600 text-xs mb-6">Error ID: {error.digest}</p>}
        <div className="flex gap-3 justify-center">
          <button onClick={reset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">
            Try Again
          </button>
          <Link href="/dashboard"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}