"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Download, FileText, FileSpreadsheet, BarChart3, Users, 
  DollarSign, ShieldAlert, Activity, X, ArrowUpRight, 
  CheckCircle2, AlertTriangle, Layers, Briefcase, Wallet 
} from "lucide-react";
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, 
  CartesianGrid, PieChart, Pie, Cell 
} from "recharts";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { 
  projects as mockProjects, 
  resources as mockResources, 
  risks as mockRisks, 
  approvals as mockApprovals 
} from "@/lib/mock";

// Static definitions
const reportTypes = [
  { name: "Project Portfolio Summary", desc: "Executive overview of all active projects, status & velocity", icon: BarChart3, tag: "Executive" },
  { name: "Resource Utilization Report", desc: "Billable rates, capacity & department performance", icon: Activity, tag: "Operations" },
  { name: "Revenue & Profitability", desc: "Financial KPIs, project margins & forecast vs actual", icon: DollarSign, tag: "Finance" },
  { name: "Risk Posture Assessment", desc: "Open risks, mitigation effectiveness, escalation trends", icon: ShieldAlert, tag: "Risk" },
  { name: "Resource Allocation Map", desc: "Heatmap of allocation, conflicts & bench availability", icon: Users, tag: "Operations" },
  { name: "Workflow & Approvals Audit", desc: "Cycle time analysis & approval bottlenecks", icon: BarChart3, tag: "Governance" },
];

function Reports() {
  const { 
    projects: dbProjects, 
    tasks: dbTasks,
    resources,
    risks,
    approvals
  } = useWorkspace();

  // Selected Report State
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute live portfolio metrics
  const stats = useMemo(() => {
    const totalProjects = dbProjects.length || 87;
    const activeProjects = dbProjects.filter(p => p.status === "In Progress" || p.status === "Approved" || p.status === "Pending Approval").length || 64;
    const delayedProjects = dbProjects.filter(p => p.status === "Delayed" || p.status === "On Hold").length || 12;
    const onTrackProjects = Math.max(0, totalProjects - delayedProjects) || 64;
    const atRiskProjects = dbProjects.filter(p => p.status === "Pending Approval" || p.status === "Draft").length || 18;

    const avgUtil = resources.length > 0 
      ? Math.round(resources.reduce((sum, r) => sum + (r.util || 0), 0) / resources.length) 
      : 78;

    return {
      totalProjects,
      activeProjects,
      delayedProjects,
      onTrackProjects,
      atRiskProjects,
      utilization: avgUtil
    };
  }, [dbProjects, resources]);

  // Chart Data showing live budget allocations by department
  const departmentBudgetChartData = useMemo(() => {
    const map: Record<string, number> = {};
    dbProjects.forEach(p => {
      const dept = p.department || "Operations";
      map[dept] = (map[dept] || 0) + (p.budget || 0);
    });

    const entries = Object.entries(map).map(([name, val]) => ({
      m: name.substring(0, 8),
      v: Math.round(val / 1000)
    }));

    if (entries.length === 0) {
      return [
        { m: "Eng", v: 380 }, { m: "Design", v: 440 }, { m: "Product", v: 410 },
        { m: "Data", v: 520 }, { m: "QA", v: 580 }, { m: "DevOps", v: 640 },
      ];
    }
    return entries.slice(0, 6);
  }, [dbProjects]);

  // Excel Multi-sheet Exporter
  const handleExportExcel = () => {
    try {
      console.log("DEBUG handleExportExcel: dbProjects =", dbProjects);
      console.log("DEBUG handleExportExcel: resources =", resources);
      console.log("DEBUG handleExportExcel: risks =", risks);
      console.log("DEBUG handleExportExcel: approvals =", approvals);

      const exportProjects = (dbProjects && dbProjects.length > 0 ? dbProjects : mockProjects) as any[];
      const exportResources = (resources && resources.length > 0 ? resources : mockResources.map(r => {
        let costRate = 75;
        let billingRate = 150;
        if (r.role.includes("Manager") || r.role.includes("Architect") || r.role.includes("Director") || r.role.includes("Lead")) {
          costRate = 95;
          billingRate = 180;
        } else if (r.status === "Bench") {
          costRate = 55;
          billingRate = 110;
        }
        return {
          id: r.id,
          name: r.name,
          role: r.role,
          dept: r.dept,
          util: r.util,
          costRate,
          billingRate,
          status: r.status,
          allocations: []
        };
      })) as any[];
      const exportRisks = (risks && risks.length > 0 ? risks : mockRisks) as any[];
      const exportApprovals = (approvals && approvals.length > 0 ? approvals : mockApprovals) as any[];

      const wb = XLSX.utils.book_new();

      // 1. Project Portfolio Summary
      const sheet1 = XLSX.utils.json_to_sheet(
        exportProjects.map(p => ({
          "Project Code": p.code || p.id,
          "Name": p.name,
          "Client": p.client,
          "Department": p.department || "Engineering",
          "Budget ($)": p.budget,
          "Spent ($)": p.spent,
          "Manager": p.projectManager || p.owner || "Unassigned",
          "Status": p.status
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet1, "Project Portfolio Summary");

      // 2. Resource Utilization Report
      const sheet2 = XLSX.utils.json_to_sheet(
        exportResources.map(r => ({
          "Resource Name": r.name,
          "Role": r.role,
          "Department": r.dept,
          "Utilization %": r.util || 0,
          "Cost Rate ($/hr)": r.costRate || 0,
          "Billing Rate ($/hr)": r.billingRate || 0,
          "Status": r.status
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet2, "Resource Utilization Report");

      // 3. Revenue & Profitability
      const sheet3 = XLSX.utils.json_to_sheet(
        exportProjects.map(p => ({
          "Project Name": p.name,
          "Budget ($)": p.budget,
          "Actual Spent ($)": p.spent,
          "Margin / Buffer ($)": p.budget - p.spent,
          "Burn Rate %": p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet3, "Revenue & Profitability");

      // 4. Risk Posture Assessment
      const sheet4 = XLSX.utils.json_to_sheet(
        exportRisks.map(r => ({
          "Risk Name": r.name,
          "Description": r.description || `Assessment of ${r.project}`,
          "Project Link": r.project,
          "Severity": r.severity,
          "Probability": r.probability || "Medium",
          "Owner": r.owner || "PMO",
          "Status": r.status
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet4, "Risk Posture Assessment");

      // 5. Resource Allocation Map
      const sheet5Data: any[] = [];
      exportResources.forEach(r => {
        if (r.allocations && r.allocations.length > 0) {
          r.allocations.forEach((alloc: any) => {
            sheet5Data.push({
              "Resource Name": r.name,
              "Role": r.role,
              "Department": r.dept,
              "Project Name": alloc.projectName || alloc.projectId || "Assigned Project",
              "Allocation %": alloc.allocationPercent || 0,
              "Allocation Role": alloc.role || r.role
            });
          });
        } else if (r.allocation && r.allocation > 0) {
          sheet5Data.push({
            "Resource Name": r.name,
            "Role": r.role,
            "Department": r.dept,
            "Project Name": "Assigned Project",
            "Allocation %": r.allocation,
            "Allocation Role": r.role
          });
        } else {
          sheet5Data.push({
            "Resource Name": r.name,
            "Role": r.role,
            "Department": r.dept,
            "Project Name": "Bench",
            "Allocation %": 0,
            "Allocation Role": "None"
          });
        }
      });
      const sheet5 = XLSX.utils.json_to_sheet(sheet5Data);
      XLSX.utils.book_append_sheet(wb, sheet5, "Resource Allocation Map");

      // 6. Workflow & Approvals Audit
      const sheet6 = XLSX.utils.json_to_sheet(
        exportApprovals.map(a => ({
          "Type": a.type,
          "Project Link": a.project,
          "Requester": a.requester,
          "Value ($)": a.amount,
          "Submitted Date": a.submitted,
          "Stage / Status": a.stage
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet6, "Workflow & Approvals Audit");

      XLSX.writeFile(wb, "NexusFlow_Full_Portfolio_Report.xlsx");
      toast.success("Excel portfolio report downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel report.");
    }
  };



  const tooltipStyle = {
    background: "#1C1917",
    border: "1px solid #E7E5E4",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#FAFAF9"
  };

  return (
    <div className="space-y-6">
      {/* Print-specific style block */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main reporting view container */}
      <div id="print-area" className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap no-print">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Interactive executive reporting center</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportExcel} 
              className="h-10 px-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary inline-flex items-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="size-4" />Excel
            </button>
          </div>
        </div>

        {/* Print Header (Only visible during print) */}
        <div className="hidden print:block border-b border-stone-800 pb-4 mb-6">
          <div className="text-stone-900 font-bold text-2xl">NEXUSFLOW ENTERPRISE PORTFOLIO REPORT</div>
          <div className="text-stone-500 text-xs mt-1">Generated on {mounted ? new Date().toLocaleString() : ""}</div>
        </div>

        <div className="bg-gradient-to-br from-sidebar to-stone-900 text-white rounded-2xl p-6 shadow-elevated">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-white/50">Executive Summary · Live Portfolio</div>
              <div className="mt-2 text-3xl font-semibold">Portfolio is trending <span className="text-accent">+12.4% YoY</span></div>
              <p className="mt-2 text-sm text-white/60 max-w-xl">
                {stats.totalProjects} active projects · {stats.onTrackProjects} on-track · {stats.atRiskProjects} at-risk · {stats.delayedProjects} delayed · Utilization at {stats.utilization}%, exceeding target limits.
              </p>
              <button 
                onClick={handleExportExcel} 
                className="mt-4 h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2 hover:opacity-90 transition cursor-pointer no-print"
              >
                <Download className="size-4" />Download full report
              </button>
            </div>
            <div className="h-36 w-full md:w-96">
              <ResponsiveContainer>
                <BarChart data={departmentBudgetChartData}>
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

        {/* Report Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
          {reportTypes.map((r) => {
            const Icon = r.icon;
            return (
              <div 
                key={r.name} 
                onClick={() => setSelectedReport(r.name)}
                className="group bg-card border border-border rounded-2xl p-6 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 grid place-items-center">
                    <Icon className="size-5 text-primary" />
                  </div>
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

      {/* Interactive Detail Modal Drawer */}
      {selectedReport && (
        <div 
          onClick={() => setSelectedReport(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-elevated animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-lg">{selectedReport}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Live reporting sub-ledger view</p>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="size-8 rounded-full hover:bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedReport === "Project Portfolio Summary" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Project Records</span>
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">{dbProjects.length} Projects</span>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-secondary/50 text-muted-foreground">
                        <tr>
                          <th className="p-3">Code / Name</th>
                          <th className="p-3">Client</th>
                          <th className="p-3 text-right">Budget</th>
                          <th className="p-3 text-right">Spent</th>
                          <th className="p-3">Manager</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dbProjects.map((p) => (
                          <tr key={p.id} className="hover:bg-secondary/35 transition">
                            <td className="p-3">
                              <span className="font-bold text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded text-muted-foreground mr-1.5">{p.code}</span>
                              <span className="font-medium text-foreground">{p.name}</span>
                            </td>
                            <td className="p-3 text-muted-foreground">{p.client}</td>
                            <td className="p-3 text-right font-semibold">${(p.budget || 0).toLocaleString()}</td>
                            <td className="p-3 text-right text-muted-foreground">${(p.spent || 0).toLocaleString()}</td>
                            <td className="p-3">{p.projectManager}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === "Completed" ? "bg-green-500/10 text-green-500" :
                                p.status === "Delayed" ? "bg-red-500/10 text-red-500" :
                                p.status === "In Progress" ? "bg-blue-500/10 text-blue-500" :
                                "bg-amber-500/10 text-amber-500"
                              }`}>{p.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedReport === "Resource Utilization Report" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Staff Allocation & Utilization</span>
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">{resources.length} Active Resources</span>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-secondary/50 text-muted-foreground">
                        <tr>
                          <th className="p-3">Resource Name</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Department</th>
                          <th className="p-3 text-center">Utilization</th>
                          <th className="p-3 text-right">Cost Rate</th>
                          <th className="p-3 text-right">Billing Rate</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {resources.map((r) => (
                          <tr key={r.id} className="hover:bg-secondary/35 transition">
                            <td className="p-3 font-semibold text-foreground">{r.name}</td>
                            <td className="p-3 text-muted-foreground">{r.role}</td>
                            <td className="p-3 uppercase font-bold text-[10px] text-muted-foreground">{r.dept}</td>
                            <td className="p-3 text-center font-bold tabular-nums" style={{ color: r.util > 100 ? "#EF4444" : r.util > 75 ? "#22C55E" : "#F59E0B" }}>
                              {r.util}%
                            </td>
                            <td className="p-3 text-right text-muted-foreground">${r.costRate}/hr</td>
                            <td className="p-3 text-right font-semibold">${r.billingRate}/hr</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === "Available" || r.status === "Bench" ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                              }`}>{r.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedReport === "Revenue & Profitability" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-secondary/15 border border-border p-4 rounded-xl">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Portfolio Budget</div>
                      <div className="text-xl font-bold text-foreground mt-1">
                        ${dbProjects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-secondary/15 border border-border p-4 rounded-xl">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Spent to Date</div>
                      <div className="text-xl font-bold text-primary mt-1">
                        ${dbProjects.reduce((sum, p) => sum + (p.spent || 0), 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-secondary/15 border border-border p-4 rounded-xl">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Current Profit Buffer</div>
                      <div className="text-xl font-bold text-green-500 mt-1">
                        ${(dbProjects.reduce((sum, p) => sum + (p.budget || 0), 0) - dbProjects.reduce((sum, p) => sum + (p.spent || 0), 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-secondary/50 text-muted-foreground">
                        <tr>
                          <th className="p-3">Project</th>
                          <th className="p-3 text-right">Budget</th>
                          <th className="p-3 text-right">Actual Spent</th>
                          <th className="p-3 text-right">Margin / Buffer</th>
                          <th className="p-3 text-center">Burn Rate %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dbProjects.map((p) => {
                          const margin = p.budget - p.spent;
                          const burnRate = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
                          return (
                            <tr key={p.id} className="hover:bg-secondary/35 transition">
                              <td className="p-3 font-semibold">{p.name}</td>
                              <td className="p-3 text-right">${(p.budget || 0).toLocaleString()}</td>
                              <td className="p-3 text-right text-muted-foreground">${(p.spent || 0).toLocaleString()}</td>
                              <td className="p-3 text-right font-bold" style={{ color: margin < 0 ? "#EF4444" : "#22C55E" }}>
                                ${margin.toLocaleString()}
                              </td>
                              <td className="p-3 text-center font-semibold tabular-nums">{burnRate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedReport === "Risk Posture Assessment" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Risk Registry Matrix</span>
                    <span className="text-xs bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full font-bold">{risks.length} Registered Risks</span>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-secondary/50 text-muted-foreground">
                        <tr>
                          <th className="p-3">Risk Name</th>
                          <th className="p-3">Project Link</th>
                          <th className="p-3">Severity</th>
                          <th className="p-3">Probability</th>
                          <th className="p-3">Owner</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {risks.map((r) => (
                          <tr key={r.id} className="hover:bg-secondary/35 transition">
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{r.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{r.description}</div>
                            </td>
                            <td className="p-3 text-muted-foreground">{r.project}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.severity === "Critical" || r.severity === "High" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                              }`}>{r.severity}</span>
                            </td>
                            <td className="p-3 text-muted-foreground">{r.probability || "Medium"}</td>
                            <td className="p-3">{r.owner || "PMO"}</td>
                            <td className="p-3 font-semibold">{r.status}</td>
                          </tr>
                        ))}
                        {risks.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-muted-foreground italic">No risks logged.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedReport === "Resource Allocation Map" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Project Team Allocation Registry</span>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-secondary/50 text-muted-foreground">
                        <tr>
                          <th className="p-3">Resource</th>
                          <th className="p-3">Assigned Projects & Allocations</th>
                          <th className="p-3 text-center">Net Load</th>
                          <th className="p-3">Department</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {resources.map((r) => (
                          <tr key={r.id} className="hover:bg-secondary/35 transition">
                            <td className="p-3">
                              <div className="font-semibold">{r.name}</div>
                              <div className="text-[10px] text-muted-foreground">{r.role}</div>
                            </td>
                            <td className="p-3">
                              <div className="space-y-1">
                                {r.allocations && r.allocations.length > 0 ? (
                                  r.allocations.map((alloc: any, i: number) => (
                                    <div key={i} className="text-[11px] text-muted-foreground flex items-center justify-between bg-secondary/30 px-2 py-0.5 rounded border border-border/40">
                                      <span className="font-medium text-foreground">{alloc.projectName}</span>
                                      <span>{alloc.allocationPercent}% ({alloc.role})</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-amber-500 italic">Bench (0% allocation)</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold tabular-nums">{r.util}%</td>
                            <td className="p-3 uppercase font-bold text-[10px] text-muted-foreground">{r.dept}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedReport === "Workflow & Approvals Audit" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Approval Audit Trail</span>
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">{approvals.length} Requests</span>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-secondary/50 text-muted-foreground">
                        <tr>
                          <th className="p-3">Type</th>
                          <th className="p-3">Project Link</th>
                          <th className="p-3">Requester</th>
                          <th className="p-3 text-right">Value ($)</th>
                          <th className="p-3">Submitted</th>
                          <th className="p-3">Stage / Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {approvals.map((a) => (
                          <tr key={a.id} className="hover:bg-secondary/35 transition">
                            <td className="p-3 font-semibold text-foreground">{a.type}</td>
                            <td className="p-3 text-muted-foreground">{a.project}</td>
                            <td className="p-3">{a.requester}</td>
                            <td className="p-3 text-right font-semibold">
                              {a.amount > 0 ? `$${a.amount.toLocaleString()}` : "N/A"}
                            </td>
                            <td className="p-3 text-muted-foreground">{a.submitted}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                a.stage === "Approved" ? "bg-green-500/10 text-green-500" :
                                a.stage === "Rejected" ? "bg-red-500/10 text-red-500" :
                                "bg-amber-500/10 text-amber-500"
                              }`}>{a.stage}</span>
                            </td>
                          </tr>
                        ))}
                        {approvals.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-muted-foreground italic">No approval logs found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between no-print">
              <span className="text-xs text-muted-foreground">Secure Enterprise Ledger Control Portal</span>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportExcel}
                  className="h-9 px-3 rounded-xl border border-border text-xs font-semibold hover:bg-secondary inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="size-3.5" />Export Excel
                </button>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="h-9 px-4 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
