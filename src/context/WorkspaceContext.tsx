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
  loaded: boolean;
  loadError: string | null;
  setOrganizationId: (id: string) => void;
  currentOrgId: string;
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

  // Load state from Supabase, with localStorage fallback
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        let dbProjects: any[] | null = null;
        let dbWorkItems: any[] | null = null;
        let dbUsers: any[] | null = null;
        let prjError: any = null;
        let taskError: any = null;

        // Try authenticated client first
        try {
          const client = await getAuthenticatedClient();
          const resProj = await client
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });
          dbProjects = resProj.data;
          prjError = resProj.error;

          const resTasks = await client
            .from("work_items")
            .select(`
              *,
              comments:work_item_comments(id, author, text, created_at),
              activity_logs:work_item_activity_logs(id, timestamp, user_name, action)
            `)
            .order("created_at", { ascending: true });
          dbWorkItems = resTasks.data;
          taskError = resTasks.error;

          const resUsers = await client.from("users").select("*");
          if (!resUsers.error && resUsers.data) {
            dbUsers = resUsers.data;
          }

          if (prjError || taskError) {
            console.warn("Authenticated client query failed, will try static client fallback...", prjError || taskError);
            dbProjects = null;
            dbWorkItems = null;
          }
        } catch (authErr) {
          console.warn("Error getting authenticated client, will try static client fallback...", authErr);
        }

        // Fallback to static client if authenticated client failed or returned nothing
        if (!dbProjects || dbProjects.length === 0) {
          console.log("Fetching projects using static client fallback");
          const resProjStatic = await supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });
          dbProjects = resProjStatic.data;
          prjError = resProjStatic.error;
        }

        if (!dbWorkItems || dbWorkItems.length === 0) {
          console.log("Fetching work items using static client fallback");
          const resTasksStatic = await supabase
            .from("work_items")
            .select(`
              *,
              comments:work_item_comments(id, author, text, created_at),
              activity_logs:work_item_activity_logs(id, timestamp, user_name, action)
            `)
            .order("created_at", { ascending: true });
          dbWorkItems = resTasksStatic.data;
          taskError = resTasksStatic.error;
        }

        if (!dbUsers || dbUsers.length === 0) {
          const resUsersStatic = await supabase.from("users").select("*");
          if (!resUsersStatic.error && resUsersStatic.data) {
            dbUsers = resUsersStatic.data;
          }
        }

        if (prjError || taskError) {
          const errMsg = (prjError?.message || "") + " | " + (taskError?.message || "");
          console.error("Supabase load error (both auth and static clients failed):", errMsg);
          setLoadError(errMsg);
          loadFromLocalStorage();
          return;
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

        // Merge project members from localStorage
        if (typeof window !== "undefined") {
          const localMembers = localStorage.getItem("nf_project_members");
          const membersMap = localMembers ? JSON.parse(localMembers) : {};
          mappedProjects = mappedProjects.map(p => ({
            ...p,
            teamMembers: p.teamMembers || membersMap[p.id] || []
          }));
        }

        // Filter projects and tasks by active organization context
        const filteredProjects = mappedProjects.filter(p => p.organizationId === currentOrgId);
        
        const visibleProjectIds = new Set(filteredProjects.map(p => p.id));
        const filteredTasks = mappedTasks.filter(t => visibleProjectIds.has(t.projectId));

        if (!active) return;

        if (dbUsers) {
          setUsers(dbUsers);
          if (typeof window !== "undefined") {
            localStorage.setItem("nf_users", JSON.stringify(dbUsers));
          }
        }

        // Check for existing projects that have assigned tasks but are not 'In Progress', and auto-transition them
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

              // Update Supabase
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
        if (!active) return;
        console.error("Failed to load from Supabase:", err);
        setLoadError(err?.message || String(err));
        loadFromLocalStorage();
      }
    }

    function loadFromLocalStorage() {
      if (!active) return;
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
      
      // Ensure merged members are always set
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

      // Filter by organization context
      const filteredProj = mappedProj.filter(p => p.organizationId === currentOrgId);
      const visibleProjectIds = new Set(filteredProj.map(p => p.id));
      const filteredTasksList = mappedTasksList.filter(t => visibleProjectIds.has(t.projectId));

      const storedUsers = localStorage.getItem("nf_users");
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      }

      // Check for existing projects that have assigned tasks but are not 'In Progress', and auto-transition them
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

    loadData();

    return () => {
      active = false;
    };
  }, [user?.id, currentOrgId]);

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

    // Save to Supabase
    supabase.from("projects").insert({
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
    }).then(({ error }) => {
      if (error) console.error("Error creating project in Supabase:", error);
    });

    supabase.from("project_audit_logs").insert({
      project_id: newPrj.id,
      user_name: user?.fullName || user?.firstName || "System",
      from_status: "None",
      to_status: "Draft",
      comment: "Project created as Draft"
    }).then(({ error }) => {
      if (error) console.error("Error logging project creation:", error);
    });

    toast.success(`Project ${newPrj.code} created successfully!`);
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

    // Save to Supabase
    supabase.from("projects").update({ status: toStatus }).eq("id", projectId).then(({ error }) => {
      if (error) console.error("Error updating project status in Supabase:", error);
    });

    supabase.from("project_audit_logs").insert({
      project_id: projectId,
      user_name: user?.fullName || user?.firstName || "System",
      from_status: prj.status,
      to_status: toStatus,
      comment: comment || ""
    }).then(({ error }) => {
      if (error) console.error("Error logging project transition:", error);
    });

    toast.success(`Project status transitioned to ${toStatus}`);
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

      if (nextActualHours > t.estimatedHours) {
        nextIsDelayed = true;
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

  const updateProjectMembers = (projectId: string, members: string[]) => {
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
        currentOrgId
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
