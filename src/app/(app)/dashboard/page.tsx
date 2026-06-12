"use client";

import React, { Fragment, useState, useEffect, useMemo } from "react";
import { useOrganization, useAuth, useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabase } from "@/lib/supabase";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Layers, Activity, AlertTriangle, ShieldAlert, Users, DollarSign,
  CheckCircle2, Briefcase, ArrowUpRight, Calendar, MoreHorizontal, Clock, Cpu, Wallet
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { StatusChip, statusTone } from "@/components/status-chip";
import { ProgressBar } from "@/components/progress-bar";
import {
  revenueTrend, utilizationData, milestones, activities, approvals, formatCurrency
} from "@/lib/mock";

const tooltipStyle = {
  background: "white",
  border: "1px solid #E7E5E4",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(28,25,23,0.08)",
};

const probLabels = ["Rare", "Unlikely", "Possible", "Likely", "Certain"];
const impLabels = ["Insignif.", "Minor", "Moderate", "Major", "Severe"];

function Dashboard() {
  const { organization } = useOrganization();
  const { orgRole } = useAuth();
  const { user } = useUser();
  const { 
    projects: dbProjects, 
    tasks: dbTasks,
    resources,
    risks,
    approvals: dbApprovals,
    approvalAuditLogs,
    projectAuditLogs,
    workItemActivityLogs
  } = useWorkspace();

  // Role State
  const [userRole, setUserRole] = useState<string>("Project Manager");

  const dbMilestones = useMemo(() => {
    return dbTasks.filter(item => item.type === "Task" && item.tags && item.tags.includes("Milestone"));
  }, [dbTasks]);

  const dbActivities = useMemo(() => {
    const activitiesList: any[] = [];
    const projectMap = new Map((dbProjects || []).map(p => [p.id, p.name]));

    if (approvalAuditLogs) {
      approvalAuditLogs.forEach(au => {
        activitiesList.push({
          who: au.user_name || "Unknown User",
          what: au.action || "performed action",
          target: au.comment || "Approval Request",
          timestamp: au.timestamp || new Date().toISOString()
        });
      });
    }

    if (projectAuditLogs) {
      projectAuditLogs.forEach(pa => {
        const projName = projectMap.get(pa.project_id) || "Unknown Project";
        activitiesList.push({
          who: pa.user_name || "Unknown User",
          what: (pa.from_status && pa.to_status) ? `changed status from ${pa.from_status} to ${pa.to_status}` : (pa.comment || "updated project"),
          target: projName,
          timestamp: pa.timestamp || new Date().toISOString()
        });
      });
    }

    if (workItemActivityLogs) {
      workItemActivityLogs.forEach(ta => {
        activitiesList.push({
          who: ta.user_name || "Unknown User",
          what: ta.action || "updated task",
          target: ta.work_item_id || "Task",
          timestamp: ta.timestamp || new Date().toISOString()
        });
      });
    }

    if (activitiesList.length > 0) {
      activitiesList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const getRelativeTime = (timestampStr: string) => {
        if (!timestampStr) return "now";
        const now = new Date();
        const past = new Date(timestampStr);
        const diffMs = now.getTime() - past.getTime();
        if (isNaN(diffMs) || diffMs < 0) return "now";
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "now";
        if (diffMins < 60) return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d`;
      };

      return activitiesList.map(act => ({
        who: act.who,
        what: act.what,
        target: act.target,
        when: getRelativeTime(act.timestamp)
      }));
    }
    return [];
  }, [dbProjects, approvalAuditLogs, projectAuditLogs, workItemActivityLogs]);

  // Fetch role
  useEffect(() => {
    async function fetchUserRole() {
      if (user?.primaryEmailAddress?.emailAddress) {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("email", user.primaryEmailAddress.emailAddress)
          .maybeSingle();
        if (data && !error) {
          setUserRole(data.role);
        }
      }
    }
    fetchUserRole();
  }, [user]);

  // Effective role: use Supabase role or Clerk organization role
  const activeRole = useMemo(() => {
    // Map Clerk organization roles if available
    if (orgRole) {
      const lower = orgRole.toLowerCase();
      if (lower.includes("it_administrator") || lower.includes("it_admin") || lower.includes("systemadmin")) return "System Admin";
      if (lower.includes("pmo") || lower.includes("admin")) return "PMO";
      if (lower.includes("finance")) return "Finance Member";
      if (lower.includes("resource")) return "Resource Manager";
      if (lower.includes("manager")) return "Project Manager";
    }

    const roleLower = userRole.toLowerCase();
    if (roleLower.includes("it_administrator") || roleLower.includes("it_admin") || roleLower.includes("systemadmin") || roleLower.includes("system admin")) {
      return "System Admin";
    }
    if (roleLower.includes("admin") || roleLower.includes("pmo")) {
      return "PMO";
    }
    if (roleLower.includes("finance")) {
      return "Finance Member";
    }
    if (roleLower.includes("resource")) {
      return "Resource Manager";
    }
    if (roleLower.includes("member") || roleLower.includes("team") || roleLower.includes("contributor") || roleLower.includes("employee")) {
      return "Team Member";
    }
    return "Project Manager";
  }, [userRole, orgRole]);

  const isAdmin = activeRole === "System Admin" || activeRole === "PMO";

  // Filter projects by user role
  const userProjects = useMemo(() => {
    const userName = user?.fullName || "Yogesh V";
    if (isAdmin || activeRole === "Finance Member" || activeRole === "Resource Manager") {
      return dbProjects;
    }
    if (activeRole === "Project Manager") {
      return dbProjects.filter(p => 
        p.projectManager && 
        p.projectManager.toLowerCase().trim() === userName.toLowerCase().trim()
      );
    }
    // Team Member view
    return dbProjects.filter(p => {
      const isMember = p.teamMembers?.some(m => m.toLowerCase().trim() === userName.toLowerCase().trim());
      const hasTask = dbTasks.some(t => t.projectId === p.id && t.assignee?.toLowerCase().trim() === userName.toLowerCase().trim());
      return isMember || hasTask;
    });
  }, [dbProjects, dbTasks, activeRole, isAdmin, user?.fullName]);

  const userProjectNames = useMemo(() => new Set(userProjects.map(p => p.name)), [userProjects]);
  const userProjectIds = useMemo(() => new Set(userProjects.map(p => p.id)), [userProjects]);

  // Project Progress calculation
  const getProjectProgress = (pId: string, staticProgress?: number) => {
    const projTasks = dbTasks.filter(t => t.projectId === pId);
    if (projTasks.length === 0) return staticProgress || 65;
    const completed = projTasks.filter(t => 
      t.status === "Done"
    ).length;
    return Math.round((completed / projTasks.length) * 100);
  };

  // KPIs Calculations
  const kpisData = useMemo(() => {
    const totalProjects = userProjects.length;
    const activeProjects = userProjects.filter(p => 
      p.status === "In Progress" || p.status === "Approved" || p.status === "Pending Approval"
    ).length;
    const delayedProjects = userProjects.filter(p => p.status === "Delayed" || p.status === "On Hold").length;
    
    const activeRisks = risks.filter(r => r.status !== "Closed" && userProjectNames.has(r.project));
    const openRisks = activeRisks.length;

    // Filter resources allocated to user's projects
    const allocatedRes = resources.filter(res => 
      res.allocations?.some((alloc: any) => userProjectNames.has(alloc.projectName))
    );
    const avgUtil = allocatedRes.length > 0
      ? Math.round(allocatedRes.reduce((sum, r) => sum + (r.util || 0), 0) / allocatedRes.length)
      : 76;

    const totalRevenue = userProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalAllocatedCount = allocatedRes.reduce((sum, res) => {
      const pAllocs = res.allocations?.filter((a: any) => userProjectNames.has(a.projectName)) || [];
      return sum + pAllocs.length;
    }, 0);

    const pendingApprovalsCount = dbApprovals.filter(a => 
      a.stage !== "Approved" && a.stage !== "Rejected" && userProjectNames.has(a.project)
    ).length;

    return {
      totalProjects,
      activeProjects,
      delayedProjects,
      openRisks,
      utilization: avgUtil,
      revenue: totalRevenue || 3800000,
      pendingApprovals: pendingApprovalsCount,
      allocated: totalAllocatedCount || (isAdmin ? 312 : 24)
    };
  }, [userProjects, risks, resources, dbApprovals, userProjectNames, isAdmin]);

  // Scale revenue trend for charts based on the user's portfolio size
  const scaledRevenueTrend = useMemo(() => {
    const totalAllProjectsBudget = dbProjects.reduce((sum, p) => sum + (p.budget || 0), 0) || 1;
    const userProjectsBudget = userProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const scale = userProjectsBudget / totalAllProjectsBudget;
    
    return revenueTrend.map(item => ({
      ...item,
      revenue: Math.round(item.revenue * (scale > 0 ? Math.max(0.25, scale) : 0.8)),
      target: Math.round(item.target * (scale > 0 ? Math.max(0.25, scale) : 0.8))
    }));
  }, [dbProjects, userProjects]);

  // Project Status Distribution
  const statusDistData = useMemo(() => {
    const counts = { "On Track": 0, "At Risk": 0, "Delayed": 0, "Completed": 0 };
    userProjects.forEach(p => {
      if (p.status === "Delayed" || p.status === "On Hold") counts["Delayed"]++;
      else if (p.status === "Pending Approval" || p.status === "Draft") counts["At Risk"]++;
      else if (p.status === "Completed" || p.status === "Closed") counts["Completed"]++;
      else counts["On Track"]++;
    });

    return [
      { name: "On Track", value: counts["On Track"] || (isAdmin ? 5 : 2), color: "#22C55E" },
      { name: "At Risk", value: counts["At Risk"] || (isAdmin ? 2 : 1), color: "#F59E0B" },
      { name: "Delayed", value: counts["Delayed"] || (isAdmin ? 1 : 0), color: "#EF4444" },
      { name: "Completed", value: counts["Completed"] || (isAdmin ? 3 : 1), color: "#C67C4E" }
    ];
  }, [userProjects, isAdmin]);

  // Dynamic Department Utilization
  const dynamicUtilizationData = useMemo(() => {
    const depts = ["Engineering", "Design", "Product", "Data", "QA", "DevOps"];
    return depts.map(dept => {
      const deptRes = resources.filter(r => 
        r.dept === dept && 
        r.allocations?.some((a: any) => userProjectNames.has(a.projectName))
      );
      const avgDeptUtil = deptRes.length > 0 
        ? Math.round(deptRes.reduce((sum, r) => sum + r.util, 0) / deptRes.length) 
        : 0;

      if (avgDeptUtil === 0) {
        const staticItem = utilizationData.find(u => u.dept === dept);
        return {
          dept,
          billable: staticItem ? staticItem.billable : 75,
          nonBillable: staticItem ? staticItem.nonBillable : 15
        };
      }
      return {
        dept,
        billable: Math.min(100, avgDeptUtil),
        nonBillable: Math.max(5, Math.min(20, 100 - avgDeptUtil))
      };
    });
  }, [resources, userProjectNames]);

  // Risk Heatmap calculation
  const getHeatmapCellCount = (probLabel: string, impLabel: string) => {
    const userRisks = risks.filter(r => userProjectNames.has(r.project));
    return userRisks.filter(rk => {
      let rkProb = "Low";
      const pLower = (rk.probability || "").toLowerCase();
      if (pLower.includes("certain") || pLower.includes("likely") || pLower.includes("high")) rkProb = "High";
      else if (pLower.includes("possible") || pLower.includes("medium")) rkProb = "Med";

      let rkImp = "Low";
      const sLower = (rk.severity || "").toLowerCase();
      const iLower = (rk.impact || "").toLowerCase();
      
      if (sLower.includes("critical") || iLower.includes("severe") || sLower.includes("severe")) rkImp = "Sev";
      else if (sLower.includes("high") || iLower.includes("major") || sLower.includes("crit")) rkImp = "Crit";
      else if (sLower.includes("medium") || iLower.includes("moderate")) rkImp = "High";
      else if (sLower.includes("low") || iLower.includes("minor")) rkImp = "Med";
      
      return rkProb === probLabel && rkImp === impLabel;
    }).length;
  };

  const criticalRisksCount = useMemo(() => 
    risks.filter(r => r.severity === "Critical" && r.status !== "Closed" && userProjectNames.has(r.project)).length
  , [risks, userProjectNames]);

  const highRisksCount = useMemo(() => 
    risks.filter(r => r.severity === "High" && r.status !== "Closed" && userProjectNames.has(r.project)).length
  , [risks, userProjectNames]);

  const mediumRisksCount = useMemo(() => 
    risks.filter(r => r.severity === "Medium" && r.status !== "Closed" && userProjectNames.has(r.project)).length
  , [risks, userProjectNames]);

  const lowRisksCount = useMemo(() => 
    risks.filter(r => r.severity === "Low" && r.status !== "Closed" && userProjectNames.has(r.project)).length
  , [risks, userProjectNames]);

  // Map and resolve milestones loaded from Supabase
  const resolvedMilestones = useMemo(() => {
    if (dbMilestones.length === 0) return milestones;

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("en-US", { month: "short", day: "numeric" });
    };

    const projectMap = new Map(dbProjects.map(p => [p.id, p.name]));
    return dbMilestones.map(m => {
      const projName = projectMap.get(m.projectId) || "Unknown Project";
      const statusTag = m.tags && m.tags.includes("At Risk") ? "At Risk" : "On Track";
      return {
        name: m.title || "Milestone",
        project: projName,
        date: formatDate(m.dueDate || ""),
        status: statusTag
      };
    });
  }, [dbMilestones, dbProjects]);

  // Filter lists by user projects
  const filteredMilestones = useMemo(() => 
    resolvedMilestones.filter(m => userProjectNames.has(m.project) || isAdmin).slice(0, 5)
  , [resolvedMilestones, userProjectNames, isAdmin]);

  const filteredApprovals = useMemo(() => 
    dbApprovals.filter(a => userProjectNames.has(a.project) || isAdmin).slice(0, 5)
  , [dbApprovals, userProjectNames, isAdmin]);

  const resolvedActivities = useMemo(() => {
    return dbActivities.length > 0 ? dbActivities : activities;
  }, [dbActivities]);

  const filteredActivities = useMemo(() => 
    resolvedActivities.filter(a => 
      isAdmin || userProjectNames.size === 0 || Array.from(userProjectNames).some(name => 
        a.target.toLowerCase().includes(name.toLowerCase()) || 
        a.what.toLowerCase().includes(name.toLowerCase())
      )
    ).slice(0, 5)
  , [resolvedActivities, userProjectNames, isAdmin]);

  const canCreate = activeRole === "PMO" || activeRole === "Project Manager";

  const userPendingTasks = useMemo(() => {
    const userName = user?.fullName || "Yogesh V";
    return dbTasks.filter(t => 
      t.assignee?.toLowerCase().trim() === userName.toLowerCase().trim() && 
      t.status !== "Done"
    );
  }, [dbTasks, user?.fullName]);

  const getProjectName = (pId: string) => {
    const found = dbProjects.find(p => p.id === pId);
    return found ? found.name : "Unknown Project";
  };

  if (activeRole === "Resource Manager") {
    // Calculate resource-specific metrics
    const totalResources = resources.length || 18;
    const avgUtil = kpisData.utilization || 76;
    const benchCount = resources.filter(r => r.status === "Available" || r.util === 0).length || 4;
    const activeAllocationsCount = resources.reduce((sum, r) => sum + (r.allocations?.length || 0), 0) || 12;

    // Allocation pie status data
    const allocStatusData = [
      { name: "Allocated", value: totalResources - benchCount, color: "#C67C4E" },
      { name: "On Bench", value: benchCount, color: "#D4A373" }
    ];

    // Upcoming availability alerts (allocations ending soon)
    const upcomingAvailability = resources
      .filter(r => r.allocations && r.allocations.length > 0)
      .map(r => {
        const sortedAllocs = [...r.allocations].sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
        const primaryAlloc = sortedAllocs[0];
        return {
          name: r.name,
          dept: r.dept,
          projectName: primaryAlloc.projectName,
          endDate: primaryAlloc.endDate,
          util: r.util
        };
      })
      .slice(0, 5);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight">Portfolio Command Center</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Resource Operations Hub · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
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
            <button className="h-10 px-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary inline-flex items-center gap-2">
              <Calendar className="size-4" />Last 30 days
            </button>
          </div>
        </div>

        {/* Resource KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Resources" value={totalResources} delta={0} hint="Active personnel" icon={<Users className="size-4" />} />
          <KpiCard label="Average Utilization" value={`${avgUtil}%`} delta={2.4} hint="Across all departments" icon={<Activity className="size-4" />} accent="success" />
          <KpiCard label="Resources on Bench" value={benchCount} delta={0} hint="Available for projects" icon={<AlertTriangle className="size-4" />} accent="danger" />
          <KpiCard label="Active Allocations" value={activeAllocationsCount} delta={0} hint="Current project links" icon={<Layers className="size-4" />} accent="primary" />
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Department Utilization</div>
                <div className="text-sm text-muted-foreground mt-0.5">Average workload by capability</div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={dynamicUtilizationData} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                  <XAxis dataKey="dept" stroke="#A8A29E" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A8A29E" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="billable" stackId="a" fill="#C67C4E" />
                  <Bar dataKey="nonBillable" stackId="a" fill="#D4A373" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Staffing Status</div>
            <div className="mt-1 text-2xl font-semibold">{totalResources} Staff</div>
            <div className="h-48 mt-2">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={allocStatusData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                    {allocStatusData.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {allocStatusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: s.color }} /><span>{s.name}</span></div>
                  <span className="tabular-nums font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resources & Availability */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <div className="font-semibold">Resource Directory & Utilization</div>
              <button className="text-xs font-medium text-primary hover:underline">View directory</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-6 py-3">Resource</th>
                  <th className="text-left font-medium px-3 py-3">Role & Dept</th>
                  <th className="text-left font-medium px-3 py-3 w-[28%]">Utilization</th>
                  <th className="text-right font-medium px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {resources.slice(0, 6).map((res) => (
                  <tr key={res.id} className="border-t border-border hover:bg-secondary/40 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-medium">{res.name}</div>
                      <div className="text-xs text-muted-foreground">{res.email}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="font-medium text-xs">{res.role}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">{res.dept}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <ProgressBar value={res.util} tone={res.util > 85 ? "danger" : res.util > 50 ? "primary" : "warning"} />
                        <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{res.util}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <StatusChip tone={res.status === "Bench" || res.status === "Available" ? "success" : "warning"}>
                        {res.status}
                      </StatusChip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="font-semibold mb-4">Roll-off Alerts (Ending Soon)</div>
            <div className="space-y-4">
              {upcomingAvailability.map((up) => (
                <div key={up.name} className="flex items-start gap-3 p-2.5 rounded-xl bg-secondary/20 border border-border/40">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate text-foreground">{up.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{up.dept} · {up.projectName}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-amber-600">Ends {up.endDate}</div>
                    <div className="text-xs font-medium text-muted-foreground mt-0.5">{up.util}% Util</div>
                  </div>
                </div>
              ))}
              {upcomingAvailability.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  No upcoming roll-offs.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeRole === "Finance Member") {
    const totalBudget = dbProjects.reduce((sum, p) => sum + (p.budget || 0), 0) || 5000000;
    const totalSpent = dbProjects.reduce((sum, p) => sum + (p.spent || 0), 0) || 3200000;
    const profitMargin = Math.round(((totalBudget - totalSpent) / totalBudget) * 100) || 36;

    // Budget distribution data
    const budgetStatusData = [
      { name: "Spent YTD", value: totalSpent, color: "#C67C4E" },
      { name: "Remaining Margin", value: totalBudget - totalSpent, color: "#D4A373" }
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight">Portfolio Command Center</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Financial Analysis & Controls · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
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
            <button className="h-10 px-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary inline-flex items-center gap-2">
              <Calendar className="size-4" />Last 30 days
            </button>
          </div>
        </div>

        {/* Finance KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Revenue YTD" value={formatCurrency(kpisData.revenue)} delta={12.4} hint="vs last year" icon={<DollarSign className="size-4" />} accent="success" />
          <KpiCard label="Total Allocated Budget" value={formatCurrency(totalBudget)} delta={0} hint="Portfolio sum" icon={<Briefcase className="size-4" />} />
          <KpiCard label="Burn Spent YTD" value={formatCurrency(totalSpent)} delta={0} hint="Realized costs" icon={<Wallet className="size-4" />} accent="primary" />
          <KpiCard label="Average Profit Margin" value={`${profitMargin}%`} delta={3.1} hint="Target: 30%" icon={<Activity className="size-4" />} accent="success" />
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Revenue Trend</div>
                <div className="text-sm text-muted-foreground mt-0.5">YTD Target vs Actual performance</div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={scaledRevenueTrend} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="revFinance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C67C4E" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#C67C4E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                  <XAxis dataKey="m" stroke="#A8A29E" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A8A29E" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v}k`} />
                  <Area type="monotone" dataKey="target" stroke="#D4A373" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
                  <Area type="monotone" dataKey="revenue" stroke="#C67C4E" strokeWidth={2.5} fill="url(#revFinance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Portfolio Budget Burn</div>
            <div className="mt-1 text-2xl font-semibold">{formatCurrency(totalBudget)} Limit</div>
            <div className="h-48 mt-2">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={budgetStatusData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                    {budgetStatusData.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {budgetStatusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: s.color }} /><span>{s.name}</span></div>
                  <span className="tabular-nums font-medium">{formatCurrency(s.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invoices & Budget Burn Table */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <div className="font-semibold">Project Burn Rates & Budgets</div>
              <button className="text-xs font-medium text-primary hover:underline">View billing</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-6 py-3">Project</th>
                  <th className="text-right font-medium px-3 py-3">Budget</th>
                  <th className="text-right font-medium px-3 py-3">Spent</th>
                  <th className="text-left font-medium px-3 py-3 w-[28%]">Burn Rate</th>
                  <th className="text-right font-medium px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {userProjects.slice(0, 6).map((p) => {
                  const burnPercent = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/40 transition">
                      <td className="px-6 py-3.5">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.code} · {p.client}</div>
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold">{formatCurrency(p.budget)}</td>
                      <td className="px-3 py-3.5 text-right font-semibold text-muted-foreground">{formatCurrency(p.spent)}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <ProgressBar value={burnPercent} tone={burnPercent > 90 ? "danger" : burnPercent > 60 ? "primary" : "warning"} />
                          <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{burnPercent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <StatusChip tone={burnPercent > 100 ? "danger" : burnPercent > 80 ? "warning" : "success"}>
                          {burnPercent > 100 ? "Over Budget" : burnPercent > 80 ? "Near Limit" : "Healthy"}
                        </StatusChip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="font-semibold mb-4">Pending Invoice Approvals</div>
            <div className="space-y-4">
              {dbApprovals
                .filter(a => a.type === "Invoice" || a.type === "Expense")
                .slice(0, 5)
                .map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-secondary/20 border border-border/40">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate text-foreground">{a.project}</div>
                      <div className="text-xs text-muted-foreground truncate">Requested by {a.requester}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-foreground">{formatCurrency(a.amount)}</div>
                      <span className="text-[10px] uppercase font-bold text-amber-600 block mt-0.5">{a.stage}</span>
                    </div>
                  </div>
                ))}
              {dbApprovals.filter(a => a.type === "Invoice" || a.type === "Expense").length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  No pending invoices.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeRole === "Team Member") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight">Portfolio Command Center</h1>
              <p className="text-sm text-muted-foreground mt-1">
                My Workspace Overview · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
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
            <button className="h-10 px-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary inline-flex items-center gap-2">
              <Calendar className="size-4" />Last 30 days
            </button>
          </div>
        </div>

        {/* Dynamic KPIs for Team Member */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Projects" value={kpisData.totalProjects} delta={0} hint="Assigned workspace" icon={<Briefcase className="size-4" />} />
          <KpiCard label="Active Projects" value={kpisData.activeProjects} delta={0} hint="In progress" icon={<Layers className="size-4" />} accent="primary" />
          <KpiCard label="Delayed" value={kpisData.delayedProjects} delta={0} hint="Needs attention" icon={<AlertTriangle className="size-4" />} accent="danger" />
          <KpiCard label="Pending Tasks" value={userPendingTasks.length} delta={0} hint="Assigned to me" icon={<CheckCircle2 className="size-4" />} accent="warning" />
        </div>

        {/* Projects Progress + Pending Tasks */}
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
                  <th className="text-right font-medium px-6 py-3">Budget</th>
                </tr>
              </thead>
              <tbody>
                {userProjects.slice(0, 6).map((p) => {
                  const progressVal = getProjectProgress(p.id);
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/40 transition">
                      <td className="px-6 py-3.5">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.code} · {p.client}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusChip tone={statusTone(p.status)}>{p.status}</StatusChip>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <ProgressBar value={progressVal} tone={p.status === "Delayed" ? "danger" : p.status === "On Hold" ? "warning" : "primary"} />
                          <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{progressVal}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold text-foreground">
                        {formatCurrency(p.budget || 0)}
                      </td>
                    </tr>
                  );
                })}
                {userProjects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-muted-foreground text-xs italic">
                      No projects assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">My Pending Tasks</div>
              <span className="text-xs bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-bold">
                {userPendingTasks.length} left
              </span>
            </div>
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {userPendingTasks.map((task) => (
                <div key={task.id} className="p-3 bg-secondary/20 hover:bg-secondary/40 border border-border rounded-xl transition flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">{task.id} · {getProjectName(task.projectId)}</span>
                      <div className="text-xs font-semibold text-foreground truncate mt-0.5" title={task.title}>{task.title}</div>
                    </div>
                    <StatusChip tone={statusTone(task.status)}>{task.status}</StatusChip>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">Priority:</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        task.priority === "Critical" ? "bg-red-500/10 text-red-500" :
                        task.priority === "High" ? "bg-orange-500/10 text-orange-500" :
                        task.priority === "Medium" ? "bg-amber-500/10 text-amber-500" :
                        "bg-stone-500/10 text-stone-500"
                      }`}>{task.priority}</span>
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>Due {task.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {userPendingTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-xs italic">
                  Awesome! No pending tasks assigned to you.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">Portfolio Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Global Enterprise Portfolio" : "My Project Leadership"} Overview · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
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
          <button className="h-10 px-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary inline-flex items-center gap-2">
            <Calendar className="size-4" />Last 30 days
          </button>
          {canCreate && (
            <button className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2 hover:opacity-90 transition">
              New project<ArrowUpRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Projects" value={kpisData.totalProjects} delta={isAdmin ? 8.2 : 0} hint={isAdmin ? "vs last quarter" : "Active & Drafts"} icon={<Briefcase className="size-4" />} />
        <KpiCard label="Active Projects" value={kpisData.activeProjects} delta={isAdmin ? 4.1 : 0} hint="in progress" icon={<Layers className="size-4" />} accent="primary" />
        <KpiCard label="Delayed" value={kpisData.delayedProjects} delta={0} hint="needs attention" icon={<AlertTriangle className="size-4" />} accent="danger" />
        <KpiCard label="Open Risks" value={kpisData.openRisks} delta={0} hint="across projects" icon={<ShieldAlert className="size-4" />} accent="warning" />
        <KpiCard label="Utilization" value={`${kpisData.utilization}%`} delta={isAdmin ? 3.6 : 0} hint={isAdmin ? "firm-wide" : "allocated resources"} icon={<Activity className="size-4" />} accent="success" />
        <KpiCard label="Revenue YTD" value={formatCurrency(kpisData.revenue)} delta={isAdmin ? 12.4 : 0} hint="portfolio budget" icon={<DollarSign className="size-4" />} accent="primary" />
        <KpiCard label="Pending Approvals" value={kpisData.pendingApprovals} delta={0} hint="this week" icon={<CheckCircle2 className="size-4" />} accent="warning" />
        <KpiCard label="Resources Allocated" value={kpisData.allocated} delta={0} hint="distinct resources" icon={<Users className="size-4" />} accent="muted" />
      </div>

      {/* Revenue + Status */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">Revenue Trend</div>
              <div className="mt-1 flex items-baseline gap-3">
                <div className="text-2xl font-semibold tabular-nums">{formatCurrency(kpisData.revenue)}</div>
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
              <AreaChart data={scaledRevenueTrend} margin={{ left: -20, right: 8, top: 8 }}>
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
          <div className="mt-1 text-2xl font-semibold tabular-nums">{statusDistData.reduce((a, b) => a + b.value, 0)}</div>
          <div className="h-48 mt-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusDistData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                  {statusDistData.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {statusDistData.map((s) => (
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
              <BarChart data={dynamicUtilizationData} margin={{ left: -20, right: 8 }}>
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
                  const count = getHeatmapCellCount(prob, ["Low", "Med", "High", "Crit", "Sev"][c]);
                  const bg = v <= 4 ? `rgba(34,197,94,${0.15 + v * 0.05})`
                    : v <= 6 ? `rgba(245,158,11,${0.15 + (v - 4) * 0.12})`
                    : `rgba(239,68,68,${0.2 + (v - 6) * 0.18})`;
                  return (
                    <div key={`${r}-${c}`} className="aspect-square rounded-md grid place-items-center text-xs font-semibold tabular-nums" style={{ background: bg }}>
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border space-y-2.5">
            {[
              { l: "Critical", v: criticalRisksCount, c: "bg-red-500" },
              { l: "High", v: highRisksCount, c: "bg-orange-500" },
              { l: "Medium", v: mediumRisksCount, c: "bg-amber-500" },
              { l: "Low", v: lowRisksCount, c: "bg-emerald-500" },
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
                <th className="text-right font-medium px-6 py-3">Budget</th>
              </tr>
            </thead>
            <tbody>
              {userProjects.slice(0, 6).map((p) => {
                const progressVal = getProjectProgress(p.id);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/40 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.code} · {p.client}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusChip tone={statusTone(p.status)}>{p.status}</StatusChip>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <ProgressBar value={progressVal} tone={p.status === "Delayed" ? "danger" : p.status === "On Hold" ? "warning" : "primary"} />
                        <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{progressVal}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-foreground">
                      {formatCurrency(p.budget || 0)}
                    </td>
                  </tr>
                );
              })}
              {userProjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-muted-foreground text-xs italic">
                    No projects found for your role.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Upcoming Milestones</div>
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {filteredMilestones.map((m) => (
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
            {filteredMilestones.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-xs italic">
                No upcoming milestones.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activities + Approvals */}
      <div className="grid lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col justify-between">
          <div className="flex flex-col flex-1">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border shrink-0">
              <div className="font-semibold">Approval Requests</div>
              <button className="text-xs font-medium text-primary hover:underline">Open queue</button>
            </div>
            <div className="divide-y divide-border flex-1 bg-card">
              {filteredApprovals.map((a) => (
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
              {filteredApprovals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs italic flex items-center justify-center h-full">
                  No pending approval requests.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div className="flex flex-col flex-1">
            <div className="font-semibold mb-4 shrink-0">Recent Activity</div>
            <div className="space-y-4 relative flex-1">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              {filteredActivities.map((a, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-semibold text-white ring-4 ring-card">
                    {a.who.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="text-sm"><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.what}</span></div>
                    <div className="text-xs text-foreground/70 truncate">{a.target}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{a.when} ago</div>
                  </div>
                </div>
              ))}
              {filteredActivities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs italic flex items-center justify-center h-full">
                  No recent activity.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
