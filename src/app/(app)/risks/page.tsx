"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Plus, AlertTriangle, Search, ShieldAlert, Cpu, Eye, X, Play, RefreshCw, CheckCircle, ArrowRight } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { risks as initialRisks } from "@/lib/mock";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// ==========================================
// TYPES
// ==========================================

export interface Risk {
  id: string;
  name: string;
  project: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  probability: "Rare" | "Unlikely" | "Possible" | "Likely" | "Certain"; // 1 to 5
  impact: "Insignif." | "Minor" | "Moderate" | "Major" | "Severe"; // 1 to 5
  owner: string;
  status: "Identified" | "Assessed" | "Mitigating" | "Monitoring" | "Closed";
  source: "Manual" | "Automated";
  description: string;
  createdAt: string;
}

const probLabels = ["Rare", "Unlikely", "Possible", "Likely", "Certain"];
const impLabels = ["Insignif.", "Minor", "Moderate", "Major", "Severe"];

function Risks() {
  const { orgRole } = useAuth();
  const { user } = useUser();
  const { projects, tasks } = useWorkspace();
  
  const isMember = orgRole === "org:member";
  
  const canWrite = !orgRole || 
    orgRole.toLowerCase().includes("admin") || 
    orgRole.toLowerCase().includes("project_manager") || 
    orgRole.toLowerCase().includes("department_head");

  const assignedProjectNames = React.useMemo(() => {
    return new Set(
      projects
        .filter(p => 
          (user?.fullName && p.projectManager === user.fullName) || 
          tasks.some(t => t.projectId === p.id && user?.fullName && t.assignee === user.fullName)
        )
        .map(p => p.name)
    );
  }, [projects, tasks, user?.fullName]);

  const [risks, setRisks] = useState<Risk[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  
  // Interactive Heatmap filter state
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

  // Add Form State
  const [formName, setFormName] = useState("");
  const [formProject, setFormProject] = useState("Atlas Banking Platform");
  const [formProb, setFormProb] = useState<Risk['probability']>("Possible");
  const [formImp, setFormImp] = useState<Risk['impact']>("Moderate");
  const [formOwner, setFormOwner] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // Get list of projects user can log risks for
  const loggableProjects = React.useMemo(() => {
    return projects.filter(p => {
      if (!isMember) return true;
      return assignedProjectNames.has(p.name);
    });
  }, [projects, isMember, assignedProjectNames]);

  // Adjust selected default project when modal opens or loggableProjects change
  useEffect(() => {
    if (isAddModalOpen && loggableProjects.length > 0) {
      if (!loggableProjects.some(p => p.name === formProject)) {
        setFormProject(loggableProjects[0].name);
      }
    }
  }, [isAddModalOpen, loggableProjects, formProject]);

  // Load state from Supabase, with local storage fallback
  useEffect(() => {
    async function loadRisks() {
      try {
        const { data, error } = await supabase.from("risks").select("*");
        
        let currentRisks: Risk[] = [];
        if (error || !data || data.length === 0) {
          const saved = localStorage.getItem("nexus_risks_v2");
          if (saved) {
            currentRisks = JSON.parse(saved);
          } else {
            currentRisks = initializeDefaultRisks();
          }
        } else {
          currentRisks = data.map(r => ({
            id: r.id,
            name: r.name,
            project: r.project,
            severity: r.severity,
            probability: r.probability,
            impact: r.impact,
            owner: r.owner,
            status: r.status,
            source: r.source,
            description: r.description,
            createdAt: r.created_at
          }));
        }

        // Proactively scan resources from directory state for overallocated constraints
        const savedResources = localStorage.getItem("nexus_resources_v2");
        if (savedResources) {
          try {
            const resourcesList = JSON.parse(savedResources);
            const newlyDetected: Risk[] = [];
            let hasUpdates = false;

            resourcesList.forEach((res: any) => {
              const totalLoadPercent = res.allocations?.reduce((sum: number, a: any) => sum + (a.allocationPercent || 0), 0) || 0;
              if (totalLoadPercent > 100) {
                const riskName = `${res.name} Overallocated Capacity`;
                // Check for active (non-Closed) risk
                const existingIndex = currentRisks.findIndex(r => r.name === riskName && r.status !== "Closed");
                if (existingIndex === -1) {
                  newlyDetected.push({
                    id: `RSK-AUTO-${Math.floor(100 + Math.random() * 900)}`,
                    name: riskName,
                    project: res.allocations?.[0]?.projectName || "Atlas Banking Platform",
                    severity: "High",
                    probability: "Certain",
                    impact: "Major",
                    owner: res.name,
                    status: "Identified",
                    source: "Automated",
                    description: `Automated Capacity Listener detected total workload allocation is ${totalLoadPercent}% exceeding the 100% standard capacity limit.`,
                    createdAt: new Date().toISOString().split("T")[0]
                  });
                } else {
                  // Update load description text dynamically if capacity percentages change
                  const existing = currentRisks[existingIndex];
                  const matchText = `${totalLoadPercent}%`;
                  if (!existing.description.includes(matchText)) {
                    currentRisks[existingIndex] = {
                      ...existing,
                      description: `Automated Capacity Listener detected total workload allocation is ${totalLoadPercent}% exceeding the 100% standard capacity limit.`
                    };
                    hasUpdates = true;
                  }
                }
              }
            });

            if (newlyDetected.length > 0) {
              currentRisks = [...newlyDetected, ...currentRisks];
              hasUpdates = true;
            }

            if (hasUpdates) {
              localStorage.setItem("nexus_risks_v2", JSON.stringify(currentRisks));
              // Try to upsert newly scanned risks to database
              const rows = currentRisks.map(r => ({
                id: r.id,
                name: r.name,
                project: r.project,
                severity: r.severity,
                probability: r.probability,
                impact: r.impact,
                owner: r.owner,
                status: r.status,
                source: r.source,
                description: r.description,
                created_at: r.createdAt
              }));
              await supabase.from("risks").upsert(rows);
            }
          } catch (err) {
            console.error("Failed to parse resources for active risks", err);
          }
        }

        setRisks(currentRisks);
      } catch (err) {
        console.error("Failed to load risks from Supabase:", err);
        const saved = localStorage.getItem("nexus_risks_v2");
        if (saved) {
          setRisks(JSON.parse(saved));
        } else {
          setRisks(initializeDefaultRisks());
        }
      }
    }

    loadRisks();
  }, []);

  const initializeDefaultRisks = (): Risk[] => {
    const formatted: Risk[] = initialRisks.map((r, index) => {
      // Map mock probability & impact strings to 1-5 scales
      let prob: Risk['probability'] = "Possible";
      if (r.probability === "High") prob = "Likely";
      else if (r.probability === "Medium") prob = "Possible";
      else if (r.probability === "Low") prob = "Unlikely";

      let imp: Risk['impact'] = "Moderate";
      if (r.impact === "Schedule") imp = "Major";
      else if (r.impact === "Delivery") imp = "Severe";
      else if (r.impact === "Cost") imp = "Major";
      else if (r.impact === "Quality") imp = "Moderate";
      else if (r.impact === "Financial") imp = "Minor";

      // Map mock status
      let stat: Risk['status'] = "Identified";
      if (r.status === "Open") stat = "Identified";
      else if (r.status === "Mitigating") stat = "Mitigating";
      else if (r.status === "Monitoring") stat = "Monitoring";
      else if (r.status === "Accepted") stat = "Monitoring";

      // Calculate severity from PxI
      const pIdx = probLabels.indexOf(prob) + 1;
      const iIdx = impLabels.indexOf(imp) + 1;
      const score = pIdx * iIdx;
      let sev: Risk['severity'] = "Medium";
      if (score >= 16) sev = "Critical";
      else if (score >= 10) sev = "High";
      else if (score <= 4) sev = "Low";

      return {
        id: r.id,
        name: r.name,
        project: r.project,
        severity: sev,
        probability: prob,
        impact: imp,
        owner: r.owner,
        status: stat,
        source: "Manual",
        description: `Identified project constraint on ${r.project}. Action plan assigned to ${r.owner}.`,
        createdAt: new Date(Date.now() - index * 86400000 * 3).toISOString().split("T")[0]
      };
    });
    localStorage.setItem("nexus_risks_v2", JSON.stringify(formatted));
    return formatted;
  };

  const saveState = async (updated: Risk[]) => {
    setRisks(updated);
    localStorage.setItem("nexus_risks_v2", JSON.stringify(updated));

    try {
      const rows = updated.map(r => ({
        id: r.id,
        name: r.name,
        project: r.project,
        severity: r.severity,
        probability: r.probability,
        impact: r.impact,
        owner: r.owner,
        status: r.status,
        source: r.source,
        description: r.description,
        created_at: r.createdAt
      }));

      await supabase.from("risks").upsert(rows);
    } catch (err) {
      console.error("Failed to upsert risks in Supabase:", err);
    }
  };

  // Severity tone helper
  const getSeverityTone = (sev: Risk['severity']) => {
    switch (sev) {
      case "Critical": return "danger";
      case "High": return "warning";
      case "Medium": return "primary";
      case "Low": return "neutral";
      default: return "neutral";
    }
  };

  // Status tone helper
  const getStatusTone = (status: Risk['status']) => {
    switch (status) {
      case "Identified": return "neutral";
      case "Assessed": return "info";
      case "Mitigating": return "warning";
      case "Monitoring": return "primary";
      case "Closed": return "success";
      default: return "neutral";
    }
  };

  // Add manual risk
  const handleLogRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formOwner.trim()) {
      toast.error("Please enter Name and Owner.");
      return;
    }

    // Calculate score
    const pIdx = probLabels.indexOf(formProb) + 1;
    const iIdx = impLabels.indexOf(formImp) + 1;
    const score = pIdx * iIdx;
    let sev: Risk['severity'] = "Medium";
    if (score >= 16) sev = "Critical";
    else if (score >= 10) sev = "High";
    else if (score <= 4) sev = "Low";

    const nextIdNum = risks.reduce((max, r) => {
      const match = r.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        return num > max ? num : max;
      }
      return max;
    }, 90);

    const newRisk: Risk = {
      id: `RSK-${nextIdNum + 1}`,
      name: formName,
      project: formProject,
      severity: sev,
      probability: formProb,
      impact: formImp,
      owner: formOwner,
      status: "Identified",
      source: "Manual",
      description: formDesc || "No mitigation details provided.",
      createdAt: new Date().toISOString().split("T")[0]
    };

    const updated = [newRisk, ...risks];
    saveState(updated);
    setIsAddModalOpen(false);
    toast.success(`Risk ${newRisk.id} logged in register.`);

    // Reset Form
    setFormName("");
    setFormOwner("");
    setFormDesc("");
  };

  // Run automated risk scans simulator
  const handleRunAutomatedScan = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Running automated risk checkers...",
        success: () => {
          const autoDetected: Risk[] = [];
          
          // Live scan
          const savedResources = localStorage.getItem("nexus_resources_v2");
          if (savedResources) {
            try {
              const resourcesList = JSON.parse(savedResources);
              let hasManualUpdates = false;
              const nextRisks = [...risks];
              resourcesList.forEach((res: any) => {
                const totalLoadPercent = res.allocations?.reduce((sum: number, a: any) => sum + (a.allocationPercent || 0), 0) || 0;
                if (totalLoadPercent > 100) {
                  const riskName = `${res.name} Overallocated Capacity`;
                  // Check for active (non-Closed) risk
                  const existingIndex = nextRisks.findIndex(r => r.name === riskName && r.status !== "Closed");
                  if (existingIndex === -1) {
                    autoDetected.push({
                      id: `RSK-AUTO-${Math.floor(100 + Math.random() * 900)}`,
                      name: riskName,
                      project: res.allocations?.[0]?.projectName || "Atlas Banking Platform",
                      severity: "High",
                      probability: "Certain",
                      impact: "Major",
                      owner: res.name,
                      status: "Identified",
                      source: "Automated",
                      description: `Automated Capacity Listener detected total workload allocation is ${totalLoadPercent}% exceeding the 100% standard capacity limit.`,
                      createdAt: new Date().toISOString().split("T")[0]
                    });
                  } else {
                    // Update workload description dynamically on manual check click
                    const existing = nextRisks[existingIndex];
                    const matchText = `${totalLoadPercent}%`;
                    if (!existing.description.includes(matchText)) {
                      nextRisks[existingIndex] = {
                        ...existing,
                        description: `Automated Capacity Listener detected total workload allocation is ${totalLoadPercent}% exceeding the 100% standard capacity limit.`
                      };
                      hasManualUpdates = true;
                    }
                  }
                }
              });

              if (hasManualUpdates) {
                saveState(nextRisks);
              }
            } catch (e) {
              console.error(e);
            }
          }

          // Default scans to preserve mock variance
          const staticChecks: Risk[] = [
            {
              id: `RSK-AUTO-${Math.floor(100 + Math.random() * 900)}`,
              name: "Milestone UAT Sign-off Slippage",
              project: "Atlas Banking Platform",
              severity: "Critical",
              probability: "Likely",
              impact: "Severe",
              owner: "Sasha Reyes",
              status: "Identified",
              source: "Automated",
              description: "Automated Milestone Listener detected target due date is in 9 days with under 40% completion velocity.",
              createdAt: new Date().toISOString().split("T")[0]
            },
            {
              id: `RSK-AUTO-${Math.floor(100 + Math.random() * 900)}`,
              name: "Helix CRM Budget Variance Warning",
              project: "Helix CRM Migration",
              severity: "Medium",
              probability: "Possible",
              impact: "Major",
              owner: "Marcus Lee",
              status: "Identified",
              source: "Automated",
              description: "Automated Budget Listener detected burn rate is 23% over forecasted completion velocity.",
              createdAt: new Date().toISOString().split("T")[0]
            }
          ];

          staticChecks.forEach(item => {
            const exists = risks.some(r => r.name === item.name);
            if (!exists) {
              autoDetected.push(item);
            }
          });

          if (autoDetected.length > 0) {
            const updated = [...autoDetected, ...risks];
            saveState(updated);
            return `Scan complete! Identified ${autoDetected.length} active risks.`;
          }
          return "Scan complete. Overloaded resource risks (such as Sasha Reyes) are active.";
        },
        error: "Failed to run automated scanner."
      }
    );
  };

  // Visible risks based on member assignments
  const visibleRisks = React.useMemo(() => {
    return risks.filter(r => {
      if (!isMember) return true;
      return assignedProjectNames.has(r.project);
    });
  }, [risks, isMember, assignedProjectNames]);

  // Filter logic
  const filteredRisks = visibleRisks.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || r.status === filterStatus;
    const matchesSeverity = filterSeverity === "All" || r.severity === filterSeverity;
    const matchesSource = filterSource === "All" || r.source === filterSource;

    // Heatmap cell filter
    if (selectedCell) {
      const pIdx = probLabels.indexOf(r.probability);
      const iIdx = impLabels.indexOf(r.impact);
      if (pIdx !== selectedCell.row || iIdx !== selectedCell.col) {
        return false;
      }
    }

    return matchesSearch && matchesStatus && matchesSeverity && matchesSource;
  });

  // KPI math
  const openCount = visibleRisks.filter(r => r.status !== "Closed").length;
  const criticalCount = visibleRisks.filter(r => r.severity === "Critical" && r.status !== "Closed").length;
  const mitigatingCount = visibleRisks.filter(r => r.status === "Mitigating").length;
  const autoCount = visibleRisks.filter(r => r.source === "Automated" && r.status !== "Closed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Risk Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manual intake register & automated event-driven risk triggers</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <button 
              onClick={handleRunAutomatedScan}
              className="h-10 px-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary inline-flex items-center gap-2 transition cursor-pointer"
            >
              <Cpu className="size-4 text-primary" />Run Auto Scan
            </button>
          )}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
          >
            <Plus className="size-4" />Log Risk
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Open Risks", v: openCount, t: "" },
          { l: "Critical Severity", v: criticalCount, t: "text-red-500" },
          { l: "Mitigating Stage", v: mitigatingCount, t: "text-amber-500" },
          { l: "Automated Triggers", v: autoCount, t: "text-primary" }
        ].map(kpi => (
          <div key={kpi.l} className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.l}</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums text-foreground ${kpi.t}`}>{kpi.v}</div>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left: Risk Register Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          {/* Table Filters Header */}
          <div className="px-5 py-4 border-b border-border bg-secondary/10 flex flex-col md:flex-row items-center gap-3">
            <div className="mr-auto font-semibold text-sm">Risk Register</div>
            
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input 
                placeholder="Search risk name, owner..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2 flex-wrap w-full md:w-auto">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-2 rounded-xl bg-secondary border border-border text-xs"
              >
                <option value="All">All Statuses</option>
                <option value="Identified">Identified</option>
                <option value="Assessed">Assessed</option>
                <option value="Mitigating">Mitigating</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Closed">Closed</option>
              </select>

              <select 
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="h-9 px-2 rounded-xl bg-secondary border border-border text-xs"
              >
                <option value="All">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>

              <select 
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="h-9 px-2 rounded-xl bg-secondary border border-border text-xs"
              >
                <option value="All">All Sources</option>
                <option value="Manual">Manual</option>
                <option value="Automated">Automated</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="font-medium px-5 py-3">Risk Details</th>
                  <th className="font-medium px-3 py-3">Source</th>
                  <th className="font-medium px-3 py-3">P × I Matrix</th>
                  <th className="font-medium px-3 py-3">Severity</th>
                  <th className="font-medium px-3 py-3">Owner</th>
                  <th className="font-medium px-5 py-3 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody>
                {filteredRisks.map((r) => (
                  <tr 
                    key={r.id}
                    onClick={() => setSelectedRisk(r)}
                    className="border-b border-border/50 hover:bg-secondary/20 transition cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {r.severity === "Critical" && <AlertTriangle className="size-3.5 text-red-500 fill-red-500/10 shrink-0" />}
                        {r.severity === "High" && <AlertTriangle className="size-3.5 text-orange-500 fill-orange-500/10 shrink-0" />}
                        {r.severity === "Medium" && <AlertTriangle className="size-3.5 text-amber-500 fill-amber-500/10 shrink-0" />}
                        {r.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{r.id} · {r.project}</div>
                    </td>
                    <td className="px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        r.source === "Automated" ? "bg-primary/15 text-primary border border-primary/20" : "bg-secondary text-muted-foreground border border-border"
                      }`}>
                        {r.source}
                      </span>
                    </td>
                    <td className="px-3 text-muted-foreground text-[10px] font-medium">
                      P: {r.probability} · I: {r.impact}
                    </td>
                    <td className="px-3">
                      <StatusChip tone={getSeverityTone(r.severity)}>{r.severity}</StatusChip>
                    </td>
                    <td className="px-3 font-medium">{r.owner}</td>
                    <td className="px-5 text-right">
                      <StatusChip tone={getStatusTone(r.status)}>{r.status}</StatusChip>
                    </td>
                  </tr>
                ))}
                {filteredRisks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-xs italic">
                      No risks found matching your filter conditions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedCell && (
            <div className="px-5 py-2.5 bg-primary/5 border-t border-border flex items-center justify-between text-[11px]">
              <span className="font-medium text-primary">Showing heatmap cell filter: Probability: {probLabels[selectedCell.row]} × Impact: {impLabels[selectedCell.col]}</span>
              <button 
                onClick={() => setSelectedCell(null)} 
                className="text-primary hover:underline font-bold"
              >
                Clear Heatmap Filter
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: PxI Heatmap & Rules */}
        <div className="space-y-6">
          {/* Probability x Impact Matrix */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
            <div>
              <h3 className="font-semibold text-sm">P × I Heatmap</h3>
              <p className="text-[10px] text-muted-foreground">Interactive grid. Click cells to filter registry list below</p>
            </div>

            <div className="grid grid-cols-6 gap-1">
              <div />
              {impLabels.map(l => (
                <div key={l} className="text-[9px] text-center text-muted-foreground -rotate-12 origin-bottom-left font-semibold">{l}</div>
              ))}
              {[4, 3, 2, 1, 0].map(row => (
                <Fragment key={`p${row}`}>
                  <div className="text-[9px] font-semibold text-muted-foreground text-right pr-1 flex items-center justify-end">{probLabels[row]}</div>
                  {[0, 1, 2, 3, 4].map(col => {
                    const score = (row + 1) * (col + 1);
                    const bg = score <= 4 ? "rgba(34,197,94,0.2)" : score <= 9 ? "rgba(245,158,11,0.3)" : score <= 15 ? "rgba(198,124,78,0.4)" : "rgba(239,68,68,0.7)";
                    
                    // Count risks in this cell
                    const count = visibleRisks.filter(r => {
                      const pIdx = probLabels.indexOf(r.probability);
                      const iIdx = impLabels.indexOf(r.impact);
                      return pIdx === row && iIdx === col;
                    }).length;

                    const isCellSelected = selectedCell?.row === row && selectedCell?.col === col;

                    return (
                      <div 
                        key={`${row}${col}`}
                        onClick={() => setSelectedCell(isCellSelected ? null : { row, col })}
                        className={`aspect-square rounded-md grid place-items-center text-[10px] font-bold tabular-nums cursor-pointer transition ${
                          isCellSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "hover:opacity-80"
                        }`}
                        style={{ background: bg, color: score > 9 ? "white" : "#1C1917" }}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Automated Rule Listeners Panel */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
            <div>
              <h3 className="font-semibold text-sm">Automated Rule Engine</h3>
              <p className="text-[10px] text-muted-foreground">Active event-driven watchers in background</p>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              {[
                { name: "Resource Over-allocation Rule", desc: "Flags team members assigned >100% capacity." },
                { name: "Schedule Slippage Rule", desc: "Flags milestones with low task velocity & due dates." },
                { name: "Budget Burn Variance Rule", desc: "Flags spent rates exceeding deliverables." },
                { name: "Timesheet Burnout Rule", desc: "Flags consecutive 48+ hr billing timesheets." }
              ].map(rule => (
                <div key={rule.name} className="p-3 bg-secondary/20 border border-border rounded-xl space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    {rule.name}
                  </div>
                  <p className="text-[10px]">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Log Risk Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <h3 className="font-semibold text-foreground">Log Manual Risk</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleLogRisk} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Risk Title / Description Summary</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Scope creep on user access integrations" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Affected Project</label>
                <select 
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                >
                  {loggableProjects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                  {loggableProjects.length === 0 && (
                    <option value="">No projects assigned</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Probability Rating</label>
                  <select 
                    value={formProb}
                    onChange={(e) => setFormProb(e.target.value as any)}
                    className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                  >
                    <option value="Rare">Rare (1)</option>
                    <option value="Unlikely">Unlikely (2)</option>
                    <option value="Possible">Possible (3)</option>
                    <option value="Likely">Likely (4)</option>
                    <option value="Certain">Certain (5)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Impact Rating</label>
                  <select 
                    value={formImp}
                    onChange={(e) => setFormImp(e.target.value as any)}
                    className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                  >
                    <option value="Insignif.">Insignif. (1)</option>
                    <option value="Minor">Minor (2)</option>
                    <option value="Moderate">Moderate (3)</option>
                    <option value="Major">Major (4)</option>
                    <option value="Severe">Severe (5)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Risk Owner / Assigned Mitigation Lead</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Marcus Lee" 
                  value={formOwner}
                  onChange={(e) => setFormOwner(e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Detailed Mitigation & Actions Checklist</label>
                <textarea 
                  rows={3} 
                  placeholder="Steps to handle risk mitigation..." 
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border hover:bg-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-copper hover:opacity-90"
                >
                  Log Risk Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Risk Profile details drawer */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div onClick={() => setSelectedRisk(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

          <div className="relative bg-card border-l border-border h-full w-full max-w-md shadow-elevated flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-primary" />
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Risk Overview</span>
              </div>
              <button 
                onClick={() => setSelectedRisk(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Risk Title</div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  {selectedRisk.severity === "Critical" && <AlertTriangle className="size-4.5 text-red-500" />}
                  {selectedRisk.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-secondary border border-border text-[9px] rounded font-semibold text-muted-foreground">
                    {selectedRisk.project}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    selectedRisk.source === "Automated" ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground border border-border"
                  }`}>
                    {selectedRisk.source}
                  </span>
                </div>
              </div>

              {/* Matrix Scoring Details */}
              <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Assessment Metrics</h4>
                <div className="grid grid-cols-2 gap-y-2.5">
                  <div className="text-muted-foreground">Severity:</div>
                  <div className="text-right">
                    <StatusChip tone={getSeverityTone(selectedRisk.severity)}>{selectedRisk.severity}</StatusChip>
                  </div>
                  <div className="text-muted-foreground">Probability Rating:</div>
                  <div className="font-semibold text-right">{selectedRisk.probability}</div>
                  <div className="text-muted-foreground">Impact Rating:</div>
                  <div className="font-semibold text-right">{selectedRisk.impact}</div>
                  <div className="text-muted-foreground">Assigned Owner:</div>
                  <div className="font-semibold text-right">{selectedRisk.owner}</div>
                  <div className="text-muted-foreground">Identified Date:</div>
                  <div className="font-semibold text-right">{selectedRisk.createdAt}</div>
                </div>
              </div>

              {/* Mitigation / Description details */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Mitigation Strategy Description</div>
                <p className="bg-secondary/30 border border-border rounded-xl p-3 leading-relaxed text-muted-foreground italic">
                  "{selectedRisk.description}"
                </p>
              </div>

              {/* Progress workflow details */}
              <div className="space-y-3">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Mitigation Stages</div>
                <div className="space-y-2 text-xs">
                  {["Identified", "Assessed", "Mitigating", "Monitoring", "Closed"].map((stage, i) => {
                    const stages = ["Identified", "Assessed", "Mitigating", "Monitoring", "Closed"];
                    const currentIdx = stages.indexOf(selectedRisk.status);
                    const isActive = currentIdx === i;
                    const isDone = currentIdx > i;

                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className={`size-5 rounded-full grid place-items-center text-[9px] font-bold transition ${
                          isActive ? "bg-primary text-white scale-110 shadow-copper" :
                          isDone ? "bg-emerald-500 text-white" :
                          "bg-secondary text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <span className={`${
                          isActive ? "font-bold text-foreground" :
                          isDone ? "text-muted-foreground line-through" :
                          "text-muted-foreground"
                        }`}>{stage}</span>
                        {isActive && (
                          <span className="text-[9px] font-bold text-primary uppercase ml-auto">Active</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-border bg-secondary/5 flex gap-2">
              {selectedRisk.status !== "Closed" && canWrite && (
                <button 
                  onClick={() => {
                    const stages: Risk['status'][] = ["Identified", "Assessed", "Mitigating", "Monitoring", "Closed"];
                    const currentIdx = stages.indexOf(selectedRisk.status);
                    if (currentIdx < stages.length - 1) {
                      const next = stages[currentIdx + 1];
                      const updated = risks.map(r => r.id === selectedRisk.id ? { ...r, status: next } : r);
                      saveState(updated);
                      setSelectedRisk({ ...selectedRisk, status: next });
                      toast.success(`Risk status advanced to ${next}.`);
                    }
                  }}
                  className="w-full h-9 rounded-xl bg-primary text-white text-xs font-semibold shadow-copper hover:opacity-90 transition cursor-pointer"
                >
                  Progress Mitigation
                </button>
              )}
              <button 
                onClick={() => setSelectedRisk(null)}
                className="w-full h-9 rounded-xl border border-border hover:bg-secondary text-xs font-semibold cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Risks;
