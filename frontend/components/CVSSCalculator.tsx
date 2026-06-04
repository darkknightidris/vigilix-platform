"use client"
import { useState, useEffect } from "react"

const metrics = {
  AV: { label: "Attack Vector", options: [["N","Network",0.85],["A","Adjacent",0.62],["L","Local",0.55],["P","Physical",0.2]] },
  AC: { label: "Attack Complexity", options: [["L","Low",0.77],["H","High",0.44]] },
  PR: { label: "Privileges Required", options: [["N","None",0.85],["L","Low",0.62],["H","High",0.27]] },
  UI: { label: "User Interaction", options: [["N","None",0.85],["R","Required",0.62]] },
  S:  { label: "Scope", options: [["U","Unchanged"],["C","Changed"]] },
  C:  { label: "Confidentiality", options: [["N","None",0],["L","Low",0.22],["H","High",0.56]] },
  I:  { label: "Integrity", options: [["N","None",0],["L","Low",0.22],["H","High",0.56]] },
  A:  { label: "Availability", options: [["N","None",0],["L","Low",0.22],["H","High",0.56]] },
}

function calcCVSS(sel: Record<string,string>) {
  const get = (m: string) => (metrics[m as keyof typeof metrics].options.find((o:any) => o[0] === sel[m]) as any)?.[2] ?? 0
  const AV=get("AV"),AC=get("AC"),UI=get("UI"),C=get("C"),I=get("I"),A=get("A")
  let PR=get("PR")
  const scope = sel["S"]
  if (scope === "C") { const prMap:any={N:0.85,L:0.68,H:0.5}; PR=prMap[sel["PR"]]??PR }
  const ISS = 1 - (1-C)*(1-I)*(1-A)
  let IS = scope==="U" ? 6.42*ISS : 7.52*(ISS-0.029) - 3.25*Math.pow(ISS-0.02,15)
  const ES = 8.22*AV*AC*PR*UI
  if (IS <= 0) return 0
  let score = scope==="U" ? Math.min(IS+ES,10) : Math.min(1.08*(IS+ES),10)
  return Math.round(score*10)/10
}

function getSeverity(score: number) {
  if (score === 0) return { label: "None", color: "text-gray-400" }
  if (score < 4) return { label: "Low", color: "text-blue-400" }
  if (score < 7) return { label: "Medium", color: "text-yellow-400" }
  if (score < 9) return { label: "High", color: "text-orange-400" }
  return { label: "Critical", color: "text-red-400" }
}

export default function CVSSCalculator({ onChange }: { onChange?: (score: number, vector: string, severity: string) => void }) {
  const [sel, setSel] = useState<Record<string,string>>({ AV:"N",AC:"L",PR:"N",UI:"N",S:"U",C:"N",I:"N",A:"N" })
  const [score, setScore] = useState(0)

  useEffect(() => {
    const s = calcCVSS(sel)
    const vector = `CVSS:3.1/AV:${sel.AV}/AC:${sel.AC}/PR:${sel.PR}/UI:${sel.UI}/S:${sel.S}/C:${sel.C}/I:${sel.I}/A:${sel.A}`
    const sev = getSeverity(s)
    setScore(s)
    onChange?.(s, vector, sev.label)
  }, [sel])

  const sev = getSeverity(score)

  return (
    <div className="p-5 bg-gray-800/50 rounded-xl border border-gray-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">CVSS v3.1 Calculator</h3>
        <div className="text-right">
          <span className={`text-2xl font-bold ${sev.color}`}>{score.toFixed(1)}</span>
          <span className={`ml-2 text-sm font-medium ${sev.color}`}>{sev.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(metrics).map(([key, m]) => (
          <div key={key}>
            <label className="block text-xs text-gray-400 mb-1">{m.label}</label>
            <div className="flex gap-1 flex-wrap">
              {m.options.map((opt: any) => (
                <button key={opt[0]} onClick={() => setSel(p => ({...p, [key]: opt[0]}))}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    sel[key] === opt[0]
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}>
                  {opt[1]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}