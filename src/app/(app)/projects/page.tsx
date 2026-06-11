"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Search, Filter, Plus, ArrowUpDown, MoreHorizontal, X, ShieldAlert } from "lucide-react";
import { StatusChip, statusTone } from "@/components/status-chip";
import { ProgressBar } from "@/components/progress-bar";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatCurrency, resources } from "@/lib/mock";
import { Project } from "@/lib/store";

function Projects() {
  const router = useRouter();
  const { projects, tasks, createProject } = useWorkspace();
  const { orgRole } = useAuth();
  const { user } = useUser();
  
  const isMember = orgRole === "org:member";
  
  const canCreate = !orgRole || 
    orgRole.toLowerCase().includes("admin") || 
    orgRole.toLowerCase().includes("project_manager") || 
    orgRole.toLowerCase().includes("department_head");

  const assignedProjectIds = React.useMemo(() => {
    return new Set(
      projects
        .filter(p => 
          (user?.fullName && p.projectManager === user.fullName) || 
          tasks.some(t => t.projectId === p.id && user?.fullName && t.assignee === user.fullName)
        )
        .map(p => p.id)
    );
  }, [projects, tasks, user?.fullName]);
  
  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // New Project Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState<Project['priority']>("Medium");
  const [description, setDescription] = useState("");
  const [projectManager, setProjectManager] = useState("");

  React.useEffect(() => {
    if (user) {
      setProjectManager(user.fullName || user.firstName || "System");
    }
  }, [user]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const pm = user?.fullName || user?.firstName || "System";
    if (!name || !client || !budget || !startDate || !endDate) return;

    createProject({
      name,
      client,
      department,
      budget: Number(budget),
      startDate,
      endDate,
      priority,
      description,
      projectManager: pm
    });

    // Reset Form
    setName("");
    setClient("");
    setBudget("");
    setStartDate("");
    setEndDate("");
    setPriority("Medium");
    setDescription("");
    setProjectManager(pm);
    setShowModal(false);
  };

  // Visible projects for this user
  const visibleProjects = React.useMemo(() => {
    return projects.filter(p => {
      if (!isMember) return true;
      return assignedProjectIds.has(p.id);
    });
  }, [projects, isMember, assignedProjectIds]);

  // Filter projects list
  const filteredProjects = visibleProjects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase()) ||
      p.projectManager.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const total = visibleProjects.length;
  const onTrack = visibleProjects.filter(p => p.status === "In Progress" || p.status === "Approved").length;
  const atRisk = visibleProjects.filter(p => p.status === "Delayed" || p.status === "On Hold").length;
  const completed = visibleProjects.filter(p => p.status === "Completed" || p.status === "Closed").length;

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredProjects.length} engagements in view</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold shadow-copper inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="size-4" />New project
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Total Projects", v: total, t: "text-stone-800 dark:text-stone-200" },
          { l: "On Track / Active", v: onTrack, t: "text-emerald-600 dark:text-emerald-400" },
          { l: "At Risk / Delayed", v: atRisk, t: "text-amber-600 dark:text-amber-400" },
          { l: "Completed", v: completed, t: "text-primary" },
        ].map((s) => (
          <div key={s.l} className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{s.l}</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${s.t}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        
        {/* Table Filters */}
        <div className="px-5 py-3 flex items-center gap-3 border-b border-border flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search projects, clients, managers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary/60 text-sm border border-transparent focus:bg-card focus:border-border focus:outline-none"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border text-xs bg-card focus:outline-none cursor-pointer"
          >
            <option value="All">All statuses</option>
            {["Draft", "Pending Approval", "Approved", "In Progress", "On Hold", "Delayed", "Completed", "Closed"].map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <div className="ml-auto text-xs text-muted-foreground font-semibold">{filteredProjects.length} projects shown</div>
        </div>

        {/* Projects List Table */}
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-semibold px-6 py-3">Project</th>
              <th className="text-left font-semibold px-3 py-3">Status</th>
              <th className="text-left font-semibold px-3 py-3">Department</th>
              <th className="text-right font-semibold px-3 py-3">Budget</th>
              <th className="text-left font-semibold px-3 py-3">Project Manager</th>
              <th className="text-right font-semibold px-6 py-3">Start / End Date</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p) => {
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="border-t border-border hover:bg-secondary/40 transition group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-primary transition">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.code} · {p.client}</div>
                  </td>
                  <td className="px-3"><StatusChip tone={statusTone(p.status)}>{p.status}</StatusChip></td>
                  <td className="px-3 text-xs text-muted-foreground font-medium">{p.department}</td>
                  <td className="px-3 text-right font-semibold tabular-nums">{formatCurrency(p.budget)}</td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-semibold text-white uppercase">
                        {p.projectManager.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="text-xs font-semibold">{p.projectManager}</span>
                    </div>
                  </td>
                  <td className="px-6 text-right text-xs text-muted-foreground font-medium">
                    {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${p.id}`);
                      }}
                      className="size-8 grid place-items-center rounded-md hover:bg-secondary opacity-0 group-hover:opacity-100 transition"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredProjects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-xs text-muted-foreground italic">
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-xl shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <h3 className="text-sm font-semibold flex items-center gap-1.5"><ShieldAlert className="size-4.5 text-primary" /> Create New Project</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Project Name</label>
                  <input
                    required
                    placeholder="Enter project name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Client</label>
                  <input
                    required
                    placeholder="e.g. Northwind Capital"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {["Engineering", "Design", "Product", "Data", "QA", "DevOps"].map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Budget ($)</label>
                  <input
                    required
                    type="number"
                    placeholder="e.g. 500000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Project Manager</label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={projectManager || "System"}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/30 border border-border text-muted-foreground focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Start Date</label>
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">End Date</label>
                  <input
                    required
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Priority</label>
                  <div className="flex gap-4">
                    {["Low", "Medium", "High", "Critical"].map(pr => (
                      <label key={pr} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          checked={priority === pr}
                          onChange={() => setPriority(pr as any)}
                          className="size-3.5 border-border text-primary focus:ring-primary"
                        />
                        <span>{pr}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter project specifications..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold shadow-copper"
                >
                  Save Draft
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Projects;
