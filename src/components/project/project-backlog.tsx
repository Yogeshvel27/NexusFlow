"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { WorkItem, Project } from "@/lib/store";
import { TaskTypeIcon } from "@/components/task-type-icon";
import { resources } from "@/lib/mock";
import { TaskDetailModal } from "./task-detail-modal";
import { CreateTaskModal } from "./create-task-modal";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Filter,
  User,
  AlertCircle,
  Tag,
  Trash,
  MoveRight
} from "lucide-react";
import { toast } from "sonner";

interface ProjectBacklogProps {
  projectId: string;
}

export function ProjectBacklog({ projectId }: ProjectBacklogProps) {
  const { tasks, updateTask, deleteTask } = useWorkspace();
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);

  // Tree toggle state (collapsed Epic IDs or Task IDs)
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  // Create task modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<WorkItem['type']>("Task");
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined);
  const [createStatus, setCreateStatus] = useState<WorkItem['status']>("To Do");

  // Filters State
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  // Bulk Actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");

  // Filter tasks for this project
  const projectTasks = tasks.filter(t => t.projectId === projectId);

  // Apply search/filters
  const filteredTasks = projectTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchesAssignee = !filterAssignee || t.assignee === filterAssignee;
    const matchesPriority = !filterPriority || t.priority === filterPriority;
    return matchesSearch && matchesAssignee && matchesPriority;
  });

  const toggleCollapse = (id: string) => {
    setCollapsedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectRow = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, taskId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTasks.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkStatusChange = (status: string) => {
    if (!status) return;
    selectedIds.forEach(id => {
      updateTask(id, { status: status as any });
    });
    toast.success(`Updated status for ${selectedIds.length} tasks.`);
    setSelectedIds([]);
    setBulkStatus("");
  };

  const handleBulkAssigneeChange = (assignee: string) => {
    selectedIds.forEach(id => {
      updateTask(id, { assignee: assignee || undefined });
    });
    toast.success(`Updated assignee for ${selectedIds.length} tasks.`);
    setSelectedIds([]);
    setBulkAssignee("");
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} tasks?`)) {
      selectedIds.forEach(id => {
        deleteTask(id);
      });
      setSelectedIds([]);
    }
  };

  // Grouping tasks into hierarchical structure
  // 1. Epics (WorkItem with type Epic and no parentId)
  const epics = filteredTasks.filter(t => t.type === "Epic");

  // 2. Child items under Epics (any type other than Epic, Sub-task, Test Sub-task, having parentId = Epic.id)
  const getEpicChildren = (epicId: string) => {
    return filteredTasks.filter(t => t.parentId === epicId && t.type !== "Sub-task" && t.type !== "Test Sub-task");
  };

  // 3. Sub-tasks under a Task/Bug
  const getSubTasks = (taskId: string) => {
    return filteredTasks.filter(t => t.parentId === taskId && (t.type === "Sub-task" || t.type === "Test Sub-task"));
  };

  // 4. Orphan tasks (Tasks, Bugs, Improvements, etc. that have NO parent epic and are not sub-tasks themselves)
  const orphanTasks = filteredTasks.filter(t => {
    if (t.type === "Epic") return false;
    if (t.type === "Sub-task" || t.type === "Test Sub-task") return false;
    if (!t.parentId) return true;
    
    // If it has a parentId, check if parent is NOT an epic
    const parent = projectTasks.find(p => p.id === t.parentId);
    return !parent || parent.type !== "Epic";
  });

  const renderTaskRow = (t: WorkItem, indentClass = "") => {
    const isSelected = selectedIds.includes(t.id);
    const hasChildren = getSubTasks(t.id).length > 0;
    const isCollapsed = collapsedItems[t.id];

    return (
      <div key={t.id} className="space-y-1">
        <div
          className={`flex items-center gap-3 px-4 py-2 hover:bg-secondary/40 transition group border-b border-border/40 text-xs ${indentClass} ${
            isSelected ? "bg-primary/5" : ""
          }`}
        >
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleSelectRow(t.id, e.target.checked)}
            className="size-3.5 rounded border-border focus:ring-primary"
          />

          {/* Type Icon & Toggle */}
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button onClick={() => toggleCollapse(t.id)} className="p-0.5 hover:bg-secondary rounded shrink-0">
                {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}
            <TaskTypeIcon type={t.type} className="size-3.5 shrink-0" />
          </div>

          {/* Title & Key */}
          <span className="font-semibold text-muted-foreground min-w-[70px] select-none">{t.id}</span>
          <span
            onClick={() => setSelectedTask(t)}
            className={`flex-1 font-medium truncate cursor-pointer hover:text-primary transition ${
              t.status === "Cancelled" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {t.title}
          </span>

          {/* Details */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-secondary border border-border/80 uppercase font-bold text-[9px] tabular-nums">
              {t.status}
            </span>
            <span className="w-12 text-right font-medium">{t.priority}</span>
            <span className="w-16 truncate">{t.assignee || <span className="italic text-muted-foreground/60">Unassigned</span>}</span>
            <span className="w-12 text-right tabular-nums">{t.actualHours}/{t.estimatedHours}h</span>
            
            {/* Quick Add Subtask Button */}
            {(t.type === "Task" || t.type === "Bug" || t.type === "Improvement" || t.type === "Feature Request" || t.type === "UX" || t.type === "Technology") && (
              <button
                onClick={() => {
                  setCreateType("Sub-task");
                  setCreateParentId(t.id);
                  setCreateStatus("To Do");
                  setShowCreateModal(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded text-primary transition"
                title="Add sub-task"
              >
                <Plus className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-tasks */}
        {hasChildren && !isCollapsed && (
          <div className="space-y-1 bg-secondary/10">
            {getSubTasks(t.id).map(st => renderTaskRow(st, "pl-12"))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Filters */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-soft flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <input
            placeholder="Search backlog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3 rounded-lg bg-secondary/60 text-xs border border-transparent focus:bg-card focus:border-border focus:outline-none flex-1 max-w-sm"
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
        </div>

        <button
          onClick={() => {
            setCreateType("Epic");
            setCreateParentId(undefined);
            setCreateStatus("Backlog");
            setShowCreateModal(true);
          }}
          className="h-9 px-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold shadow-copper inline-flex items-center gap-1.5"
        >
          <Plus className="size-4" />
          New Epic
        </button>
      </div>

      {/* Main List */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-2.5 bg-secondary/50 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.length === filteredTasks.length && filteredTasks.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="size-3.5 rounded border-border focus:ring-primary"
          />
          <div className="w-4" />
          <span className="min-w-[70px]">Key</span>
          <span className="flex-1">Task Title</span>
          <div className="flex items-center gap-4 text-right pr-2">
            <span className="w-16">Status</span>
            <span className="w-12">Priority</span>
            <span className="w-16 text-left">Assignee</span>
            <span className="w-12">Logged</span>
            <div className="w-6" />
          </div>
        </div>

        {/* Group list */}
        <div className="divide-y divide-border/30">
          
          {/* Epics block */}
          {epics.map((epic) => {
            const isEpicCollapsed = collapsedItems[epic.id];
            const epicChildren = getEpicChildren(epic.id);
            const isSelected = selectedIds.includes(epic.id);

            return (
              <div key={epic.id} className="space-y-1">
                {/* Epic row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 hover:bg-secondary/60 transition group border-b border-border/40 text-xs">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectRow(epic.id, e.target.checked)}
                    className="size-3.5 rounded border-border focus:ring-primary"
                  />
                  
                  <button onClick={() => toggleCollapse(epic.id)} className="p-0.5 hover:bg-secondary rounded">
                    {isEpicCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>

                  <TaskTypeIcon type="Epic" className="size-4.5" />
                  <span className="font-bold text-muted-foreground min-w-[70px] select-none">{epic.id}</span>
                  <span
                    onClick={() => setSelectedTask(epic)}
                    className="flex-1 font-bold truncate text-foreground hover:text-primary cursor-pointer transition"
                  >
                    {epic.title}
                  </span>

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold">
                      {epic.status}
                    </span>
                    <span className="w-12 text-right font-semibold">{epic.priority}</span>
                    <span className="w-16 truncate">{epic.assignee || <span className="italic">Unassigned</span>}</span>
                    <span className="w-12 text-right tabular-nums">-{epic.estimatedHours}h</span>
                    
                    {/* Add task to Epic button */}
                    <button
                      onClick={() => {
                        setCreateType("Task");
                        setCreateParentId(epic.id);
                        setCreateStatus("To Do");
                        setShowCreateModal(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded text-primary transition"
                      title="Add task to Epic"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Epic Children list */}
                {!isEpicCollapsed && (
                  <div className="space-y-1 pl-6">
                    {epicChildren.map(c => renderTaskRow(c))}
                    {epicChildren.length === 0 && (
                      <div className="p-3 text-xs text-muted-foreground italic pl-12">No tasks in this Epic</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Orphan tasks title folder */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-900/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Issues without Epic ({orphanTasks.length})</span>
            </div>
            <div className="divide-y divide-border/20">
              {orphanTasks.map(t => renderTaskRow(t))}
              {orphanTasks.length === 0 && (
                <div className="p-4 text-xs text-muted-foreground italic text-center">No unassigned backlog items</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bulk actions Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-elevated rounded-2xl px-6 py-3.5 flex items-center gap-4 animate-in slide-in-from-bottom duration-250">
          <span className="text-xs font-bold text-primary">{selectedIds.length} items selected</span>
          <div className="h-5 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => handleBulkStatusChange(e.target.value)}
              className="h-8 px-2 rounded-lg bg-secondary text-xs border border-border cursor-pointer focus:outline-none"
            >
              <option value="">Update Status</option>
              {['Backlog', 'To Do', 'In Progress', 'In Review', 'Testing', 'Done', 'Blocked', 'Rework', 'Cancelled'].map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <select
              value={bulkAssignee}
              onChange={(e) => handleBulkAssigneeChange(e.target.value)}
              className="h-8 px-2 rounded-lg bg-secondary text-xs border border-border cursor-pointer focus:outline-none"
            >
              <option value="">Update Assignee</option>
              <option value="unassigned">Unassigned</option>
              {resources.map(r => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>

            <button
              onClick={handleBulkDelete}
              className="h-8 px-3 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Trash className="size-3.5" />
              Delete Selected
            </button>
          </div>
          
          <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-foreground">Deselect</button>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {showCreateModal && (
        <CreateTaskModal
          projectId={projectId}
          defaultStatus={createStatus}
          defaultParentId={createParentId}
          defaultType={createType}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
