"use client"
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <p className="text-red-400 font-medium mb-2">Terjadi kesalahan</p>
        <p className="text-gray-400 text-sm mb-4">{error.message}</p>
        <button onClick={reset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">
          Coba Lagi
        </button>
      </div>
    </div>
  )
}