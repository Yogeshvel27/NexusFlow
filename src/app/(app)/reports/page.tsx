"use client";


import { Download, FileText, FileSpreadsheet, FileCode, BarChart3, Users, DollarSign, ShieldAlert, Activity } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";



const reports = [
  { name: "Project Portfolio Summary", desc: "Executive overview of all active projects, status & velocity", icon: BarChart3, tag: "Executive" },
  { name: "Resource Utilization Report", desc: "Billable rates, capacity & department performance", icon: Activity, tag: "Operations" },
  { name: "Revenue & Profitability", desc: "Financial KPIs, project margins & forecast vs actual", icon: DollarSign, tag: "Finance" },
  { name: "Risk Posture Assessment", desc: "Open risks, mitigation effectiveness, escalation trends", icon: ShieldAlert, tag: "Risk" },
  { name: "Resource Allocation Map", desc: "Heatmap of allocation, conflicts & bench availability", icon: Users, tag: "Operations" },
  { name: "Workflow & Approvals Audit", desc: "Cycle time analysis & approval bottlenecks", icon: BarChart3, tag: "Governance" },
];

const data = [
  { m: "Jul", v: 38 }, { m: "Aug", v: 44 }, { m: "Sep", v: 41 },
  { m: "Oct", v: 52 }, { m: "Nov", v: 58 }, { m: "Dec", v: 64 },
];

function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Interactive executive reporting center</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary inline-flex items-center gap-2"><FileText className="size-4" />PDF</button>
          <button className="h-10 px-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary inline-flex items-center gap-2"><FileSpreadsheet className="size-4" />Excel</button>
          <button className="h-10 px-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary inline-flex items-center gap-2"><FileCode className="size-4" />CSV</button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-sidebar to-stone-900 text-white rounded-2xl p-6 shadow-elevated">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-white/50">Executive Summary · December 2025</div>
            <div className="mt-2 text-3xl font-semibold">Portfolio is trending <span className="text-accent">+12.4% YoY</span></div>
            <p className="mt-2 text-sm text-white/60 max-w-xl">87 active projects · 64 on-track · 18 at-risk · 12 delayed · Utilization at 78%, exceeding plan by 3.6 points.</p>
            <button className="mt-4 h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2"><Download className="size-4" />Download full report</button>
          </div>
          <div className="h-36 w-full md:w-96">
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="m" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#1C1917", border: "none", borderRadius: 8, fontSize: 12, color: "white" }} />
                <Bar dataKey="v" fill="#C67C4E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.name} className="group bg-card border border-border rounded-2xl p-6 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="size-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 grid place-items-center"><Icon className="size-5 text-primary" /></div>
                <span className="px-2.5 py-1 rounded-full bg-secondary text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{r.tag}</span>
              </div>
              <div className="font-semibold">{r.name}</div>
              <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Updated 2h ago</span>
                <span className="font-medium text-primary group-hover:underline">Open report →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Reports;
