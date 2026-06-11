"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useAuth, useOrganization } from "@clerk/nextjs";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ProjectDashboard } from "@/components/project/project-dashboard";
import { ProjectKanban } from "@/components/project/project-kanban";
import { ProjectBacklog } from "@/components/project/project-backlog";
import { ProjectGantt } from "@/components/project/project-gantt";
import {
  ChevronLeft,
  Building,
  Briefcase,
  Users,
  User,
  Calendar,
  Wallet,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ClipboardList,
  Activity,
  UserPlus
} from "lucide-react";
import { StatusChip, statusTone } from "@/components/status-chip";
import { formatCurrency, resources } from "@/lib/mock";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { projects, tasks, updateProjectStatus } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"dashboard" | "kanban" | "backlog" | "gantt" | "audit">("dashboard");
  const [triggerAddMember, setTriggerAddMember] = useState(false);

  // Audit comments state
  const [auditComment, setAuditComment] = useState("");
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { user } = useUser();
  const { orgRole } = useAuth();
  const { organization, memberships } = useOrganization({
    memberships: { limit: 50, infinite: false }
  });

  const isMember = orgRole === "org:member";

  const projectId = params?.id as string;
  const project = projects.find(p => p.id === projectId);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "Low":
        return "border-stone-200 bg-stone-100/50 text-stone-600 dark:border-stone-700/50 dark:bg-stone-800/30 dark:text-stone-400";
      case "Medium":
        return "border-[#C67C4E]/20 bg-[#C67C4E]/5 text-[#C67C4E]";
      case "High":
        return "border-[#D4A373]/20 bg-[#D4A373]/5 text-[#D4A373]";
      case "Critical":
        return "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400";
      default:
        return "border-stone-200 bg-stone-100/50 text-stone-600";
    }
  };

  const isAssigned = React.useMemo(() => {
    if (!project) return false;
    return (
      (user?.fullName && project.projectManager === user.fullName) ||
      tasks.some(t => t.projectId === project.id && user?.fullName && t.assignee === user.fullName)
    );
  }, [project, tasks, user?.fullName]);

  const allResources = React.useMemo(() => {
    const list = [...resources];
    if (memberships?.data) {
      memberships.data.forEach((m: any) => {
        // Exclude administrators (org:admin)
        if (m.role === "org:admin") return;

        const name = [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(" ") || m.publicUserData?.identifier || "Unknown";
        if (!list.some(r => r.name.toLowerCase() === name.toLowerCase())) {
          list.push({
            id: m.publicUserData?.userId || m.id,
            name: name,
            role: "Member",
            dept: "Engineering",
            skills: [],
            status: "Available",
            util: 0,
            allocation: 0
          });
        }
      });
    }
    return list;
  }, [memberships?.data]);

  if (!project || (isMember && !isAssigned)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-muted-foreground">You do not have permission or are not assigned to this project.</p>
        <button
          onClick={() => router.push("/projects")}
          className="h-9 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-secondary inline-flex items-center gap-1.5"
        >
          <ChevronLeft className="size-4" /> Back to Projects
        </button>
      </div>
    );
  }

  // Handle workflow transitions
  const handleTransition = (toStatus: typeof project.status) => {
    const comment = auditComment.trim() || undefined;
    const success = updateProjectStatus(project.id, toStatus, comment);
    if (success) {
      setAuditComment("");
      setShowStatusMenu(false);
    }
  };

  // Helper for tab styling
  const tabClass = (tab: typeof activeTab) =>
    `h-9 px-4 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
      activeTab === tab
        ? "bg-primary text-white shadow-copper"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">
      
      {/* Back & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/projects")}
          className="h-8 px-2.5 rounded-lg border border-border text-xs font-semibold hover:bg-secondary inline-flex items-center gap-1"
        >
          <ChevronLeft className="size-3.5" /> Back to Projects
        </button>
        <div className="text-xs text-muted-foreground">
          Projects / <span className="font-semibold text-foreground">{project.code}</span>
        </div>
      </div>

      {/* Project Banner Header */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-primary to-accent" />
        
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary tracking-wider uppercase">{project.code}</span>
              <div className="size-1 bg-muted-foreground/30 rounded-full" />
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Building className="size-3" /> {project.client}</span>
              <div className="size-1 bg-muted-foreground/30 rounded-full" />
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="size-3" /> {project.department}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-1.5 text-stone-900 dark:text-stone-100">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl">{project.description}</p>
            )}
            
            <div className="flex items-center gap-2.5 mt-3">
              <StatusChip tone={statusTone(project.status)}>{project.status}</StatusChip>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getPriorityStyle(project.priority)}`}>
                <ShieldCheck className="size-3.5" /> {project.priority} Priority
              </span>
            </div>
          </div>

          {/* Workflow Action Panel */}
          <div className="flex flex-col gap-2.5 items-end relative w-48">
            {(!orgRole || 
              orgRole.toLowerCase().includes("admin") || 
              orgRole.toLowerCase().includes("project_manager") || 
              orgRole.toLowerCase().includes("department_head")) && (
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setTriggerAddMember(true);
                }}
                className="h-9 px-3.5 rounded-xl border border-primary/30 hover:border-primary/60 text-primary hover:bg-primary/5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer w-full"
              >
                <UserPlus className="size-3.5" /> Assign Member
              </button>
            )}

            <div className="relative w-full">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="h-9 px-3.5 rounded-xl border border-border text-xs font-semibold bg-white dark:bg-stone-950 hover:bg-secondary inline-flex items-center justify-between transition cursor-pointer w-full"
              >
                <span>Transition Status</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>

              {showStatusMenu && (
                <div className="absolute right-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-elevated p-3 z-30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Comment / Reason</div>
                  <input
                    placeholder="Enter status change note..."
                    value={auditComment}
                    onChange={(e) => setAuditComment(e.target.value)}
                    className="w-full h-8 px-2 bg-secondary/60 text-xs rounded-lg border border-border focus:outline-none"
                  />
                  
                  <div className="h-px bg-border" />
                  
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Available Transitions</div>
                  <div className="flex flex-col gap-1.5">
                    {project.status === "Draft" && (
                      <button
                        onClick={() => handleTransition("Pending Approval")}
                        className="h-8 px-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-left text-xs font-medium transition"
                      >
                        Submit for PMO Approval
                      </button>
                    )}
                    {project.status === "Pending Approval" && (
                      <>
                        <button
                          onClick={() => handleTransition("Approved")}
                          className="h-8 px-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-lg text-left text-xs font-medium transition"
                        >
                          Approve Project (PMO)
                        </button>
                        <button
                          onClick={() => handleTransition("Draft")}
                          className="h-8 px-2 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white rounded-lg text-left text-xs font-medium transition"
                        >
                          Reject / Send back to Draft
                        </button>
                      </>
                    )}
                    {project.status === "Approved" && (
                      <button
                        onClick={() => handleTransition("In Progress")}
                        className="h-8 px-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-left text-xs font-medium transition"
                      >
                        Activate & Start Project
                      </button>
                    )}
                    {["In Progress", "Delayed", "On Hold"].includes(project.status) && (
                      <>
                        <button
                          onClick={() => handleTransition("In Progress")}
                          className="h-8 px-2 bg-secondary hover:bg-secondary/80 rounded-lg text-left text-xs font-medium transition"
                        >
                          Mark In Progress
                        </button>
                        <button
                          onClick={() => handleTransition("On Hold")}
                          className="h-8 px-2 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white rounded-lg text-left text-xs font-medium transition"
                        >
                          Place On Hold
                        </button>
                        <button
                          onClick={() => handleTransition("Delayed")}
                          className="h-8 px-2 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white rounded-lg text-left text-xs font-medium transition"
                        >
                          Flag Delayed
                        </button>
                        <button
                          onClick={() => handleTransition("Completed")}
                          className="h-8 px-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-lg text-left text-xs font-medium transition"
                        >
                          Complete Project
                        </button>
                      </>
                    )}
                    {project.status === "Completed" && (
                      <button
                        onClick={() => handleTransition("Closed")}
                        className="h-8 px-2 bg-stone-700/10 hover:bg-stone-700 text-stone-700 hover:text-white rounded-lg text-left text-xs font-medium transition"
                      >
                        Close Engagement
                      </button>
                    )}
                    {project.status === "Closed" && (
                      <span className="text-[10px] text-muted-foreground italic">No further actions - Project Closed</span>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="h-px bg-border/40" />

        {/* Metadata Details Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 md:gap-y-0 text-sm pt-2">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
              <User className="size-4 text-primary" />
              <span>Manager</span>
            </div>
            <div className="font-bold text-stone-900 dark:text-stone-100 mt-1">{project.projectManager}</div>
          </div>

          <div className="space-y-1.5 border-l border-border/60 pl-4 md:pl-6 pr-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
              <Calendar className="size-4 text-primary" />
              <span>Start / End Dates</span>
            </div>
            <div className="font-bold text-stone-900 dark:text-stone-100 mt-1">
              {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
            </div>
          </div>

          <div className="space-y-1.5 border-l border-border/60 pl-4 md:pl-6 pr-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
              <Wallet className="size-4 text-primary" />
              <span>Budget Limit</span>
            </div>
            <div className="font-bold text-stone-900 dark:text-stone-100 mt-1">{formatCurrency(project.budget)}</div>
          </div>

          <div className="space-y-1.5 border-l border-border/60 pl-4 md:pl-6">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              <span>Priority</span>
            </div>
            <div className="font-bold text-stone-900 dark:text-stone-100 mt-1">{project.priority}</div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button onClick={() => setActiveTab("dashboard")} className={tabClass("dashboard")}>
          <Activity className="size-3.5" /> Dashboard
        </button>
        <button onClick={() => setActiveTab("kanban")} className={tabClass("kanban")}>
          <ClipboardList className="size-3.5" /> Kanban Board
        </button>
        <button onClick={() => setActiveTab("backlog")} className={tabClass("backlog")}>
          <ClipboardList className="size-3.5" /> Backlog / List
        </button>
        <button onClick={() => setActiveTab("gantt")} className={tabClass("gantt")}>
          <Sparkles className="size-3.5" /> Timeline / Gantt
        </button>
        <button onClick={() => setActiveTab("audit")} className={tabClass("audit")}>
          <ShieldCheck className="size-3.5" /> Audit History
        </button>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-200">
        {activeTab === "dashboard" && (
          <ProjectDashboard 
            project={project} 
            tasks={tasks} 
            allResources={allResources}
            triggerAddMember={triggerAddMember}
            onTriggerAddMemberReset={() => setTriggerAddMember(false)}
            canManageMembers={!orgRole || 
              orgRole.toLowerCase().includes("admin") || 
              orgRole.toLowerCase().includes("project_manager") || 
              orgRole.toLowerCase().includes("department_head")} 
          />
        )}
        {activeTab === "kanban" && <ProjectKanban projectId={project.id} />}
        {activeTab === "backlog" && <ProjectBacklog projectId={project.id} />}
        {activeTab === "gantt" && <ProjectGantt project={project} tasks={tasks} />}
        {activeTab === "audit" && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-sm">Status Workflow Audit Trail</h3>
            {project.auditLog.length > 0 ? (
              <div className="space-y-4 relative pl-4 border-l border-border/80">
                {project.auditLog.map((log) => (
                  <div key={log.id} className="relative space-y-1">
                    {/* Circle marker */}
                    <div className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-foreground">{log.user}</span>
                      <span className="text-muted-foreground">transitioned from</span>
                      <span className="font-semibold py-0.5 px-1.5 rounded bg-secondary">{log.fromStatus}</span>
                      <span className="text-muted-foreground">to</span>
                      <span className="font-semibold py-0.5 px-1.5 rounded bg-primary/10 text-primary">{log.toStatus}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    {log.comment && (
                      <p className="text-xs text-muted-foreground italic pl-2 border-l border-primary/20">"{log.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">No status changes have been recorded.</div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
