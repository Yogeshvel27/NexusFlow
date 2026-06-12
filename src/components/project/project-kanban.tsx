"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useUser, useAuth } from "@clerk/nextjs";
import { WorkItem, validateTaskTransition } from "@/lib/store";
import { TaskTypeIcon } from "@/components/task-type-icon";
import { resources } from "@/lib/mock";
import { TaskDetailModal } from "./task-detail-modal";
import { CreateTaskModal } from "./create-task-modal";
import { AlertCircle, RotateCcw, Ban, Sparkles, Plus, Play, Pause } from "lucide-react";
import { TaskTimer } from "./task-timer";
import { toast } from "sonner";

interface ProjectKanbanProps {
  projectId: string;
}

const COLUMNS: { id: string; label: string; statuses: WorkItem['status'][] }[] = [
  { id: "Backlog", label: "Backlog", statuses: ["Backlog"] },
  { id: "ToDo", label: "To Do", statuses: ["To Do"] },
  { id: "InProgress", label: "In Progress", statuses: ["In Progress", "Blocked"] },
  { id: "InReview", label: "In Review", statuses: ["In Review"] },
  { id: "Testing", label: "Testing", statuses: ["Testing", "Rework"] },
  { id: "Done", label: "Done", statuses: ["Done", "Cancelled"] }
];

export function ProjectKanban({ projectId }: ProjectKanbanProps) {
  const { tasks, transitionTaskStatus } = useWorkspace();
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);

  const { user } = useUser();
  const { orgRole } = useAuth();
  const canAddTask = !orgRole || (
    orgRole === "org:admin" ||
    orgRole === "org:project_managers" ||
    orgRole === "org:department_heads" ||
    orgRole === "org:executive_management"
  );
  const currentUserName = user
    ? user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ")
    : "";

  const myTasks = tasks.filter(t =>
    t.projectId === projectId &&
    t.assignee &&
    currentUserName &&
    t.assignee.toLowerCase() === currentUserName.toLowerCase() &&
    t.status !== "Done" &&
    t.status !== "Cancelled"
  );

  const activeTask = tasks.find(t =>
    t.status === "In Progress" &&
    t.timerStartedAt &&
    t.assignee &&
    currentUserName &&
    t.assignee.toLowerCase() === currentUserName.toLowerCase()
  );

  const [showStartDropdown, setShowStartDropdown] = useState(false);
  
  // Create task modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStatus, setCreateStatus] = useState<WorkItem['status']>("To Do");

  // Filters State
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterType, setFilterType] = useState("");

  // Filter tasks for this project
  const projectTasks = tasks.filter(t => t.projectId === projectId);

  // Apply search/filters
  const filteredTasks = projectTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchesAssignee = !filterAssignee || t.assignee === filterAssignee;
    const matchesPriority = !filterPriority || t.priority === filterPriority;
    const matchesType = !filterType || t.type === filterType;
    return matchesSearch && matchesAssignee && matchesPriority && matchesType;
  });

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string, customStatus?: WorkItem['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let targetStatus: WorkItem['status'] = "To Do";
    
    if (customStatus) {
      targetStatus = customStatus;
    } else {
      // Find default status for column
      const col = COLUMNS.find(c => c.id === targetColId);
      if (col) {
        // use the primary status of the column (first in list)
        targetStatus = col.statuses[0];
      }
    }

    const { valid } = validateTaskTransition(task.status, targetStatus);
    if (valid) {
      transitionTaskStatus(taskId, targetStatus);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-soft flex-wrap">
        <input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3 rounded-lg bg-secondary/60 text-xs border border-transparent focus:bg-card focus:border-border focus:outline-none max-w-xs flex-1"
        />
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="h-9 px-2 rounded-lg bg-secondary text-xs border border-border"
        >
          <option value="">All Assignees</option>
          {resources.map(r => (
            <option key={r.name} value={r.name}>{r.name}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-9 px-2 rounded-lg bg-secondary text-xs border border-border"
        >
          <option value="">All Priorities</option>
          {['Low', 'Medium', 'High', 'Critical'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 px-2 rounded-lg bg-secondary text-xs border border-border"
        >
          <option value="">All Types</option>
          {['Epic', 'Feature Request', 'Improvement', 'UX', 'Technology', 'Task', 'Sub-task', 'Test Sub-task', 'Bug'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Start / Pause Task Button */}
        <div className="relative">
          {activeTask ? (
            <button
              onClick={() => {
                transitionTaskStatus(activeTask.id, "To Do");
                toast.success(`Paused task ${activeTask.id}`);
              }}
              className="h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm animate-pulse"
              title="Pause current active task"
            >
              <Pause className="size-3.5" />
              <span>Pause {activeTask.id}</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowStartDropdown(!showStartDropdown)}
                className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Select and start a task"
              >
                <Play className="size-3.5" />
                <span>Start Task</span>
              </button>

              {showStartDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowStartDropdown(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-elevated z-20 py-1.5 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1.5 mb-1">
                      Assigned to you ({myTasks.length})
                    </div>
                    {myTasks.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground italic">
                        No active tasks assigned to you
                      </div>
                    ) : (
                      myTasks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            transitionTaskStatus(t.id, "In Progress");
                            toast.success(`Started task ${t.id}`);
                            setShowStartDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-secondary/60 text-xs flex flex-col gap-0.5 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">{t.id}</span>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground bg-secondary px-1 py-0.2 rounded">
                              {t.status}
                            </span>
                          </div>
                          <span className="text-foreground/80 truncate font-medium">{t.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board columns wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 overflow-x-auto min-h-[60vh] pb-4">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter(t => col.statuses.includes(t.status));
          
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="bg-secondary/20 border border-border/80 rounded-2xl flex flex-col min-w-[180px] p-2 space-y-2 relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40">
                <span className="text-xs font-semibold text-foreground/80">{col.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/80 font-bold tabular-nums">
                  {colTasks.length}
                </span>
              </div>

              {/* Task list container */}
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[70vh] min-h-[150px] p-0.5">
                {colTasks.map((t) => {
                  const initials = t.assignee ? t.assignee.split(" ").map(n => n[0]).join("") : "UN";
                  const priorityColors = {
                    Low: "bg-stone-100 text-stone-600 dark:bg-stone-850 dark:text-stone-400",
                    Medium: "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400",
                    High: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
                    Critical: "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                  };

                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onClick={() => setSelectedTask(t)}
                      className={`bg-card border p-3 rounded-xl shadow-soft cursor-grab hover:shadow-card hover:-translate-y-0.5 transition-all duration-150 relative group ${
                        t.status === "Blocked"
                          ? "border-red-500 bg-red-50/5 dark:bg-red-950/5"
                          : t.status === "Rework"
                          ? "border-orange-500 bg-orange-50/5 dark:bg-orange-950/5"
                          : t.status === "Cancelled"
                          ? "border-border opacity-60 bg-stone-50 dark:bg-stone-900"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <TaskTypeIcon type={t.type} className="size-4 shrink-0" />
                          <span className={`text-[10px] font-semibold text-muted-foreground ${t.status === "Cancelled" ? "line-through" : ""}`}>{t.id}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${priorityColors[t.priority]}`}>{t.priority}</span>
                      </div>
                      
                      <div className={`text-xs font-medium text-foreground mt-2 line-clamp-2 leading-snug ${t.status === "Cancelled" ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </div>

                      {/* Badges details (blocked, rework, cancelled) */}
                      {t.status === "Blocked" && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                          <AlertCircle className="size-3" />
                          Blocked
                        </div>
                      )}
                      {t.status === "Rework" && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          <RotateCcw className="size-3" />
                          Rework
                        </div>
                      )}
                      {t.status === "Cancelled" && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-stone-500 bg-stone-500/10 px-1.5 py-0.5 rounded">
                          <Ban className="size-3" />
                          Cancelled
                        </div>
                      )}

                      {/* Footer: Assignee & Hours */}
                      <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <TaskTimer task={t} showIcon />
                          {t.status === "In Progress" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                transitionTaskStatus(t.id, "To Do");
                                toast.success(`Paused task ${t.id}`);
                              }}
                              className="p-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 transition cursor-pointer animate-pulse"
                              title="Pause Task"
                            >
                              <Pause className="size-3" />
                            </button>
                          ) : (
                            t.status !== "Done" && t.status !== "Cancelled" && t.type !== "Epic" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  transitionTaskStatus(t.id, "In Progress");
                                  toast.success(`Started task ${t.id}`);
                                }}
                                className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition cursor-pointer"
                                title="Start Task"
                              >
                                <Play className="size-3" />
                              </button>
                            )
                          )}
                        </div>
                        <div
                          className="size-5 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[7px] font-bold text-white uppercase"
                          title={t.assignee || "Unassigned"}
                        >
                          {initials}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Drop Zones for sub-states at the bottom of the column */}
              {col.id === "InProgress" && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "InProgress", "Blocked")}
                  className="mt-2 border-2 border-dashed border-red-500/30 hover:border-red-500/60 rounded-xl p-2.5 text-center text-[9px] font-bold text-red-500/70 hover:bg-red-500/5 transition cursor-pointer"
                >
                  Drop to Block Task
                </div>
              )}
              {col.id === "Testing" && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "Testing", "Rework")}
                  className="mt-2 border-2 border-dashed border-orange-500/30 hover:border-orange-500/60 rounded-xl p-2.5 text-center text-[9px] font-bold text-orange-500/70 hover:bg-orange-500/5 transition cursor-pointer"
                >
                  Drop for Rework
                </div>
              )}
              {col.id === "Done" && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "Done", "Cancelled")}
                  className="mt-2 border-2 border-dashed border-stone-400/30 hover:border-stone-400/60 rounded-xl p-2.5 text-center text-[9px] font-bold text-stone-500/70 hover:bg-stone-500/5 transition cursor-pointer"
                >
                  Drop to Cancel Task
                </div>
              )}

              {/* Add Task Button Triggering Popup */}
              {canAddTask && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setCreateStatus(col.statuses[0]);
                      setShowCreateModal(true);
                    }}
                    className="w-full h-8 hover:bg-secondary/40 text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="size-3" />
                    Add Task
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {showCreateModal && (
        <CreateTaskModal
          projectId={projectId}
          defaultStatus={createStatus}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
