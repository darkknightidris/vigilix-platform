"use client"
import { useState } from "react"

export default function ShareReportButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [expiryDays, setExpiryDays] = useState("7")

  const handleCreate = async () => {
    setLoading(true)
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        expires_in_days: expiryDays ? parseInt(expiryDays) : null
      }),
    })
    const data = await res.json()
    setShareUrl(data.url || "")
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button onClick={() => setShowModal(true)}
        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
        🔗 Share
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => { setShowModal(false); setShareUrl("") }}>
          <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-semibold text-lg mb-2">Share Read-Only Report</h2>
            <p className="text-gray-400 text-sm mb-6">
              Generate a public link to share this report. Viewers can only read — no edits allowed.
            </p>

            {!shareUrl ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Link expires in</label>
                  <select value={expiryDays} onChange={e => setExpiryDays(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="">Never expires</option>
                  </select>
                </div>
                <button onClick={handleCreate} disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
                  {loading ? "Generating..." : "Generate Share Link"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">
                  ✅ Share link created! Expires in {expiryDays || "never"} {expiryDays ? "days" : ""}.
                </div>
                <div className="flex gap-2">
                  <input type="text" value={shareUrl} readOnly
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none" />
                  <button onClick={handleCopy}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition shrink-0">
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <button onClick={() => { setShareUrl(""); setShowModal(false) }}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-400 transition">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}