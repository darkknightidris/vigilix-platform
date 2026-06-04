"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Vuln {
  id: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
}

interface AnalyticsData {
  totalOpen: number;
  totalResolved: number;
  mttrDays: number | null;
  mttrBySeverity: { severity: string; mttr: number }[];
  trendData: { month: string; critical: number; high: number; medium: number; low: number }[];
  severityDist: { name: string; value: number; color: string }[];
  statusDist: { name: string; value: number }[];
  riskScore: number;
  slaBreached: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  info: "#3b82f6",
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

function diffDays(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function computeAnalytics(vulns: Vuln[]): AnalyticsData {
  const open = vulns.filter((v) => v.status !== "resolved" && v.status !== "closed");
  const resolved = vulns.filter((v) => v.resolved_at);

  const mttrDays =
    resolved.length > 0
      ? resolved.reduce((sum, v) => sum + diffDays(v.created_at, v.resolved_at!), 0) / resolved.length
      : null;

  const mttrBySeverity = SEVERITY_ORDER.map((sev) => {
    const group = resolved.filter((v) => v.severity?.toLowerCase() === sev);
    if (group.length === 0) return null;
    const avg = group.reduce((sum, v) => sum + diffDays(v.created_at, v.resolved_at!), 0) / group.length;
    return { severity: sev.charAt(0).toUpperCase() + sev.slice(1), mttr: Math.round(avg) };
  }).filter(Boolean) as { severity: string; mttr: number }[];

  const now = new Date();
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString("id-ID", { month: "short", year: "2-digit" });
    const monthVulns = vulns.filter((v) => {
      const cd = new Date(v.created_at);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    });
    return {
      month: label,
      critical: monthVulns.filter((v) => v.severity?.toLowerCase() === "critical").length,
      high: monthVulns.filter((v) => v.severity?.toLowerCase() === "high").length,
      medium: monthVulns.filter((v) => v.severity?.toLowerCase() === "medium").length,
      low: monthVulns.filter((v) => v.severity?.toLowerCase() === "low").length,
    };
  });

  const severityDist = SEVERITY_ORDER.map((sev) => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: vulns.filter((v) => v.severity?.toLowerCase() === sev).length,
    color: SEVERITY_COLORS[sev],
  })).filter((d) => d.value > 0);

  const statusMap: Record<string, number> = {};
  vulns.forEach((v) => {
    const s = v.status || "unknown";
    statusMap[s] = (statusMap[s] || 0) + 1;
  });
  const statusDist = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const weights: Record<string, number> = { critical: 10, high: 7, medium: 4, low: 1 };
  const rawScore = open.reduce((sum, v) => sum + (weights[v.severity?.toLowerCase()] || 0), 0);
  const riskScore = Math.min(100, Math.round((rawScore / Math.max(open.length * 10, 1)) * 100));

  const slaDays: Record<string, number> = { critical: 7, high: 14, medium: 30, low: 90 };
  const slaBreached = open.filter((v) => {
    const limit = slaDays[v.severity?.toLowerCase()] || 90;
    return diffDays(v.created_at, new Date().toISOString()) > limit;
  }).length;

  return { totalOpen: open.length, totalResolved: resolved.length, mttrDays, mttrBySeverity, trendData, severityDist, statusDist, riskScore, slaBreached };
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#0f1117] border border-[#1e2330] rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-bold tabular-nums ${accent ?? "text-white"}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

function RiskGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#ef4444" : score >= 50 ? "#f97316" : score >= 25 ? "#eab308" : "#22c55e";
  const label = score >= 80 ? "Kritis" : score >= 50 ? "Tinggi" : score >= 25 ? "Sedang" : "Rendah";
  const R = 54; const cx = 70; const cy = 70;
  const startAngle = -210; const sweepAngle = 240;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcX = (a: number) => cx + R * Math.cos(toRad(a));
  const arcY = (a: number) => cy + R * Math.sin(toRad(a));
  const bgPath = `M ${arcX(startAngle)} ${arcY(startAngle)} A ${R} ${R} 0 1 1 ${arcX(startAngle + sweepAngle)} ${arcY(startAngle + sweepAngle)}`;
  const fillAngle = startAngle + (sweepAngle * score) / 100;
  const large = (sweepAngle * score) / 100 > 180 ? 1 : 0;
  const fillPath = `M ${arcX(startAngle)} ${arcY(startAngle)} A ${R} ${R} 0 ${large} 1 ${arcX(fillAngle)} ${arcY(fillAngle)}`;
  return (
    <div className="bg-[#0f1117] border border-[#1e2330] rounded-xl p-5 flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Risk Score</span>
      <svg width="140" height="100" viewBox="0 0 140 100">
        <path d={bgPath} fill="none" stroke="#1e2330" strokeWidth="10" strokeLinecap="round" />
        <path d={fillPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
        <text x={cx} y={cy + 8} textAnchor="middle" fill="white" fontSize="22" fontWeight="700">{score}</text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

export default function AnalyticsDashboard({ projectId }: { projectId: string }) {
  const supabase = createClientComponentClient();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: vulns, error } = await supabase
        .from("vulnerabilities")
        .select("id, severity, status, created_at, resolved_at, updated_at")
        .eq("project_id", projectId);
      if (error || !vulns) { setLoading(false); return; }
      setData(computeAnalytics(vulns));
      setLoading(false);
    }
    load();
  }, [projectId, supabase]);

  if (loading) return <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Memuat analytics...</div>;
  if (!data) return <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Gagal memuat data.</div>;

  const mttrLabel = data.mttrDays != null ? `${Math.round(data.mttrDays)} hari` : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-blue-500 rounded-full" />
        <h2 className="text-lg font-semibold text-white">Analytics</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Open" value={data.totalOpen} sub="temuan aktif" accent="text-orange-400" />
        <StatCard label="Resolved" value={data.totalResolved} sub="sudah diselesaikan" accent="text-green-400" />
        <StatCard label="MTTR" value={mttrLabel} sub="rata-rata waktu resolve" accent="text-blue-400" />
        <StatCard label="SLA Breached" value={data.slaBreached} sub="melewati batas waktu" accent={data.slaBreached > 0 ? "text-red-400" : "text-green-400"} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <RiskGauge score={data.riskScore} />
        <div className="bg-[#0f1117] border border-[#1e2330] rounded-xl p-5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest block mb-3">MTTR per Severity (hari)</span>
          {data.mttrBySeverity.length === 0 ? <p className="text-zinc-500 text-sm">Belum ada data resolved.</p> : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={data.mttrBySeverity} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" />
                <XAxis dataKey="severity" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: 8 }} labelStyle={{ color: "#e4e4e7" }} itemStyle={{ color: "#a1a1aa" }} formatter={(v: number) => [`${v} hari`, "MTTR"]} />
                <Bar dataKey="mttr" radius={[4, 4, 0, 0]}>
                  {data.mttrBySeverity.map((entry) => (
                    <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity.toLowerCase()] ?? "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="bg-[#0f1117] border border-[#1e2330] rounded-xl p-5">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest block mb-4">Trend Temuan — 6 Bulan Terakhir</span>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data.trendData}>
            <defs>
              {["critical", "high", "medium", "low"].map((s) => (
                <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEVERITY_COLORS[s]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SEVERITY_COLORS[s]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" />
            <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: 8 }} labelStyle={{ color: "#e4e4e7" }} itemStyle={{ color: "#a1a1aa" }} />
            {["critical", "high", "medium", "low"].map((s) => (
              <Area key={s} type="monotone" dataKey={s} stroke={SEVERITY_COLORS[s]} fill={`url(#grad-${s})`} strokeWidth={2} dot={false} name={s.charAt(0).toUpperCase() + s.slice(1)} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#0f1117] border border-[#1e2330] rounded-xl p-5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest block mb-3">Distribusi Severity</span>
          {data.severityDist.length === 0 ? <p className="text-zinc-500 text-sm">Belum ada data.</p> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={data.severityDist} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                    {data.severityDist.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5">
                {data.severityDist.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-xs text-zinc-400">{entry.name}</span>
                    <span className="text-xs font-semibold text-white ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-[#0f1117] border border-[#1e2330] rounded-xl p-5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest block mb-3">Distribusi Status</span>
          {data.statusDist.length === 0 ? <p className="text-zinc-500 text-sm">Belum ada data.</p> : (
            <div className="space-y-2.5 mt-2">
              {data.statusDist.map((s) => {
                const total = data.statusDist.reduce((a, b) => a + b.value, 0);
                const pct = Math.round((s.value / total) * 100);
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 capitalize">{s.name.replace(/_/g, " ")}</span>
                      <span className="text-zinc-300 font-medium">{s.value} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#1e2330] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
