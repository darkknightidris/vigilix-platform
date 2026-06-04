"use client"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

const COLORS = { critical:"#dc2626", high:"#f97316", medium:"#eab308", low:"#3b82f6", info:"#6b7280" }

export default function SeverityChart({ data }: { data: Record<string,number> }) {
  const chartData = Object.entries(data)
    .filter(([,v]) => v > 0)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))

  if (chartData.length === 0) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-gray-500 text-sm">Belum ada data temuan</p>
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
          paddingAngle={3} dataKey="value">
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "#6b7280"} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, "Temuan"]}
          contentStyle={{ background:"#1f2937", border:"1px solid #374151", borderRadius:"8px", color:"#fff" }} />
        <Legend formatter={(value) => <span style={{color:"#9ca3af",fontSize:"12px"}}>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}