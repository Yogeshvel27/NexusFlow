"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser, useOrganization } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Project,
  WorkItem,
  initialProjects,
  initialTasks,
  validateProjectTransition,
  validateTaskTransition,
  Comment,
  Attachment
} from "@/lib/store";
import { supabase, useSupabase } from "@/lib/supabase";

interface WorkspaceContextType {
  projects: Project[];
  tasks: WorkItem[];
  users: any[];
  resources: any[];
  risks: any[];
  approvals: any[];
  approvalAuditLogs: any[];
  projectAuditLogs: any[];
  workItemActivityLogs: any[];
  loaded: boolean;
  loadError: string | null;
  setOrganizationId: (id: string) => void;
  currentOrgId: string;
  refreshData: () => Promise<void>;
  createProject: (p: {
    name: string;
    client: string;
    department: string;
    budget: number;
    startDate: string;
    endDate: string;
    priority: Project['priority'];
    description: string;
    projectManager: string;
  }) => Project | null;
  updateProjectStatus: (projectId: string, toStatus: Project['status'], comment?: string) => boolean;
  updateProjectMembers: (projectId: string, members: string[]) => void;
  updateProjectBudget: (projectId: string, newBudget: number, newSpent?: number) => void;
  createTask: (t: {
    projectId: string;
    parentId?: string;
    type: WorkItem['type'];
    title: string;
    description: string;
    status: WorkItem['status'];
    priority: WorkItem['priority'];
    assignee?: string;
    reporter?: string;
    reviewer?: string;
    dueDate?: string;
    estimatedHours: number;
    actualHours: number;
    tags: string[];
  }) => WorkItem | null;
  updateTask: (taskId: string, updates: Partial<WorkItem>) => void;
  deleteTask: (taskId: string) => void;
  addCommentToTask: (taskId: string, text: string) => void;
  addAttachmentToTask: (taskId: string, attachment: Attachment) => void;
  removeAttachmentFromTask: (taskId: string, attachmentUrl: string) => void;
  transitionTaskStatus: (taskId: string, toStatus: WorkItem['status']) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { getAuthenticatedClient } = useSupabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<WorkItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [approvalAuditLogs, setApprovalAuditLogs] = useState<any[]>([]);
  const [projectAuditLogs, setProjectAuditLogs] = useState<any[]>([]);
  const [workItemActivityLogs, setWorkItemActivityLogs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentOrgId, setOrganizationId] = useState<string>("personal");

  // Keep currentOrgId in sync with Clerk when it is loaded
  useEffect(() => {
    if (organization?.id) {
      setOrganizationId(organization.id);
    } else {
      setOrganizationId("personal");
    }
  }, [organization?.id]);

  // Seed functions to populate Supabase tables if empty
  const seedInitialProjects = async (prjs: Project[]) => {
    try {
      const rows = prjs.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        client: p.client,
        organization_id: p.organizationId,
        department: p.department,
        budget: p.budget,
        spent: p.spent,
        start_date: p.startDate,
        end_date: p.endDate,
        priority: p.priority,
        description: p.description,
        project_manager: p.projectManager,
        status: p.status
      }));
      await supabase.from("projects").insert(rows);
    } catch (e) {
      console.error("Failed to seed initial projects:", e);
    }
  };

  const seedInitialTasks = async (tsks: WorkItem[]) => {
    try {
      const rows = tsks.map(t => ({
        id: t.id,
        project_id: t.projectId,
        parent_id: t.parentId || null,
        type: t.type,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        assignee: t.assignee || null,
        reporter: t.reporter || "System",
        reviewer: t.reviewer || null,
        due_date: t.dueDate || null,
        estimated_hours: t.estimatedHours,
        actual_hours: t.actualHours,
        tags: t.tags || [],
        attachments: t.attachments || []
      }));

      await supabase.from("work_items").insert(rows);
    } catch (e) {
      console.error("Failed to seed initial tasks:", e);
    }
  };

  // Parallel database load with static fallback and caching
  async function loadData(isActive = true) {
    try {
      let dbProjects: any[] | null = null;
      let dbWorkItems: any[] | null = null;
      let dbUsers: any[] | null = null;
      let dbResources: any[] | null = null;
      let dbRisks: any[] | null = null;
      let dbApprovals: any[] | null = null;
      let dbAppAudits: any[] | null = null;
      let dbProjAudits: any[] | null = null;
      let dbTaskAudits: any[] | null = null;

      let prjError: any = null;
      let taskError: any = null;

      try {
        const [
          resProj,
          resTasks,
          resUsers,
          resResources,
          resRisks,
          resApprovals,
          resAppAudits,
          resProjAudits,
          resTaskAudits
        ] = await Promise.all([
          supabase.from("projects").select("*").order("created_at", { ascending: false }),
          supabase.from("work_items").select(`
            *,
            comments:work_item_comments(id, author, text, created_at),
            activity_logs:work_item_activity_logs(id, timestamp, user_name, action)
          `).order("created_at", { ascending: true }),
          supabase.from("users").select("*"),
          supabase.from("resources").select("*"),
          supabase.from("risks").select("*"),
          supabase.from("approvals").select("*"),
          supabase.from("approval_audit_logs").select("*"),
          supabase.from("project_audit_logs").select("*"),
          supabase.from("work_item_activity_logs").select("*")
        ]);

        dbProjects = resProj.data;
        prjError = resProj.error;
        dbWorkItems = resTasks.data;
        taskError = resTasks.error;
        dbUsers = resUsers.data;
        dbResources = resResources.data;
        dbRisks = resRisks.data;
        dbApprovals = resApprovals.data;
        dbAppAudits = resAppAudits.data;
        dbProjAudits = resProjAudits.data;
        dbTaskAudits = resTaskAudits.data;

        if (prjError || taskError) {
          console.warn("Parallel Supabase fetch returned warning:", prjError || taskError);
        }
      } catch (parallelErr) {
        console.warn("Failed parallel load from static client:", parallelErr);
      }

      if (prjError || taskError || !dbProjects) {
        throw new Error((prjError?.message || "") + " | " + (taskError?.message || ""));
      }

      // Sync project team members
      const resourceIdToName: Record<string, string> = {};
      if (dbResources) {
        dbResources.forEach(r => {
          resourceIdToName[r.id] = r.name;
        });
      }

      const dbProjectMembersMap: Record<string, string[]> = {};
      const { data: dbAllocTable } = await supabase.from("resource_allocations").select("project_id, resource_id");
      if (dbAllocTable) {
        dbAllocTable.forEach(alloc => {
          if (alloc.project_id && alloc.resource_id) {
            const rName = resourceIdToName[alloc.resource_id];
            if (rName) {
              if (!dbProjectMembersMap[alloc.project_id]) {
                dbProjectMembersMap[alloc.project_id] = [];
              }
              if (!dbProjectMembersMap[alloc.project_id].includes(rName)) {
                dbProjectMembersMap[alloc.project_id].push(rName);
              }
            }
          }
        });
      }

      let mappedProjects: Project[] = [];
      if (dbProjects && dbProjects.length > 0) {
        mappedProjects = dbProjects.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          client: p.client,
          organizationId: p.organization_id || "personal",
          department: p.department || "Engineering",
          budget: Number(p.budget),
          spent: Number(p.spent),
          startDate: p.start_date,
          endDate: p.end_date,
          priority: p.priority,
          description: p.description || "",
          projectManager: p.project_manager,
          status: p.status,
          teamMembers: dbProjectMembersMap[p.id] || [],
          auditLog: []
        }));
      } else {
        mappedProjects = initialProjects;
        await seedInitialProjects(initialProjects);
      }

      let mappedTasks: WorkItem[] = [];
      if (dbWorkItems && dbWorkItems.length > 0) {
        mappedTasks = dbWorkItems.map((t: any) => ({
          id: t.id,
          projectId: t.project_id,
          parentId: t.parent_id || undefined,
          type: t.type,
          title: t.title,
          description: t.description || "",
          status: t.status,
          priority: t.priority,
          assignee: t.assignee === "YOGESH VEL" || t.assignee?.toLowerCase() === "yogeshvel" ? "YOGESH VEL" : (t.assignee || undefined),
          reporter: t.reporter,
          reviewer: t.reviewer || undefined,
          dueDate: t.due_date || undefined,
          estimatedHours: Number(t.estimated_hours),
          actualHours: Number(t.actual_hours),
          tags: t.tags || [],
          attachments: Array.isArray(t.attachments) ? t.attachments : [],
          comments: Array.isArray(t.comments) ? t.comments.map((c: any) => ({
            id: c.id,
            author: c.author,
            text: c.text,
            createdAt: c.created_at
          })) : [],
          activityHistory: Array.isArray(t.activity_logs) ? t.activity_logs.map((log: any) => ({
            id: log.id,
            timestamp: log.timestamp,
            user: log.user_name,
            action: log.action
          })) : [],
          timerStartedAt: t.timer_started_at || undefined,
          accumulatedSeconds: Number(t.accumulated_seconds || 0),
          isDelayed: !!t.is_delayed,
          performanceScore: t.performance_score !== null && t.performance_score !== undefined ? Number(t.performance_score) : undefined
        }));
      } else {
        mappedTasks = initialTasks;
        await seedInitialTasks(initialTasks);
      }

      if (typeof window !== "undefined") {
        const localMembers = localStorage.getItem("nf_project_members");
        const membersMap = localMembers ? JSON.parse(localMembers) : {};
        mappedProjects = mappedProjects.map(p => {
          const local = membersMap[p.id] || [];
          const merged = new Set([
            ...(p.teamMembers || []),
            ...local
          ]);
          return {
            ...p,
            teamMembers: Array.from(merged)
          };
        });
      }

      const filteredProjects = mappedProjects.filter(p => p.organizationId === currentOrgId);
      const visibleProjectIds = new Set(filteredProjects.map(p => p.id));
      const filteredTasks = mappedTasks.filter(t => visibleProjectIds.has(t.projectId));

      if (!isActive) return;

      if (dbUsers) {
        setUsers(dbUsers);
        if (typeof window !== "undefined") {
          localStorage.setItem("nf_users", JSON.stringify(dbUsers));
        }
      }

      if (dbResources) {
        const mappedResources = dbResources.map(r => ({
          ...r,
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          role: r.role,
          dept: r.dept,
          manager: r.manager,
          location: r.location,
          employmentType: r.employment_type || "Full Time",
          costRate: Number(r.cost_rate || 0),
          billingRate: Number(r.billing_rate || 0),
          currency: r.currency || "USD",
          joiningDate: r.joining_date,
          experienceYears: Number(r.experience_years || 0),
          skills: typeof r.skills === "string" ? JSON.parse(r.skills) : (r.skills || []),
          status: r.status,
          util: Number(r.utilization_rate || 0),
          availabilityHrsWk: Number(r.availability_hrs_wk || 40),
          allocations: typeof r.allocations === "string" ? JSON.parse(r.allocations) : (r.allocations || []),
          timesheets: typeof r.timesheets === "string" ? JSON.parse(r.timesheets) : (r.timesheets || [])
        }));
        setResources(mappedResources);
        if (typeof window !== "undefined") {
          localStorage.setItem("nexus_resources_v2", JSON.stringify(mappedResources));
        }
      }

      if (dbRisks) {
        const mappedRisks = dbRisks.map(r => ({
          id: r.id,
          name: r.name,
          project: r.project,
          severity: r.severity,
          probability: r.probability,
          impact: r.impact,
          owner: r.owner,
          status: r.status,
          source: r.source,
          description: r.description
        }));
        setRisks(mappedRisks);
        if (typeof window !== "undefined") {
          localStorage.setItem("nexus_risks_v2", JSON.stringify(mappedRisks));
        }
      }

      if (dbApprovals) {
        const mappedApprovals = dbApprovals.map(a => ({
          id: a.id,
          type: a.type || a.title || "Change Request",
          project: a.project_name || a.project || "Unknown Project",
          requester: a.requester || "System User",
          stage: a.status || a.stage || "Draft",
          amount: Number(a.amount || 0),
          submitted: a.created_at ? new Date(a.created_at).toLocaleDateString() : "Just now",
          description: a.details || a.description || ""
        }));
        setApprovals(mappedApprovals);
        if (typeof window !== "undefined") {
          localStorage.setItem("nexus_approvals", JSON.stringify(mappedApprovals));
        }
      }

      if (dbAppAudits) setApprovalAuditLogs(dbAppAudits);
      if (dbProjAudits) setProjectAuditLogs(dbProjAudits);
      if (dbTaskAudits) setWorkItemActivityLogs(dbTaskAudits);

      let hasChanges = false;
      const activatedProjectsList = filteredProjects.map(p => {
        if (p.status !== "In Progress") {
          const hasAssignedTask = filteredTasks.some(t => t.projectId === p.id && t.assignee && t.assignee.trim() !== "");
          if (hasAssignedTask) {
            hasChanges = true;
            
            const updatedLog = {
              id: `p-log-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user: "System",
              fromStatus: p.status,
              toStatus: "In Progress" as const,
              comment: "Project activated automatically because an assigned task was found."
            };

            supabase.from("projects").update({ status: "In Progress" }).eq("id", p.id).then(({ error }) => {
              if (error) console.error("Error auto-activating existing project in Supabase:", error);
            });

            supabase.from("project_audit_logs").insert({
              project_id: p.id,
              user_name: "System",
              from_status: p.status,
              to_status: "In Progress",
              comment: "Project activated automatically because an assigned task was found."
            }).then(({ error }) => {
              if (error) console.error("Error logging existing project transition:", error);
            });

            return {
              ...p,
              status: "In Progress" as const,
              auditLog: [updatedLog, ...(p.auditLog || [])]
            };
          }
        }
        return p;
      });

      const finalProjects = hasChanges ? activatedProjectsList : filteredProjects;
      if (hasChanges) {
        mappedProjects = mappedProjects.map(mp => {
          const updated = finalProjects.find(up => up.id === mp.id);
          return updated || mp;
        });
      }

      setProjects(finalProjects);
      setTasks(filteredTasks);
      setLoadError(null);
      if (typeof window !== "undefined") {
        localStorage.setItem("nf_all_projects", JSON.stringify(mappedProjects));
        localStorage.setItem("nf_all_tasks", JSON.stringify(mappedTasks));
        localStorage.setItem("nf_projects", JSON.stringify(finalProjects));
        localStorage.setItem("nf_tasks", JSON.stringify(filteredTasks));
      }
      setLoaded(true);

    } catch (err: any) {
      if (!isActive) return;
      console.error("Failed to load from Supabase:", err);
      setLoadError(err?.message || String(err));
      loadFromLocalStorage(isActive);
    }
  }

  function loadFromLocalStorage(isActive = true) {
    if (!isActive) return;
    const storedProj = localStorage.getItem("nf_all_projects") || localStorage.getItem("nf_projects");
    const storedTasks = localStorage.getItem("nf_all_tasks") || localStorage.getItem("nf_tasks");
    const localMembers = localStorage.getItem("nf_project_members");
    const membersMap = localMembers ? JSON.parse(localMembers) : {};
    
    let mappedProj: Project[] = [];
    if (storedProj) {
      mappedProj = JSON.parse(storedProj);
    } else {
      mappedProj = initialProjects;
    }
    
    mappedProj = mappedProj.map(p => ({
      ...p,
      teamMembers: p.teamMembers || membersMap[p.id] || []
    }));

    let mappedTasksList: WorkItem[] = [];
    if (storedTasks) {
      mappedTasksList = JSON.parse(storedTasks);
    } else {
      mappedTasksList = initialTasks;
    }

    const filteredProj = mappedProj.filter(p => p.organizationId === currentOrgId);
    const visibleProjectIds = new Set(filteredProj.map(p => p.id));
    const filteredTasksList = mappedTasksList.filter(t => visibleProjectIds.has(t.projectId));

    const storedUsers = localStorage.getItem("nf_users");
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }

    const storedRes = localStorage.getItem("nexus_resources_v2");
    if (storedRes) setResources(JSON.parse(storedRes));

    const storedRisks = localStorage.getItem("nexus_risks_v2");
    if (storedRisks) setRisks(JSON.parse(storedRisks));

    const storedApprovals = localStorage.getItem("nexus_approvals");
    if (storedApprovals) setApprovals(JSON.parse(storedApprovals));

    let hasChanges = false;
    const activatedProj = filteredProj.map(p => {
      if (p.status !== "In Progress") {
        const hasAssignedTask = filteredTasksList.some(t => t.projectId === p.id && t.assignee && t.assignee.trim() !== "");
        if (hasAssignedTask) {
          hasChanges = true;
          const updatedLog = {
            id: `p-log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: "System",
            fromStatus: p.status,
            toStatus: "In Progress" as const,
            comment: "Project activated automatically because an assigned task was found."
          };
          return {
            ...p,
            status: "In Progress" as const,
            auditLog: [updatedLog, ...(p.auditLog || [])]
          };
        }
      }
      return p;
    });
    const finalProj = hasChanges ? activatedProj : filteredProj;

    setProjects(finalProj);
    setTasks(filteredTasksList);
    setLoaded(true);
  }

  const refreshData = async () => {
    await loadData(true);
  };

  useEffect(() => {
    // Instantly hydrate UI state using local cache
    loadFromLocalStorage(true);

    let active = true;
    loadData(active);
    return () => {
      active = false;
    };
  }, [user?.id, currentOrgId]);

  // One-time self-healing sync of local project members to Supabase DB resource_allocations
  useEffect(() => {
    if (!loaded || !projects.length) return;

    async function syncLocalMembersToDb() {
      if (typeof window === "undefined") return;
      const localMembers = localStorage.getItem("nf_project_members");
      if (!localMembers) return;

      try {
        const membersMap = JSON.parse(localMembers);
        const { data: dbRes } = await supabase.from("resources").select("*");
        if (!dbRes) return;

        for (const projectId of Object.keys(membersMap)) {
          const members = membersMap[projectId];
          if (!Array.isArray(members) || members.length === 0) continue;

          const targetProj = projects.find(p => p.id === projectId);
          if (!targetProj) continue;

          // Get current DB allocations for this project
          const { data: existingAllocs } = await supabase
            .from("resource_allocations")
            .select("resource_id")
            .eq("project_id", projectId);

          const existingResourceIds = new Set(existingAllocs?.map(a => a.resource_id) || []);

          // Match local names to resource rows
          const assignedResources = dbRes.filter(r => 
            members.some(mName => mName.toLowerCase().trim() === r.name.toLowerCase().trim())
          );

          // Find resources that are not yet allocated in the database
          const toAdd = assignedResources.filter(r => !existingResourceIds.has(r.id));

          if (toAdd.length > 0) {
            console.log(`[Self-Healing Sync] Syncing ${toAdd.length} local members for project ${projectId} to Supabase...`);
            const allocationRows = toAdd.map(res => ({
              id: `alloc-${projectId}-${res.id}`.slice(0, 50),
              resource_id: res.id,
              project_id: projectId,
              project_name: targetProj.name,
              role: res.role || "Team Member",
              allocation_percent: 100,
              start_date: targetProj.startDate || new Date().toISOString().split("T")[0],
              end_date: targetProj.endDate || new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split("T")[0],
              is_billable: true
            }));

            const { error } = await supabase.from("resource_allocations").upsert(allocationRows, { onConflict: "id" });
            if (error) {
              console.error("[Self-Healing Sync] Failed to sync local members to Supabase:", error);
            }
          }
        }
      } catch (err) {
        console.warn("[Self-Healing Sync] Failed to parse or sync local members:", err);
      }
    }

    syncLocalMembersToDb();
  }, [loaded, projects]);

  // Proactive background task delay & performance check
  useEffect(() => {
    const interval = setInterval(() => {
      let changed = false;
      const now = new Date().getTime();
      const updatedTasks = tasks.map(t => {
        if (t.status === "In Progress" && t.timerStartedAt && t.estimatedHours && t.estimatedHours > 0) {
          const elapsedSeconds = Math.round((now - new Date(t.timerStartedAt).getTime()) / 1000);
          const totalSeconds = (t.accumulatedSeconds || 0) + elapsedSeconds;
          const currentActualHours = Number((totalSeconds / 3600).toFixed(2));
          if (currentActualHours > t.estimatedHours) {
            const ratio = t.estimatedHours / currentActualHours;
            const nextPerformanceScore = Math.max(30, Math.round(90 * ratio));
            
            if (!t.isDelayed || t.performanceScore !== nextPerformanceScore) {
              changed = true;
              
              // Asynchronously update in Supabase
              supabase.from("work_items").update({
                is_delayed: true,
                performance_score: nextPerformanceScore
              }).eq("id", t.id).then(({ error }) => {
                if (error) console.error("Error auto-updating task delay in Supabase:", error);
              });

              return {
                ...t,
                isDelayed: true,
                performanceScore: nextPerformanceScore
              };
            }
          }
        }
        return t;
      });

      if (changed) {
        saveState(projects, updatedTasks);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [tasks, projects]);

  // Save changes to state & localStorage
  const saveState = (updatedProj: Project[], updatedTasks: WorkItem[]) => {
    if (typeof window !== "undefined") {
      const storedAllProj = localStorage.getItem("nf_all_projects");
      let allProj: Project[] = storedAllProj ? JSON.parse(storedAllProj) : [];
      
      updatedProj.forEach(up => {
        const idx = allProj.findIndex(p => p.id === up.id);
        if (idx !== -1) {
          allProj[idx] = up;
        } else {
          allProj.unshift(up);
        }
      });
      
      const storedAllTasks = localStorage.getItem("nf_all_tasks");
      let allTasks: WorkItem[] = storedAllTasks ? JSON.parse(storedAllTasks) : [];
      
      updatedTasks.forEach(ut => {
        const idx = allTasks.findIndex(t => t.id === ut.id);
        if (idx !== -1) {
          allTasks[idx] = ut;
        } else {
          allTasks.unshift(ut);
        }
      });

      localStorage.setItem("nf_all_projects", JSON.stringify(allProj));
      localStorage.setItem("nf_all_tasks", JSON.stringify(allTasks));
    }

    setProjects(updatedProj);
    setTasks(updatedTasks);
    if (typeof window !== "undefined") {
      localStorage.setItem("nf_projects", JSON.stringify(updatedProj));
      localStorage.setItem("nf_tasks", JSON.stringify(updatedTasks));
    }
  };

  const autoActivateProject = (projectId: string, currentProjectsList: Project[]): Project[] => {
    const prj = currentProjectsList.find(p => p.id === projectId);
    if (prj && prj.status !== "In Progress") {
      const updatedLog = {
        id: `p-log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user?.fullName || user?.firstName || "System",
        fromStatus: prj.status,
        toStatus: "In Progress" as const,
        comment: "Project activated automatically because a task was assigned."
      };
      
      const newProjects = currentProjectsList.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            status: "In Progress" as const,
            auditLog: [updatedLog, ...p.auditLog]
          };
        }
        return p;
      });

      // Update Supabase
      supabase.from("projects").update({ status: "In Progress" }).eq("id", projectId).then(({ error }) => {
        if (error) console.error("Error auto-activating project status in Supabase:", error);
      });

      supabase.from("project_audit_logs").insert({
        project_id: projectId,
        user_name: user?.fullName || user?.firstName || "System",
        from_status: prj.status,
        to_status: "In Progress",
        comment: "Project activated automatically because a task was assigned."
      }).then(({ error }) => {
        if (error) console.error("Error logging auto-activation project transition:", error);
      });

      toast.info(`Project ${prj.code} status auto-transitioned to In Progress (Active) because a task was assigned.`);
      return newProjects;
    }
    return currentProjectsList;
  };

  const createProject = (p: {
    name: string;
    client: string;
    department: string;
    budget: number;
    startDate: string;
    endDate: string;
    priority: Project['priority'];
    description: string;
    projectManager: string;
  }) => {
    // Generate auto incrementing project code
    const lastIdNum = projects.reduce((max, prj) => {
      const match = prj.code.match(/PRJ-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 1000);

    const nextCode = `PRJ-${lastIdNum + 1}`;
    
    const newPrj: Project = {
      id: nextCode,
      code: nextCode,
      name: p.name,
      client: p.client,
      organizationId: organization?.id || "personal",
      department: p.department,
      budget: p.budget,
      spent: 0,
      startDate: p.startDate,
      endDate: p.endDate,
      priority: p.priority,
      description: p.description,
      projectManager: p.projectManager,
      status: "Draft",
      auditLog: [
        {
          id: `p-log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: user?.fullName || user?.firstName || "System",
          fromStatus: "None",
          toStatus: "Draft",
          comment: "Project created as Draft"
        }
      ]
    };

    const updated = [newPrj, ...projects];
    saveState(updated, tasks);

    const syncPromise = (async () => {
      const { error: insertError } = await supabase.from("projects").insert({
        id: newPrj.id,
        code: newPrj.code,
        name: newPrj.name,
        client: newPrj.client,
        organization_id: newPrj.organizationId,
        department: newPrj.department,
        budget: newPrj.budget,
        spent: newPrj.spent,
        start_date: newPrj.startDate,
        end_date: newPrj.endDate,
        priority: newPrj.priority,
        description: newPrj.description,
        project_manager: newPrj.projectManager,
        status: newPrj.status
      });
      if (insertError) throw insertError;

      const { error: logError } = await supabase.from("project_audit_logs").insert({
        project_id: newPrj.id,
        user_name: user?.fullName || user?.firstName || "System",
        from_status: "None",
        to_status: "Draft",
        comment: "Project created as Draft"
      });
      if (logError) throw logError;

      await refreshData();
    })();

    toast.promise(syncPromise, {
      loading: `Creating project ${newPrj.code}...`,
      success: `Project ${newPrj.code} created successfully!`,
      error: (err) => `Failed to create project: ${err.message || String(err)}`
    });

    return newPrj;
  };

  const updateProjectStatus = (projectId: string, toStatus: Project['status'], comment?: string) => {
    const prj = projects.find(p => p.id === projectId);
    if (!prj) return false;

    const { valid, reason } = validateProjectTransition(prj.status, toStatus);
    if (!valid) {
      toast.error(reason || "Invalid status transition");
      return false;
    }

    const updatedLog = {
      id: `p-log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user?.fullName || user?.firstName || "System",
      fromStatus: prj.status,
      toStatus: toStatus,
      comment: comment
    };

    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          status: toStatus,
          auditLog: [updatedLog, ...p.auditLog]
        };
      }
      return p;
    });

    saveState(updated, tasks);

    const syncPromise = (async () => {
      const { error: updateError } = await supabase.from("projects").update({ status: toStatus }).eq("id", projectId);
      if (updateError) throw updateError;

      const { error: logError } = await supabase.from("project_audit_logs").insert({
        project_id: projectId,
        user_name: user?.fullName || user?.firstName || "System",
        from_status: prj.status,
        to_status: toStatus,
        comment: comment || ""
      });
      if (logError) throw logError;

      await refreshData();
    })();

    toast.promise(syncPromise, {
      loading: `Updating project status to ${toStatus}...`,
      success: `Project status successfully updated to ${toStatus}!`,
      error: (err) => `Failed to update status: ${err.message || String(err)}`
    });

    return true;
  };

  const createTask = (t: {
    projectId: string;
    parentId?: string;
    type: WorkItem['type'];
    title: string;
    description: string;
    status: WorkItem['status'];
    priority: WorkItem['priority'];
    assignee?: string;
    reporter?: string;
    reviewer?: string;
    dueDate?: string;
    estimatedHours: number;
    actualHours: number;
    tags: string[];
  }) => {
    // Generate task ID based on Project Code
    const prj = projects.find(p => p.id === t.projectId);
    const prefix = prj ? prj.name.split(" ")[0].toUpperCase() : "TASK";

    const lastTaskNum = tasks.reduce((max, task) => {
      if (task.projectId === t.projectId) {
        const match = task.id.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
      }
      return max;
    }, 100);

    const nextTaskId = `${prefix}-${lastTaskNum + 1}`;

    const newWork: WorkItem = {
      id: nextTaskId,
      projectId: t.projectId,
      parentId: t.parentId,
      type: t.type,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee,
      reporter: t.reporter || user?.fullName || "System",
      reviewer: t.reviewer,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours,
      tags: t.tags,
      attachments: [],
      comments: [],
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: user?.fullName || user?.firstName || "System",
          action: `Created task ${nextTaskId} of type ${t.type}`
        }
      ]
    };

    const updatedTasks = [...tasks, newWork];
    let updatedProjects = projects;
    if (newWork.assignee && newWork.assignee.trim() !== "") {
      updatedProjects = autoActivateProject(newWork.projectId, projects);
    }
    saveState(updatedProjects, updatedTasks);

    // Save to Supabase
    supabase.from("work_items").insert({
      id: newWork.id,
      project_id: newWork.projectId,
      parent_id: newWork.parentId || null,
      type: newWork.type,
      title: newWork.title,
      description: newWork.description,
      status: newWork.status,
      priority: newWork.priority,
      assignee: newWork.assignee || null,
      reporter: newWork.reporter,
      reviewer: newWork.reviewer || null,
      due_date: newWork.dueDate || null,
      estimated_hours: newWork.estimatedHours,
      actual_hours: newWork.actualHours,
      tags: newWork.tags || [],
      attachments: newWork.attachments || []
    }).then(({ error }) => {
      if (error) {
        console.error("Error creating task in Supabase:", error);
        if (error.message.includes("check constraint") || error.code === "23514") {
          toast.error(
            "Database Check Constraint Violated: Please run the SQL alter command to add the new task types ('Story', 'Feature', 'Risk', 'Issue') in the Supabase SQL editor!",
            { duration: 10000 }
          );
        } else {
          toast.error(`Database Error: ${error.message}`);
        }
      } else {
        // Only log activity if task creation succeeded
        supabase.from("work_item_activity_logs").insert({
          work_item_id: newWork.id,
          user_name: user?.fullName || user?.firstName || "System",
          action: `Created task ${newWork.id} of type ${t.type}`
        }).then(({ error: logError }) => {
          if (logError) console.error("Error logging task creation:", logError);
        });
      }
    });

    toast.success(`Task ${newWork.id} created successfully!`);
    return newWork;
  };

  const updateTask = (taskId: string, updates: Partial<WorkItem>) => {
    let projectUpdated = false;
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        if (updates.assignee && updates.assignee.trim() !== "" && t.assignee !== updates.assignee) {
          projectUpdated = true;
        }
        const changes: string[] = [];
        Object.keys(updates).forEach((k) => {
          const key = k as keyof WorkItem;
          if (t[key] !== updates[key]) {
            changes.push(`Updated ${key} to ${updates[key]}`);
          }
        });

        const newLogs = changes.map(c => ({
          id: `act-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          user: user?.fullName || user?.firstName || "System",
          action: c
        }));

        // DB update object mapping UI camelCase keys to DB snake_case keys
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.assignee !== undefined) dbUpdates.assignee = updates.assignee || null;
        if (updates.reporter !== undefined) dbUpdates.reporter = updates.reporter;
        if (updates.reviewer !== undefined) dbUpdates.reviewer = updates.reviewer || null;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
        if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
        if (updates.actualHours !== undefined) dbUpdates.actual_hours = updates.actualHours;
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
        if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
        if (updates.timerStartedAt !== undefined) dbUpdates.timer_started_at = updates.timerStartedAt || null;
        if (updates.accumulatedSeconds !== undefined) dbUpdates.accumulated_seconds = updates.accumulatedSeconds;
        if (updates.isDelayed !== undefined) dbUpdates.is_delayed = updates.isDelayed;
        if (updates.performanceScore !== undefined) dbUpdates.performance_score = updates.performanceScore;

        if (Object.keys(dbUpdates).length > 0) {
          supabase.from("work_items").update(dbUpdates).eq("id", taskId).then(({ error }) => {
            if (error) console.error("Error updating task in Supabase:", error);
          });
        }

        const logRows = changes.map(c => ({
          work_item_id: taskId,
          user_name: user?.fullName || user?.firstName || "System",
          action: c
        }));

        if (logRows.length > 0) {
          supabase.from("work_item_activity_logs").insert(logRows).then(({ error }) => {
            if (error) console.error("Error logging task update in Supabase:", error);
          });
        }

        return {
          ...t,
          ...updates,
          activityHistory: [...newLogs, ...t.activityHistory]
        };
      }
      return t;
    });

    let updatedProjects = projects;
    if (projectUpdated) {
      const targetTask = tasks.find(t => t.id === taskId);
      if (targetTask) {
        updatedProjects = autoActivateProject(targetTask.projectId, projects);
      }
    }

    saveState(updatedProjects, updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    // Delete target task and any sub-tasks referencing it as parentId
    const updatedTasks = tasks.filter(t => t.id !== taskId && t.parentId !== taskId);
    saveState(projects, updatedTasks);

    supabase.from("work_items").delete().eq("id", taskId).then(({ error }) => {
      if (error) console.error("Error deleting task in Supabase:", error);
    });

    toast.success(`Task ${taskId} and its sub-tasks deleted.`);
  };

  const addCommentToTask = (taskId: string, text: string) => {
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: user?.fullName || user?.firstName || "System",
      text,
      createdAt: new Date().toISOString()
    };

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          comments: [...t.comments, newComment],
          activityHistory: [
            {
              id: `act-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user: user?.fullName || user?.firstName || "System",
              action: `Added comment: "${text.substring(0, 30)}..."`
            },
            ...t.activityHistory
          ]
        };
      }
      return t;
    });

    saveState(projects, updatedTasks);

    supabase.from("work_item_comments").insert({
      work_item_id: taskId,
      author: newComment.author,
      text: newComment.text
    }).then(({ error }) => {
      if (error) console.error("Error adding comment in Supabase:", error);
    });

    supabase.from("work_item_activity_logs").insert({
      work_item_id: taskId,
      user_name: user?.fullName || user?.firstName || "System",
      action: `Added comment: "${text.substring(0, 30)}..."`
    }).then(({ error }) => {
      if (error) console.error("Error logging task comment:", error);
    });

    toast.success("Comment added.");
  };

  const addAttachmentToTask = (taskId: string, attachment: Attachment) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const newAttachments = [...t.attachments, attachment];

        supabase.from("work_items").update({ attachments: newAttachments }).eq("id", taskId).then(({ error }) => {
          if (error) console.error("Error adding attachment in Supabase:", error);
        });

        supabase.from("work_item_activity_logs").insert({
          work_item_id: taskId,
          user_name: user?.fullName || user?.firstName || "System",
          action: `Attached file: ${attachment.name}`
        }).then(({ error }) => {
          if (error) console.error("Error logging task attachment:", error);
        });

        return {
          ...t,
          attachments: newAttachments,
          activityHistory: [
            {
              id: `act-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user: user?.fullName || user?.firstName || "System",
              action: `Attached file: ${attachment.name}`
            },
            ...t.activityHistory
          ]
        };
      }
      return t;
    });

    saveState(projects, updatedTasks);
    toast.success(`Attached ${attachment.name}`);
  };

  const removeAttachmentFromTask = (taskId: string, attachmentUrl: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const attachment = t.attachments.find(att => att.url === attachmentUrl);
        const newAttachments = t.attachments.filter(att => att.url !== attachmentUrl);

        supabase.from("work_items").update({ attachments: newAttachments }).eq("id", taskId).then(({ error }) => {
          if (error) console.error("Error removing attachment in Supabase:", error);
        });

        if (attachment) {
          supabase.from("work_item_activity_logs").insert({
            work_item_id: taskId,
            user_name: user?.fullName || user?.firstName || "System",
            action: `Removed file: ${attachment.name}`
          }).then(({ error }) => {
            if (error) console.error("Error logging task attachment removal:", error);
          });
        }

        return {
          ...t,
          attachments: newAttachments,
          activityHistory: [
            {
              id: `act-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user: user?.fullName || user?.firstName || "System",
              action: `Removed file: ${attachment ? attachment.name : "attachment"}`
            },
            ...t.activityHistory
          ]
        };
      }
      return t;
    });

    saveState(projects, updatedTasks);
    toast.success("Attachment removed.");
  };

  const transitionTaskStatus = (taskId: string, toStatus: WorkItem['status']) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return false;

    const { valid, reason } = validateTaskTransition(t.status, toStatus);
    if (!valid) {
      toast.error(reason || "Invalid status transition");
      return false;
    }

    const nowStr = new Date().toISOString();
    let nextTimerStartedAt = t.timerStartedAt;
    let nextAccumulatedSeconds = t.accumulatedSeconds || 0;
    let nextActualHours = t.actualHours;
    let nextIsDelayed = t.isDelayed || false;
    let nextPerformanceScore = t.performanceScore;

    // 1. Starting a task: Transitioning to "In Progress"
    if (toStatus === "In Progress") {
      nextTimerStartedAt = nowStr;
    }

    // 2. Pausing/leaving a task: Transitioning away from "In Progress"
    if (t.status === "In Progress" && toStatus !== "In Progress") {
      if (t.timerStartedAt) {
        const delta = Math.round((new Date().getTime() - new Date(t.timerStartedAt).getTime()) / 1000);
        nextAccumulatedSeconds += Math.max(0, delta);
        nextActualHours = Number((nextAccumulatedSeconds / 3600).toFixed(2));
      }
      nextTimerStartedAt = undefined;

      if (t.estimatedHours && t.estimatedHours > 0) {
        if (nextActualHours > t.estimatedHours) {
          nextIsDelayed = true;
          const ratio = t.estimatedHours / nextActualHours;
          nextPerformanceScore = Math.max(30, Math.round(90 * ratio));
        } else {
          const ratio = nextActualHours / t.estimatedHours;
          if (ratio <= 0.5) {
            nextPerformanceScore = 100;
          } else {
            nextPerformanceScore = Math.round(90 + 10 * (1 - (ratio - 0.5) / 0.5));
          }
        }
      }
    }

    // 3. Completing a task: Transitioning to "Done"
    if (toStatus === "Done") {
      // If was running, pause it first
      if (t.status === "In Progress" && t.timerStartedAt) {
        const delta = Math.round((new Date().getTime() - new Date(t.timerStartedAt).getTime()) / 1000);
        nextAccumulatedSeconds += Math.max(0, delta);
        nextActualHours = Number((nextAccumulatedSeconds / 3600).toFixed(2));
        nextTimerStartedAt = undefined;
      }

      const totalEstimated = t.estimatedHours || 1; // Avoid division by zero
      if (nextActualHours <= totalEstimated) {
        // Finishing in allocated time: Good performance score
        const ratio = nextActualHours / totalEstimated;
        if (ratio <= 0.5) {
          nextPerformanceScore = 100;
        } else {
          nextPerformanceScore = Math.round(90 + 10 * (1 - (ratio - 0.5) / 0.5));
        }
      } else {
        // Exceeded time: Mark delayed but allow completion, lower performance score
        nextIsDelayed = true;
        const ratio = totalEstimated / nextActualHours;
        nextPerformanceScore = Math.max(30, Math.round(90 * ratio));
      }
    }

    const updatedTasks = tasks.map(x => {
      if (x.id === taskId) {
        return {
          ...x,
          status: toStatus,
          timerStartedAt: nextTimerStartedAt,
          accumulatedSeconds: nextAccumulatedSeconds,
          actualHours: nextActualHours,
          isDelayed: nextIsDelayed,
          performanceScore: nextPerformanceScore,
          activityHistory: [
            {
              id: `act-${Date.now()}`,
              timestamp: nowStr,
              user: user?.fullName || user?.firstName || "System",
              action: `Changed status from ${t.status} to ${toStatus}. Actual Hours: ${nextActualHours}h.`
            },
            ...x.activityHistory
          ]
        };
      }
      return x;
    });

    saveState(projects, updatedTasks);

    // Save to Supabase with schema mismatch fallback
    supabase.from("work_items").update({
      status: toStatus,
      timer_started_at: nextTimerStartedAt || null,
      accumulated_seconds: nextAccumulatedSeconds,
      actual_hours: nextActualHours,
      is_delayed: nextIsDelayed,
      performance_score: nextPerformanceScore
    }).eq("id", taskId).then(({ error }) => {
      if (error) {
        console.warn("Supabase columns timer_started_at/accumulated_seconds/is_delayed/performance_score may not exist. Retrying with basic columns...", error);
        // Fallback update using standard fields only
        supabase.from("work_items").update({
          status: toStatus,
          actual_hours: nextActualHours
        }).eq("id", taskId).then(({ error: fallbackError }) => {
          if (fallbackError) {
            console.error("Fallback task status update in Supabase also failed:", fallbackError);
          }
        });
      }
    });

    supabase.from("work_item_activity_logs").insert({
      work_item_id: taskId,
      user_name: user?.fullName || user?.firstName || "System",
      action: `Changed status from ${t.status} to ${toStatus}. Actual Hours: ${nextActualHours}h.`
    }).then(({ error }) => {
      if (error) console.error("Error logging task transition:", error);
    });

    toast.success(`Task ${taskId} moved to ${toStatus}`);
    return true;
  };

  const updateProjectMembers = async (projectId: string, members: string[]) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          teamMembers: members
        };
      }
      return p;
    });

    saveState(updated, tasks);

    if (typeof window !== "undefined") {
      const localMembers = localStorage.getItem("nf_project_members");
      const membersMap = localMembers ? JSON.parse(localMembers) : {};
      membersMap[projectId] = members;
      localStorage.setItem("nf_project_members", JSON.stringify(membersMap));
    }

    try {
      const targetProj = projects.find(p => p.id === projectId);
      if (targetProj) {
        // Fetch all resources to map names to IDs
        const { data: dbRes } = await supabase.from("resources").select("*");
        if (dbRes) {
          // Find matching resource IDs
          const assignedResources = dbRes.filter(r => 
            members.some(mName => mName.toLowerCase().trim() === r.name.toLowerCase().trim())
          );

          const assignedResourceIds = assignedResources.map(r => r.id);

          // Delete allocations for resources that are no longer assigned to this project
          const { data: existingAllocs } = await supabase
            .from("resource_allocations")
            .select("id, resource_id")
            .eq("project_id", projectId);

          const allocIdsToDelete = existingAllocs
            ? existingAllocs.filter(a => !assignedResourceIds.includes(a.resource_id)).map(a => a.id)
            : [];

          if (allocIdsToDelete.length > 0) {
            await supabase
              .from("resource_allocations")
              .delete()
              .in("id", allocIdsToDelete);
          }

          // Upsert new allocations
          if (assignedResources.length > 0) {
            const allocationRows = assignedResources.map(res => ({
              id: `alloc-${projectId}-${res.id}`.slice(0, 50),
              resource_id: res.id,
              project_id: projectId,
              project_name: targetProj.name,
              role: res.role || "Team Member",
              allocation_percent: 100,
              start_date: targetProj.startDate || new Date().toISOString().split("T")[0],
              end_date: targetProj.endDate || new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split("T")[0],
              is_billable: true
            }));

            const { error: upsertErr } = await supabase
              .from("resource_allocations")
              .upsert(allocationRows, { onConflict: "id" });

            if (upsertErr) {
              console.error("Error upserting resource allocations:", upsertErr);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync project members to Supabase:", err);
    }

    toast.success("Project team members updated successfully.");
  };

  const updateProjectBudget = (projectId: string, newBudget: number, newSpent?: number) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          budget: newBudget,
          spent: newSpent !== undefined ? newSpent : p.spent
        };
      }
      return p;
    });

    saveState(updated, tasks);

    const updatePayload: any = { budget: newBudget };
    if (newSpent !== undefined) {
      updatePayload.spent = newSpent;
    }

    supabase.from("projects").update(updatePayload).eq("id", projectId).then(({ error }) => {
      if (error) console.error("Error updating project budget/spent in Supabase:", error);
    });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        projects,
        tasks,
        users,
        resources,
        risks,
        approvals,
        approvalAuditLogs,
        projectAuditLogs,
        workItemActivityLogs,
        loaded,
        loadError,
        createProject,
        updateProjectStatus,
        updateProjectMembers,
        updateProjectBudget,
        createTask,
        updateTask,
        deleteTask,
        addCommentToTask,
        addAttachmentToTask,
        removeAttachmentFromTask,
        transitionTaskStatus,
        setOrganizationId,
        currentOrgId,
        refreshData
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
