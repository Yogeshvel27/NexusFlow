"use client";

import { Fragment } from "react";
import { useOrganization, useAuth } from "@clerk/nextjs";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Layers, Activity, AlertTriangle, ShieldAlert, Users, DollarSign,
  CheckCircle2, Briefcase, ArrowUpRight, Calendar, MoreHorizontal,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { StatusChip, statusTone } from "@/components/status-chip";
import { ProgressBar } from "@/components/progress-bar";
import {
  kpis, revenueTrend, statusDist, utilizationData,
  milestones, activities, approvals, projects, formatCurrency,
} from "@/lib/mock";



const tooltipStyle = {
  background: "white",
  border: "1px solid #E7E5E4",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(28,25,23,0.08)",
};

function Dashboard() {
  const { organization } = useOrganization();
  const { orgRole } = useAuth();
  
  const canCreate = !orgRole || 
    orgRole.toLowerCase().includes("admin") || 
    orgRole.toLowerCase().includes("project_manager") || 
    orgRole.toLowerCase().includes("department_head");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">Portfolio Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">Executive overview · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          {organization && (
            <div className="flex items-center gap-2 bg-sidebar border border-sidebar-border rounded-xl px-3 py-1.5 self-start mt-1.5 shadow-sm">
              {organization.imageUrl ? (
                <img src={organization.imageUrl} className="size-5 rounded object-cover" alt="" />
              ) : (
                <div className="size-5 rounded bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                  {organization.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-white">{organization.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary inline-flex items-center gap-2"><Calendar className="size-4" />Last 30 days</button>
          {canCreate && (
            <button className="h-9 px-3.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2">New project<ArrowUpRight className="size-4" /></button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Projects" value={kpis.totalProjects} delta={8.2} hint="vs last quarter" icon={<Briefcase className="size-4" />} />
        <KpiCard label="Active Projects" value={kpis.activeProjects} delta={4.1} hint="in progress" icon={<Layers className="size-4" />} accent="primary" />
        <KpiCard label="Delayed" value={kpis.delayedProjects} delta={-2.3} hint="needs attention" icon={<AlertTriangle className="size-4" />} accent="danger" />
        <KpiCard label="Open Risks" value={kpis.openRisks} delta={1.4} hint="across portfolio" icon={<ShieldAlert className="size-4" />} accent="warning" />
        <KpiCard label="Utilization" value={`${kpis.utilization}%`} delta={3.6} hint="firm-wide" icon={<Activity className="size-4" />} accent="success" />
        <KpiCard label="Revenue YTD" value={formatCurrency(kpis.revenue)} delta={12.4} hint="vs target" icon={<DollarSign className="size-4" />} accent="primary" />
        <KpiCard label="Pending Approvals" value={kpis.pendingApprovals} delta={-12} hint="this week" icon={<CheckCircle2 className="size-4" />} accent="warning" />
        <KpiCard label="Resources Allocated" value={kpis.allocated} delta={2.1} hint="of 401" icon={<Users className="size-4" />} accent="muted" />
      </div>

      {/* Revenue + Status */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Revenue Trend</div>
              <div className="mt-1 flex items-baseline gap-3">
                <div className="text-2xl font-semibold tabular-nums">{formatCurrency(kpis.revenue)}</div>
                <span className="text-xs font-medium text-emerald-600">+12.4% YoY</span>
              </div>
            </div>
            <div className="flex gap-1 p-1 bg-secondary rounded-lg text-xs">
              {["1M", "3M", "6M", "1Y", "All"].map((p) => (
                <button key={p} className={`px-2.5 py-1 rounded-md ${p === "1Y" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={revenueTrend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C67C4E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#C67C4E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                <XAxis dataKey="m" stroke="#A8A29E" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#A8A29E" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v}k`} />
                <Area type="monotone" dataKey="target" stroke="#D4A373" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
                <Area type="monotone" dataKey="revenue" stroke="#C67C4E" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Project Status</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{statusDist.reduce((a, b) => a + b.value, 0)}</div>
          <div className="h-48 mt-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusDist} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                  {statusDist.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {statusDist.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: s.color }} /><span>{s.name}</span></div>
                <span className="tabular-nums font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Utilization + Risk Heatmap */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Department Utilization</div>
              <div className="text-sm text-muted-foreground mt-0.5">Billable vs non-billable hours</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={utilizationData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                <XAxis dataKey="dept" stroke="#A8A29E" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#A8A29E" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="billable" stackId="a" fill="#C67C4E" radius={[0, 0, 0, 0]} />
                <Bar dataKey="nonBillable" stackId="a" fill="#D4A373" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Risk Heatmap</div>
          <div className="text-sm text-muted-foreground mt-0.5 mb-4">Probability × Impact</div>
          <div className="grid grid-cols-6 gap-1.5">
            <div />
            {["Low", "Med", "High", "Crit", "Sev"].map((l) => <div key={l} className="text-[10px] text-center text-muted-foreground">{l}</div>)}
            {["High", "Med", "Low"].map((prob, r) => (
              <Fragment key={prob}>
                <div className="text-[10px] text-muted-foreground text-right pr-1 flex items-center justify-end">{prob}</div>
                {[0, 1, 2, 3, 4].map((c) => {
                  const intensity = (r === 0 ? 4 : r === 1 ? 3 : 2) + c;
                  const v = Math.min(9, intensity);
                  const count = Math.max(0, Math.round((v - 2) * 1.4 + (r === 0 && c >= 3 ? 2 : 0)));
                  const bg = v <= 4 ? `rgba(34,197,94,${0.15 + v * 0.05})`
                    : v <= 6 ? `rgba(245,158,11,${0.15 + (v - 4) * 0.12})`
                    : `rgba(239,68,68,${0.2 + (v - 6) * 0.18})`;
                  return (
                    <div key={`${r}-${c}`} className="aspect-square rounded-md grid place-items-center text-xs font-semibold tabular-nums" style={{ background: bg }}>
                      {count}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border space-y-2.5">
            {[
              { l: "Critical", v: 3, c: "bg-red-500" },
              { l: "High", v: 7, c: "bg-orange-500" },
              { l: "Medium", v: 9, c: "bg-amber-500" },
              { l: "Low", v: 4, c: "bg-emerald-500" },
            ].map((r) => (
              <div key={r.l} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${r.c}`} />{r.l}</div>
                <span className="tabular-nums font-medium">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects progress + milestones */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-border">
            <div className="font-semibold">Project Progress Overview</div>
            <button className="text-xs font-medium text-primary hover:underline">View all</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-6 py-3">Project</th>
                <th className="text-left font-medium px-3 py-3">Status</th>
                <th className="text-left font-medium px-3 py-3 w-[28%]">Progress</th>
                <th className="text-right font-medium px-6 py-3">Due</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 6).map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40 transition">
                  <td className="px-6 py-3.5">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.id} · {p.client}</div>
                  </td>
                  <td className="px-3 py-3.5"><StatusChip tone={statusTone(p.status)}>{p.status}</StatusChip></td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={p.progress} tone={p.status === "Delayed" ? "danger" : p.status === "At Risk" ? "warning" : "primary"} />
                      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right text-muted-foreground">{p.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Upcoming Milestones</div>
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {milestones.map((m) => (
              <div key={m.name} className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 grid place-items-center shrink-0">
                  <div className="text-[10px] font-medium text-primary uppercase">{m.date.split(" ")[0]}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.project}</div>
                </div>
                <StatusChip tone={statusTone(m.status)}>{m.status}</StatusChip>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activities + Approvals */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-border">
            <div className="font-semibold">Approval Requests</div>
            <button className="text-xs font-medium text-primary hover:underline">Open queue</button>
          </div>
          <div className="divide-y divide-border">
            {approvals.map((a) => (
              <div key={a.id} className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/40 transition">
                <div className="size-10 rounded-xl bg-secondary grid place-items-center text-xs font-semibold text-muted-foreground">{a.id.slice(-3)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.type} · <span className="text-muted-foreground font-normal">{a.project}</span></div>
                  <div className="text-xs text-muted-foreground">Requested by {a.requester} · {a.submitted}</div>
                </div>
                {a.amount > 0 && <div className="text-sm font-semibold tabular-nums">{formatCurrency(a.amount)}</div>}
                <StatusChip tone={statusTone(a.stage)}>{a.stage}</StatusChip>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="font-semibold mb-4">Recent Activity</div>
          <div className="space-y-4 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
            {activities.map((a, i) => (
              <div key={i} className="relative flex items-start gap-3">
                <div className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-semibold text-white ring-4 ring-card">
                  {a.who.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="text-sm"><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.what}</span></div>
                  <div className="text-xs text-foreground/70 truncate">{a.target}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{a.when} ago</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
