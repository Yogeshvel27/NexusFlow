"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, CalendarRange, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabase } from "@/lib/supabase";

// ==========================================
// TYPES
// ==========================================

export interface ResourceAllocation {
  id: string;
  projectId: string;
  projectName: string;
  role: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
  isBillable: boolean;
}

export interface Resource {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // Designation
  dept: string;
  status: "Available" | "Allocated" | "Partially Allocated" | "Bench" | "On Leave";
  util: number;
  allocations: ResourceAllocation[];
  skills?: any[];
  manager?: string;
  location?: string;
  employmentType?: string;
  costRate?: number;
  billingRate?: number;
  currency?: string;
  joiningDate?: string;
  experienceYears?: number;
  timesheets?: any[];
}

function mapDbRow(r: any): Resource {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    dept: r.dept,
    status: r.status,
    util: Number(r.utilization_rate),
    allocations: typeof r.allocations === "string" ? JSON.parse(r.allocations) : (r.allocations || []),
    skills: typeof r.skills === "string" ? JSON.parse(r.skills) : (r.skills || []),
    manager: r.manager,
    location: r.location,
    employmentType: r.employment_type || "Full Time",
    costRate: Number(r.cost_rate),
    billingRate: Number(r.billing_rate),
    currency: r.currency || "USD",
    joiningDate: r.joining_date,
    experienceYears: Number(r.experience_years),
    timesheets: typeof r.timesheets === "string" ? JSON.parse(r.timesheets) : (r.timesheets || [])
  };
}

async function syncRelatedTables(updated: (Resource & { timesheets?: any[] })[]) {
  try {
    const resourceIds = updated.map(r => r.id);
    if (resourceIds.length === 0) return;

    const allAllocationsRows: any[] = [];
    const timesheetRows: any[] = [];
    const resourceTimesheetRows: any[] = [];

    updated.forEach(res => {
      // 1. Process allocations
      if (Array.isArray(res.allocations)) {
        res.allocations.forEach((alloc: any) => {
          allAllocationsRows.push({
            id: alloc.id,
            resource_id: res.id,
            project_id: alloc.projectId,
            project_name: alloc.projectName,
            role: alloc.role,
            allocation_percent: Number(alloc.allocationPercent),
            start_date: alloc.startDate,
            end_date: alloc.endDate,
            is_billable: !!alloc.isBillable
          });
        });
      }

      // 2. Process timesheets
      if (Array.isArray(res.timesheets)) {
        res.timesheets.forEach((ts: any) => {
          let dbStatus = "Pending";
          if (ts.status === "Approved" || ts.status === "Locked") {
            dbStatus = "Approved";
          } else if (ts.status === "Rejected") {
            dbStatus = "Rejected";
          }

          timesheetRows.push({
            id: ts.id,
            resource_id: res.id,
            project_id: ts.projectId || null,
            project_name: ts.projectName,
            task_name: ts.taskName,
            date: ts.date,
            hours: Number(ts.hours),
            is_billable: !!ts.isBillable,
            comments: ts.comments || "",
            status: dbStatus
          });

          resourceTimesheetRows.push({
            id: ts.id,
            resource_id: res.id,
            project_id: ts.projectId || null,
            date: ts.date,
            hours: Number(ts.hours),
            description: ts.taskName || ts.comments || "",
            status: ts.status || "Submitted"
          });
        });
      }
    });

    // Sync to resource_allocations
    await supabase.from("resource_allocations").delete().in("resource_id", resourceIds);
    if (allAllocationsRows.length > 0) {
      const { error: allocError } = await supabase
        .from("resource_allocations")
        .upsert(allAllocationsRows, { onConflict: "id" });
      if (allocError) {
        console.error("Failed to sync to resource_allocations:", allocError);
      }
    }

    // Sync to timesheets
    await supabase.from("timesheets").delete().in("resource_id", resourceIds);
    if (timesheetRows.length > 0) {
      const { error: tsError } = await supabase
        .from("timesheets")
        .upsert(timesheetRows, { onConflict: "id" });
      if (tsError) {
        console.error("Failed to sync to timesheets:", tsError);
      }
    }

    // Sync to resource_timesheets
    await supabase.from("resource_timesheets").delete().in("resource_id", resourceIds);
    if (resourceTimesheetRows.length > 0) {
      const { error: rtsError } = await supabase
        .from("resource_timesheets")
        .upsert(resourceTimesheetRows, { onConflict: "id" });
      if (rtsError) {
        console.error("Failed to sync to resource_timesheets:", rtsError);
      }
    }
  } catch (err) {
    console.error("Failed to sync related tables:", err);
  }
}

function Allocation() {
  const { user } = useUser();
  const { orgRole } = useAuth();
  const { projects, updateProjectBudget } = useWorkspace();

  const isProjectManager = orgRole ? orgRole.toLowerCase().includes("project_manager") : false;

  const visibleProjects = React.useMemo(() => {
    return projects.filter(p => {
      if (isProjectManager) {
        return !!user?.fullName && p.projectManager === user.fullName;
      }
      return true;
    });
  }, [projects, isProjectManager, user?.fullName]);

  const [resources, setResources] = useState<Resource[]>([]);
  const [isAddAllocationOpen, setIsAddAllocationOpen] = useState(false);

  // New allocation form
  const [selectedResId, setSelectedResId] = useState("");
  const [projName, setProjName] = useState("");

  useEffect(() => {
    if (visibleProjects.length > 0 && !projName) {
      setProjName(visibleProjects[0].name);
    }
  }, [visibleProjects, projName]);
  const [allocPercent, setAllocPercent] = useState("100");
  const [startD, setStartD] = useState("2025-12-08");
  const [endD, setEndD] = useState("2025-12-19");
  const [allocRole, setAllocRole] = useState("Developer");

  // Start date of the 2-week matrix display (defaults to Monday, Dec 8, 2025)
  const [matrixStartDate, setMatrixStartDate] = useState<Date>(new Date("2025-12-08"));

  const { days, dayLabels } = React.useMemo(() => {
    const datesList: string[] = [];
    const labelsList: string[] = [];
    
    let current = new Date(matrixStartDate);
    let count = 0;
    while (datesList.length < 10 && count < 30) {
      count++;
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday (0) and Saturday (6)
        const dateStr = current.toISOString().split("T")[0];
        datesList.push(dateStr);
        
        const dayName = current.toLocaleDateString("en-US", { weekday: "short" });
        const dayNum = current.toLocaleDateString("en-US", { day: "2-digit" });
        labelsList.push(`${dayName} ${dayNum}`);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return { days: datesList, dayLabels: labelsList };
  }, [matrixStartDate]);

  // Update form dates when matrix window changes
  useEffect(() => {
    if (days && days.length > 0) {
      setStartD(days[0]);
      setEndD(days[days.length - 1]);
    }
  }, [days]);

  // Load state from Supabase, with local storage fallback and real-time synchronization
  useEffect(() => {
    async function loadResources() {
      try {
        const { data, error } = await supabase.from("resources").select("*");
        if (error || !data || data.length === 0) {
          const saved = localStorage.getItem("nexus_resources_v2");
          if (saved) {
            setResources(JSON.parse(saved));
          }
        } else {
          const mapped = data.map(mapDbRow);
          setResources(mapped);
          localStorage.setItem("nexus_resources_v2", JSON.stringify(mapped));
        }
      } catch (err) {
        console.error("Failed to load resources from Supabase:", err);
        const saved = localStorage.getItem("nexus_resources_v2");
        if (saved) {
          setResources(JSON.parse(saved));
        }
      }
    }
    loadResources();

    // Live Supabase postgres_changes channel
    const channel = supabase
      .channel("resources-realtime-alloc")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "resources" }, payload => {
        setResources(prev => {
          if (prev.find(r => r.id === payload.new.id)) return prev;
          const updated = [...prev, mapDbRow(payload.new)];
          localStorage.setItem("nexus_resources_v2", JSON.stringify(updated));
          return updated;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "resources" }, payload => {
        setResources(prev => {
          const updated = prev.map(r => r.id === payload.new.id ? mapDbRow(payload.new) : r);
          localStorage.setItem("nexus_resources_v2", JSON.stringify(updated));
          return updated;
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "resources" }, payload => {
        setResources(prev => {
          const updated = prev.filter(r => r.id !== payload.old.id);
          localStorage.setItem("nexus_resources_v2", JSON.stringify(updated));
          return updated;
        });
      })
      .subscribe();

    // Storage sync listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "nexus_resources_v2" && e.newValue) {
        try {
          setResources(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const saveState = async (updated: Resource[]) => {
    setResources(updated);
    localStorage.setItem("nexus_resources_v2", JSON.stringify(updated));

    try {
      const rows = updated.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: (r as any).phone || "",
        role: r.role,
        dept: r.dept,
        status: r.status,
        utilization_rate: r.util,
        allocations: r.allocations,
        skills: (r as any).skills || [],
        manager: (r as any).manager || "",
        location: (r as any).location || "",
        employment_type: (r as any).employmentType || "Full Time",
        cost_rate: (r as any).costRate || 0,
        billing_rate: (r as any).billingRate || 0,
        currency: (r as any).currency || "USD",
        joining_date: (r as any).joiningDate || null,
        experience_years: (r as any).experienceYears || 0,
        timesheets: (r as any).timesheets || []
      }));

      const { error } = await supabase.from("resources").upsert(rows, { onConflict: "id" });
      if (error) {
        if (error.code === "23505" && error.message.includes("email")) {
          const { error: retryError } = await supabase.from("resources").upsert(rows, { onConflict: "email" });
          if (retryError) {
            console.error("Failed to upsert resources (email conflict retry):", retryError);
            toast.error(`Database sync failed: ${retryError.message}`);
          } else {
            await syncRelatedTables(updated);
          }
        } else {
          console.error("Failed to upsert resources in Supabase:", error);
          toast.error(`Database sync failed: ${error.message}`);
        }
      } else {
        await syncRelatedTables(updated);
      }
    } catch (err) {
      console.error("Failed to upsert resources in Supabase:", err);
    }
  };

  const notifyITAdminOfAllocation = async (
    resourceName: string,
    projectName: string,
    managerName: string,
    role: string
  ) => {
    try {
      const { data: admins } = await supabase
        .from("users")
        .select("email")
        .or("role.eq.IT Administrator,role.eq.Admin,role.eq.IT Administrators");

      const adminEmails = admins && admins.length > 0
        ? admins.map(u => u.email)
        : ["gnmhs123@gmail.com"];

      for (const email of adminEmails) {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email,
            employeeName: resourceName,
            projectName: projectName,
            projectManager: managerName,
            projectRole: role,
            notificationType: "project"
          })
        });
      }
    } catch (err) {
      console.error("Failed to notify IT Admin of allocation:", err);
    }
  };

  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) {
      toast.error("Please select a resource.");
      return;
    }

    const res = resources.find(r => r.id === selectedResId);
    if (!res) return;

    const percent = Number(allocPercent) || 0;
    const currentLoad = res.allocations.reduce((sum, a) => sum + a.allocationPercent, 0);

    if (currentLoad + percent > 100) {
      toast.warning(`Warning: ${res.name} will be overallocated (${currentLoad + percent}% workload).`);
    }

    // Find target project to get correct project ID and update budget
    const targetProject = projects.find(p => p.name === projName);
    const projectId = targetProject ? targetProject.id : `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAlloc: ResourceAllocation = {
      id: `AL-${Math.floor(100 + Math.random() * 900)}`,
      projectId: projectId,
      projectName: projName,
      role: allocRole,
      allocationPercent: percent,
      startDate: startD,
      endDate: endD,
      isBillable: true
    };

    // Calculate allocation cost and deduct from project budget
    const diffTime = Math.abs(new Date(endD).getTime() - new Date(startD).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const businessDays = Math.max(1, Math.ceil(diffDays * 5 / 7));
    const allocatedHours = businessDays * 8 * (percent / 100);
    const costRateVal = (res as any).costRate || 80;
    const allocationCost = Math.round(allocatedHours * costRateVal);

    if (targetProject) {
      const newBudget = Math.max(0, targetProject.budget - allocationCost);
      const newSpent = (targetProject.spent || 0) + allocationCost;
      updateProjectBudget(targetProject.id, newBudget, newSpent);
      toast.success(
        `Budget updated: Deducted $${allocationCost.toLocaleString()} from "${targetProject.name}" ` +
        `(${Math.round(allocatedHours)} hrs @ $${costRateVal}/hr).`
      );
    }

    const updated = resources.map(r => {
      if (r.id === selectedResId) {
        const nextAllocations = [...r.allocations, newAlloc];
        const nextLoad = nextAllocations.reduce((sum, a) => sum + a.allocationPercent, 0);
        let nextStatus: Resource['status'] = "Partially Allocated";
        if (nextLoad >= 100) nextStatus = "Allocated";
        else if (nextLoad === 0) nextStatus = "Bench";

        return {
          ...r,
          status: nextStatus,
          allocations: nextAllocations,
          util: nextLoad // Update utilization rate
        };
      }
      return r;
    });

    saveState(updated);
    setIsAddAllocationOpen(false);
    toast.success(`Allocated ${res.name} to ${projName} at ${percent}% capacity.`);
    notifyITAdminOfAllocation(
      res.name,
      projName,
      user?.fullName || "System",
      allocRole || "Resource"
    );
  };

  // Math calculations
  const totalCapacityHours = resources.length * 80; // 80 hrs over 2 weeks per resource
  const totalAllocatedHours = resources.reduce((sum, r) => {
    const totalLoadPercent = r.allocations.reduce((load, a) => load + a.allocationPercent, 0);
    return sum + (totalLoadPercent / 100) * 80;
  }, 0);

  const avgUtilization = Math.round((totalAllocatedHours / (totalCapacityHours || 1)) * 100);
  
  // Count conflicts: resources with total load > 100
  const conflictsCount = resources.filter(r => {
    const totalLoadPercent = r.allocations.reduce((load, a) => load + a.allocationPercent, 0);
    return totalLoadPercent > 100;
  }).length;

  // Colors mapping for projects visual aesthetics
  const getProjectBg = (proj: string) => {
    if (proj.includes("Atlas")) return "linear-gradient(135deg, #C67C4E, #C67C4Ecc)";
    if (proj.includes("Helix")) return "linear-gradient(135deg, #D4A373, #D4A373cc)";
    if (proj.includes("Nimbus")) return "linear-gradient(135deg, #78716C, #78716Ccc)";
    return "linear-gradient(135deg, #57534E, #57534Ecc)";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Resource Allocation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Interactive workload allocation matrix · {days.length > 0 ? `${new Date(days[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(days[days.length - 1]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Dec 8 – Dec 19, 2025"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Week Navigation controls */}
          <div className="flex items-center bg-[#17191E] border border-[#1F2228] rounded-xl p-1 shrink-0 gap-1.5 h-10">
            <button 
              type="button"
              onClick={() => {
                const prev = new Date(matrixStartDate);
                prev.setDate(prev.getDate() - 7);
                setMatrixStartDate(prev);
              }}
              className="p-1.5 rounded-lg hover:bg-[#20242D] text-stone-400 hover:text-white transition cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-semibold text-stone-200 select-none px-1">
              {matrixStartDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
            <button 
              type="button"
              onClick={() => {
                const next = new Date(matrixStartDate);
                next.setDate(next.getDate() + 7);
                setMatrixStartDate(next);
              }}
              className="p-1.5 rounded-lg hover:bg-[#20242D] text-stone-400 hover:text-white transition cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const day = today.getDay();
              const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
              setMatrixStartDate(new Date(today.setDate(diff)));
            }}
            className="h-10 px-3.5 rounded-xl border border-[#1F2228] bg-[#121417] hover:bg-[#20242D] text-xs font-semibold text-stone-200 transition cursor-pointer"
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => {
              setMatrixStartDate(new Date("2025-12-08"));
            }}
            className="h-10 px-3.5 rounded-xl border border-[#1F2228] bg-[#121417] hover:bg-[#20242D] text-xs font-semibold text-stone-200 transition cursor-pointer"
            title="Jump to Mock Project data window (December 2025)"
          >
            Dec 2025
          </button>

          <button 
            type="button"
            onClick={() => setIsAddAllocationOpen(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
          >
            <Plus className="size-4" />Assign Project
          </button>
        </div>
      </div>

      {/* Dynamic KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Available Capacity", v: `${totalCapacityHours.toLocaleString()} hrs` },
          { l: "Allocated Hours", v: `${Math.round(totalAllocatedHours).toLocaleString()} hrs` },
          { l: "Utilization Rate", v: `${avgUtilization}%` },
          { l: "Allocation Conflicts", v: conflictsCount, t: conflictsCount > 0 ? "text-red-500 font-bold" : "" },
        ].map((s) => (
          <div key={s.l} className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums text-foreground ${s.t ?? ""}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Allocation Matrix Grid */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            {/* Headers row */}
            <div className="grid grid-cols-[220px_repeat(10,1fr)] sticky top-0 z-10 bg-secondary/80 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <div className="px-4 py-3 font-semibold">Resource Directory</div>
              {dayLabels.map((d) => (
                <div key={d} className="px-2 py-3 text-center font-semibold border-l border-border">{d}</div>
              ))}
            </div>

            {/* Resources list rows */}
            {resources.map((r) => {
              const totalLoad = r.allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
              const totalAllocatedHrs = (totalLoad / 100) * 80;
              const hasConflict = totalLoad > 100;

              return (
                <div key={r.id} className="grid grid-cols-[220px_repeat(10,1fr)] border-b border-border hover:bg-secondary/20 transition">
                  {/* Name cell details */}
                  <div className="px-4 py-3 flex items-center gap-3 bg-secondary/5 border-r border-border">
                    <div className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-semibold text-white">
                      {r.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {Math.round(totalAllocatedHrs)}h / 80h {hasConflict && <AlertCircle className="size-3 text-red-500 fill-red-500/10" />}
                      </div>
                    </div>
                  </div>

                  {/* Daily cells */}
                  {days.map((day) => {
                    // Find active allocations covering this day
                    const activeAllocations = r.allocations.filter(a => {
                      return day >= a.startDate && day <= a.endDate;
                    });

                    return (
                      <div key={day} className="border-l border-border p-1.5 min-h-[68px] flex flex-col gap-1 justify-center bg-card/40">
                        {activeAllocations.map(a => (
                          <div 
                            key={a.id} 
                            className="rounded-lg p-1.5 text-[9px] font-bold text-white shadow-soft cursor-pointer hover:scale-102 transition"
                            style={{ background: getProjectBg(a.projectName) }}
                            title={`${a.projectName} (${a.allocationPercent}% allocation)`}
                          >
                            <div className="truncate leading-tight">{a.projectName.split(" ")[0]}</div>
                            <div className="opacity-90 text-[8px] font-medium mt-0.5">{a.allocationPercent}%</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ALLOCATION DIALOG */}
      {isAddAllocationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddAllocationOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <h3 className="font-semibold text-foreground text-sm">Assign Resource to Project</h3>
              <button 
                onClick={() => setIsAddAllocationOpen(false)} 
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddAllocation} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Select Team Member</label>
                <select 
                  value={selectedResId}
                  onChange={(e) => setSelectedResId(e.target.value)}
                  required
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                >
                  <option value="">Choose a resource...</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Assign Project</label>
                <select 
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                >
                  {visibleProjects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Workload Capacity %</label>
                  <select 
                    value={allocPercent}
                    onChange={(e) => setAllocPercent(e.target.value)}
                    className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                  >
                    <option value="20">20% workload</option>
                    <option value="40">40% workload</option>
                    <option value="60">60% workload</option>
                    <option value="80">80% workload</option>
                    <option value="100">100% (Full Time)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Project Role</label>
                  <input 
                    type="text" 
                    required 
                    value={allocRole}
                    onChange={(e) => setAllocRole(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Start Date</label>
                  <input 
                    type="date" 
                    required 
                    value={startD}
                    onChange={(e) => setStartD(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">End Date</label>
                  <input 
                    type="date" 
                    required 
                    value={endD}
                    onChange={(e) => setEndD(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddAllocationOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border hover:bg-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-copper hover:opacity-90"
                >
                  Assign Workload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Allocation;
