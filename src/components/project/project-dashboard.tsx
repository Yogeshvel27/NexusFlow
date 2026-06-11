"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Clock, TrendingUp, AlertCircle, BarChart3, Users, DollarSign, Plus, Trash2, X, UserPlus, Search, Eye, User, ChevronDown, Mail, Phone, MapPin, Award, Calendar } from "lucide-react";
import { Project, WorkItem } from "@/lib/store";
import { KpiCard } from "@/components/kpi-card";
import { ProgressBar } from "@/components/progress-bar";
import { formatCurrency } from "@/lib/mock";
import { StatusChip, statusTone } from "@/components/status-chip";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

const getAvatarColor = (name: string) => {
  const colors = [
    { bg: "bg-[#FDF2EC]", text: "text-[#C67C4E]" }, // peach
    { bg: "bg-[#F0EBF8]", text: "text-[#8B5CF6]" }, // purple
    { bg: "bg-[#E6F4EA]", text: "text-[#22C55E]" }, // green
    { bg: "bg-[#E5F6FD]", text: "text-[#0EA5E9]" }, // blue
    { bg: "bg-[#FEF6EC]", text: "text-[#D4A373]" }, // gold
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface ProjectDashboardProps {
  project: Project;
  tasks: WorkItem[];
  canManageMembers: boolean;
  allResources: any[];
  triggerAddMember?: boolean;
  onTriggerAddMemberReset?: () => void;
}

export function ProjectDashboard({ 
  project, 
  tasks, 
  canManageMembers, 
  allResources,
  triggerAddMember,
  onTriggerAddMemberReset
}: ProjectDashboardProps) {
  const { updateProjectMembers } = useWorkspace();
  
  // Filter tasks belonging to this project
  const projectTasks = tasks.filter(t => t.projectId === project.id);

  const assignedMemberNames = React.useMemo(() => {
    return new Set([
      ...(project.teamMembers || []),
      ...projectTasks.map(t => t.assignee).filter(Boolean) as string[]
    ]);
  }, [project.teamMembers, projectTasks]);

  const assignableResources = allResources.filter(res => !assignedMemberNames.has(res.name));
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedResourceName, setSelectedResourceName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [projectRole, setProjectRole] = useState("Team Member");
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  React.useEffect(() => {
    if (isAddModalOpen) {
      setSearchQuery("");
      setSelectedDept("All Departments");
      setSelectedResourceName("");
      setProjectRole("Team Member");
      setVisibleCount(5);
    }
  }, [isAddModalOpen]);

  const departments = React.useMemo(() => {
    const depts = new Set<string>();
    allResources.forEach((r: any) => {
      if (r.dept) depts.add(r.dept);
    });
    return Array.from(depts);
  }, [allResources]);

  const filteredResources = React.useMemo(() => {
    return assignableResources.filter((res: any) => {
      const email = `${res.name.toLowerCase().replace(/\s+/g, ".")}@nexusflow.com`;
      const matchesSearch = 
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.dept && res.dept.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesDept = 
        selectedDept === "All Departments" || 
        res.dept === selectedDept;
        
      return matchesSearch && matchesDept;
    });
  }, [assignableResources, searchQuery, selectedDept]);

  const handleViewProfile = (res: any) => {
    setSelectedProfile(res);
  };

  const handleFormSubmit = () => {
    if (!selectedResourceName) return;
    const updated = [...(project.teamMembers || []), selectedResourceName];
    updateProjectMembers(project.id, updated);
    setSelectedResourceName("");
    setIsAddModalOpen(false);
  };

  React.useEffect(() => {
    if (triggerAddMember) {
      setIsAddModalOpen(true);
      if (onTriggerAddMemberReset) {
        onTriggerAddMemberReset();
      }
      setTimeout(() => {
        const element = document.getElementById("assigned-team-members-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [triggerAddMember, onTriggerAddMemberReset]);

  const handleRemoveMember = (memberName: string) => {
    const updated = (project.teamMembers || []).filter(m => m !== memberName);
    updateProjectMembers(project.id, updated);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceName) return;
    const updated = [...(project.teamMembers || []), selectedResourceName];
    updateProjectMembers(project.id, updated);
    setSelectedResourceName("");
    setIsAddModalOpen(false);
  };

  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === "Done").length;
  const openTasks = projectTasks.filter(t => t.status !== "Done" && t.status !== "Cancelled").length;
  const blockedTasks = projectTasks.filter(t => t.status === "Blocked").length;
  const delayedTasks = projectTasks.filter(t => {
    if (t.status === "Done") return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Budget utilization
  const budgetSpent = projectTasks.reduce((acc, t) => {
    // lookup assignee hourly billing rate
    const resource = allResources.find(r => r.name === t.assignee);
    const billingRate = resource?.dept === "Engineering" ? 120 : 100; // default billing rate estimate
    return acc + (t.actualHours * billingRate);
  }, 0);

  const updatedProjectSpent = project.spent + budgetSpent;
  const budgetUtilization = project.budget > 0 ? Math.round((updatedProjectSpent / project.budget) * 100) : 0;

  // Chart data: Status
  const statusCounts: Record<string, number> = {};
  projectTasks.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });
  const statusData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status]
  }));

  // Chart data: Priority
  const priorityCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  projectTasks.forEach(t => {
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
  });
  const priorityData = Object.keys(priorityCounts).map(prio => ({
    name: prio,
    value: priorityCounts[prio]
  }));

  // Chart data: Assignee
  const assigneeCounts: Record<string, number> = {};
  projectTasks.forEach(t => {
    if (t.assignee) {
      assigneeCounts[t.assignee] = (assigneeCounts[t.assignee] || 0) + 1;
    } else {
      assigneeCounts["Unassigned"] = (assigneeCounts["Unassigned"] || 0) + 1;
    }
  });
  const assigneeData = Object.keys(assigneeCounts).map(ass => ({
    name: ass,
    tasks: assigneeCounts[ass]
  }));

  const COLORS = ["#D4A373", "#C67C4E", "#22C55E", "#EF4444", "#a8a29e", "#8b5cf6", "#f43f5e", "#0ea5e9"];

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Tasks"
          value={String(totalTasks)}
          hint={`${openTasks} open, ${completedTasks} done`}
          icon={<BarChart3 className="size-4" />}
          accent="primary"
        />
        <KpiCard
          label="Task Completion"
          value={`${completionRate}%`}
          hint="of targeted work items"
          icon={<TrendingUp className="size-4" />}
          accent="success"
        />
        <KpiCard
          label="Blocked Tasks"
          value={String(blockedTasks)}
          hint="items requiring attention"
          icon={<AlertCircle className="size-4" />}
          accent="danger"
        />
        <KpiCard
          label="Delayed Tasks"
          value={String(delayedTasks)}
          hint="passed target due dates"
          icon={<Clock className="size-4" />}
          accent="warning"
        />
      </div>

      {/* Financials & Resource Status */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Budget Utilization */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="size-5 text-primary" />
            <h3 className="font-semibold">Budget & Financials</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Budget Utilization</span>
              <span className="font-semibold">{budgetUtilization}%</span>
            </div>
            <ProgressBar value={budgetUtilization} tone={budgetUtilization > 90 ? "danger" : budgetUtilization > 75 ? "warning" : "primary"} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <div className="text-muted-foreground">Allocated Budget</div>
              <div className="text-lg font-bold mt-0.5">{formatCurrency(project.budget)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Estimated Spend</div>
              <div className="text-lg font-bold mt-0.5">{formatCurrency(updatedProjectSpent)}</div>
            </div>
          </div>
        </div>

        {/* Resources allocated */}
        <div id="assigned-team-members-section" className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <div className="flex items-center gap-2 pb-1">
              <Users className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Assigned Team Members</h3>
            </div>
            {canManageMembers && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="h-8 px-2.5 rounded-lg border border-border text-[11px] font-medium hover:bg-secondary inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <UserPlus className="size-3.5 text-primary" /> Assign Member
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-muted-foreground border-b border-border pb-2">
                  <th className="font-semibold pb-2">Person</th>
                  <th className="font-semibold pb-2">Department</th>
                  <th className="font-semibold pb-2 text-right">Est. Hours</th>
                  <th className="font-semibold pb-2 text-right">Actual Hours</th>
                  {canManageMembers && <th className="font-semibold pb-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {allResources.map((res: any) => {
                  if (!assignedMemberNames.has(res.name)) return null;

                  const resTasks = projectTasks.filter(t => t.assignee === res.name);
                  const estHr = resTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
                  const actHr = resTasks.reduce((sum, t) => sum + t.actualHours, 0);
                  const isExplicitlyAssigned = project.teamMembers?.includes(res.name);

                  return (
                    <tr key={res.id} className="border-b border-border/40 last:border-none">
                      <td className="py-2.5 font-medium flex items-center gap-2">
                        <div className="size-6 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[8px] font-bold text-white uppercase">
                          {res.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <span className="text-foreground">{res.name}</span>
                          {isExplicitlyAssigned && (
                            <span className="ml-1.5 px-1 py-0.5 rounded bg-primary/10 text-[9px] text-primary border border-primary/20 font-medium">
                              Assigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{res.dept}</td>
                      <td className="py-2.5 text-right tabular-nums">{estHr}h</td>
                      <td className="py-2.5 text-right tabular-nums">{actHr}h</td>
                      {canManageMembers && (
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleRemoveMember(res.name)}
                            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-500 transition cursor-pointer"
                            title="Remove assignment"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Task analytics charts */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Status Breakdown (Pie) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col h-80">
          <h4 className="text-sm font-semibold mb-4">Tasks by Status</h4>
          {statusData.length > 0 ? (
            <div className="flex-1 min-h-0 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} tasks`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalTasks}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Tasks</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No tasks found</div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col h-80">
          <h4 className="text-sm font-semibold mb-4">Tasks by Priority</h4>
          {projectTasks.length > 0 ? (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer>
                <BarChart data={priorityData} margin={{ left: -25 }}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} tasks`]} />
                  <Bar dataKey="value" fill="#C67C4E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No tasks found</div>
          )}
        </div>

        {/* Workload Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col h-80">
          <h4 className="text-sm font-semibold mb-4">Tasks by Assignee</h4>
          {assigneeData.length > 0 ? (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer>
                <BarChart data={assigneeData} layout="vertical" margin={{ left: -10 }}>
                  <XAxis type="number" fontSize={10} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" fontSize={9} tickLine={false} width={80} />
                  <Tooltip formatter={(value) => [`${value} tasks`]} />
                  <Bar dataKey="tasks" fill="#D4A373" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No tasks found</div>
          )}
        </div>

      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
          
          <div className="relative bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-start justify-between">
              <div className="flex gap-2.5 items-center">
                <div className="size-8.5 rounded-lg bg-[#FAF5F2] flex items-center justify-center shrink-0">
                  <UserPlus className="size-4.5 text-[#C67C4E]" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    Assign Team Member
                  </h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">Add an organization resource to this project.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-750 transition cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5">
              {/* Search Bar */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <Search className="size-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search by name, email or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9.5 pl-8.5 pr-4 border border-stone-200 bg-[#FAF7F5] rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/45 transition"
                />
              </div>

              {/* Team Members Header with department filter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[11px] text-stone-850">Team Members</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-[9px] font-semibold text-stone-600">
                    {filteredResources.length}
                  </span>
                </div>
                
                {/* Department Dropdown */}
                <div className="relative">
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="h-7 pl-2.5 pr-7 border border-stone-200 rounded-lg bg-white text-[10px] font-medium text-stone-700 focus:outline-none focus:ring-1 focus:ring-primary/40 transition cursor-pointer appearance-none"
                  >
                    <option value="All Departments">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <ChevronDown className="size-3" />
                  </span>
                </div>
              </div>

              {/* Team Members List */}
              <div className="space-y-1.5 max-h-[210px] overflow-y-auto pr-1">
                {filteredResources.slice(0, visibleCount).map((res) => {
                  const isSelected = selectedResourceName === res.name;
                  const initials = res.name.split(" ").map((n: string) => n[0]).join("");
                  const email = `${res.name.toLowerCase().replace(/\s+/g, ".")}@nexusflow.com`;
                  const avatarTheme = getAvatarColor(res.name);
                  
                  return (
                    <div 
                      key={res.id} 
                      onClick={() => setSelectedResourceName(res.name)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border border-transparent transition cursor-pointer hover:bg-stone-50/80 ${
                        isSelected ? "bg-[#FCFAF7] border-[#EADAD0]/40" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Radio selection circle */}
                        <div>
                          {isSelected ? (
                            <div className="size-4.5 rounded-full bg-[#C67C4E] flex items-center justify-center text-white border-none shrink-0 shadow-sm">
                              <svg className="size-2 stroke-white fill-none stroke-[3]" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </div>
                          ) : (
                            <div className="size-4.5 rounded-full border border-stone-300 bg-white shrink-0" />
                          )}
                        </div>

                        {/* Avatar */}
                        <div className={`size-8.5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarTheme.bg} ${avatarTheme.text}`}>
                          {initials}
                        </div>

                        {/* Details */}
                        <div>
                          <div className="font-semibold text-stone-900 text-[11px]">{res.name}</div>
                          <div className="text-[9px] text-stone-500 font-medium">
                            {res.role || "Team Member"} • {res.dept}
                          </div>
                          <div className="text-[9px] text-stone-400 font-mono mt-0.5">{email}</div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-3.5">
                        {/* Status dot */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="size-1.2 rounded-full bg-[#22C55E]" />
                          <span className="text-[9px] font-semibold text-stone-600">Available</span>
                        </div>

                        {/* View button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(res);
                          }}
                          className="h-6 px-2 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-lg text-[9px] font-medium text-stone-700 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="size-2.5 text-stone-500" />
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredResources.length === 0 && (
                  <div className="text-center py-6 text-stone-400 text-[11px]">
                    No assignable members found.
                  </div>
                )}
              </div>

              {/* Load More Button */}
              {filteredResources.length > visibleCount && (
                <div className="flex justify-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="text-[10px] font-semibold text-[#C67C4E] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>→</span> Load more members
                  </button>
                </div>
              )}

              {/* Project Role Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[11px] text-stone-700">Project Role</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                    <User className="size-3.5" />
                  </span>
                  <select
                    value={projectRole}
                    onChange={(e) => setProjectRole(e.target.value)}
                    className="w-full h-9.5 pl-8.5 pr-8 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/60 transition cursor-pointer appearance-none text-[11px] font-semibold"
                  >
                    <option value="Team Member">Team Member</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Viewer">Viewer</option>
                    <option value="Lead">Lead</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <ChevronDown className="size-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-stone-100 flex gap-2.5 bg-stone-50/30">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 h-9.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 transition cursor-pointer text-[11px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={!selectedResourceName}
                className="flex-1 h-9.5 rounded-xl bg-[#C67C4E] text-white font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition cursor-pointer text-[11px]"
              >
                Assign Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Drawer */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-end">
          <div onClick={() => setSelectedProfile(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          
          <div className="relative bg-card border-l border-border h-full w-full max-w-lg shadow-elevated flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Member Profile</span>
              </div>
              <button 
                onClick={() => setSelectedProfile(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Profile top details */}
            <div className="px-6 py-5 border-b border-border/60 flex items-center gap-4 bg-secondary/10">
              <div className="size-14 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-lg font-bold text-white uppercase shrink-0">
                {selectedProfile.name.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold truncate text-foreground">{selectedProfile.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{selectedProfile.role || "Team Member"} · {selectedProfile.dept || "General"}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <StatusChip tone={statusTone(selectedProfile.status || "Available")}>{selectedProfile.status || "Available"}</StatusChip>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Contact & Basic Info */}
              <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Contact & Basic Info</h4>
                <div className="grid grid-cols-2 gap-y-2.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="size-3" />
                    Email:
                  </div>
                  <div className="font-semibold text-right truncate">
                    {selectedProfile.email || `${selectedProfile.name.toLowerCase().replace(/\s+/g, ".")}@nexusflow.com`}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="size-3" />
                    Role:
                  </div>
                  <div className="font-semibold text-right">{selectedProfile.role || "Team Member"}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3" />
                    Department:
                  </div>
                  <div className="font-semibold text-right">{selectedProfile.dept || "General"}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Award className="size-3" />
                    Utilization:
                  </div>
                  <div className="font-semibold text-right">{selectedProfile.util ?? 0}%</div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Skills & Expertise</h4>
                {selectedProfile.skills && selectedProfile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProfile.skills.map((sk: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No skills listed.</p>
                )}
              </div>

              {/* Allocation */}
              <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Current Allocation</h4>
                <div className="grid grid-cols-2 gap-y-2.5">
                  <div className="text-muted-foreground">Allocation:</div>
                  <div className="font-semibold text-right">{selectedProfile.allocation ?? 0}%</div>
                  <div className="text-muted-foreground">Status:</div>
                  <div className="font-semibold text-right">
                    <StatusChip tone={statusTone(selectedProfile.status || "Available")}>{selectedProfile.status || "Available"}</StatusChip>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Action */}
            <div className="p-6 border-t border-border bg-secondary/5">
              <button 
                onClick={() => setSelectedProfile(null)}
                className="w-full h-9 rounded-xl border border-border hover:bg-secondary text-xs font-semibold cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
