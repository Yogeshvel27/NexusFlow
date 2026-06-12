"use client";

import React, { useState, useEffect } from "react";
import { X, Send, Paperclip, Clock, Shield, AlertTriangle, Trash, Play, Pause } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { WorkItem, validateTaskTransition } from "@/lib/store";
import { TaskTypeIcon } from "@/components/task-type-icon";
import { resources as mockResources } from "@/lib/mock";
import { toast } from "sonner";
import { TaskTimer } from "./task-timer";
import { supabase } from "@/lib/supabase";
import { useOrganization, useUser } from "@clerk/nextjs";

interface TaskDetailModalProps {
  task: WorkItem;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const { projects, users, updateTask, deleteTask, addCommentToTask, addAttachmentToTask, removeAttachmentFromTask, transitionTaskStatus } = useWorkspace();
  const { user } = useUser();
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);

  const [dbResources, setDbResources] = useState<any[]>([]);

  useEffect(() => {
    async function loadDbResources() {
      try {
        const { data, error } = await supabase.from("resources").select("*");
        if (data && !error) {
          const mapped = data.map(r => ({
            id: r.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            role: r.role || "Member",
            dept: r.dept || "Engineering",
            skills: typeof r.skills === "string" ? JSON.parse(r.skills) : (r.skills || []),
            status: r.status || "Available",
            util: Number(r.utilization_rate || 0),
            allocation: 0
          }));
          setDbResources(mapped);
        } else {
          const saved = localStorage.getItem("nexus_resources_v2");
          if (saved) {
            setDbResources(JSON.parse(saved));
          }
        }
      } catch (err) {
        console.error("Failed to load db resources:", err);
      }
    }
    loadDbResources();
  }, []);

  // Compute all available resources including Clerk members
  const allResources = React.useMemo(() => {
    const baseList = dbResources.length > 0 ? [...dbResources] : [...mockResources];
    const list: any[] = [...baseList];
    if (user) {
      const name = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress || "Current User";
      const email = user.primaryEmailAddress?.emailAddress || "";
      if (!list.some(r => r.name.toLowerCase() === name.toLowerCase())) {
        list.push({
          id: user.id,
          name: name,
          email: email,
          role: "Member",
          dept: "Engineering",
          skills: [],
          status: "Available",
          util: 0,
          allocation: 0
        });
      }
    }
    return list.filter(r => {
      const roleLower = (r.role || "").toLowerCase();
      const nameLower = (r.name || "").toLowerCase();
      return !roleLower.includes("admin") && !nameLower.includes("admin");
    });
  }, [dbResources, user]);

  const projectTeamMembers = React.useMemo(() => {
    const currentProject = projects.find(p => p.id === task.projectId);
    const teamNames = currentProject?.teamMembers || [];
    const pmName = currentProject?.projectManager;

    const filtered = allResources.filter(r => {
      return teamNames.some(tName => tName.toLowerCase().trim() === r.name.toLowerCase().trim()) || 
             (pmName && pmName.toLowerCase().trim() === r.name.toLowerCase().trim());
    });

    return filtered.length > 0 ? filtered : allResources;
  }, [allResources, projects, task.projectId]);

  // Form State
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [assignee, setAssignee] = useState(task.assignee || "");
  const [reviewer, setReviewer] = useState(task.reviewer || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [estimatedHours, setEstimatedHours] = useState(task.estimatedHours);
  const [actualHours, setActualHours] = useState(task.actualHours);
  const [tagInput, setTagInput] = useState("");

  const triggerTaskEmail = (newAssignee: string) => {
    if (!newAssignee) return;
    if (newAssignee === task.assignee) return;

    const resource = allResources.find(r => r.name === newAssignee);
    const email = resource?.email || `${newAssignee.toLowerCase().replace(/\s+/g, ".")}@nexusflow.com`;
    const currentProject = projects.find(p => p.id === task.projectId);
    const projectName = currentProject?.name || "Project Workspace";

    fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        employeeName: newAssignee,
        projectName: projectName,
        notificationType: "task",
        taskTitle: title.trim(),
        duration: estimatedHours,
        priority: priority,
        taskType: task.type,
        taskCode: task.id
      })
    }).catch(err => {
      console.error("Failed to send task email:", err);
    });
  };

  const handleSave = () => {
    updateTask(task.id, {
      title,
      description,
      priority,
      assignee: assignee || undefined,
      reviewer: reviewer || undefined,
      dueDate: dueDate || undefined,
      estimatedHours: Number(estimatedHours),
      actualHours: Number(actualHours)
    });
    setEditing(false);
    if (assignee && assignee !== task.assignee) {
      triggerTaskEmail(assignee);
    }
    toast.success("Task updated successfully!");
  };

  const handleStatusChange = (newStatus: WorkItem['status']) => {
    const success = transitionTaskStatus(task.id, newStatus);
    if (!success) {
      // Toast error already handled in store/context
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentToTask(task.id, commentText);
    setCommentText("");
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Uploading file to Supabase Storage...");

    try {
      // 1. Create a unique path inside the attachments bucket
      const fileExt = file.name.split(".").pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${task.id}/${uniqueName}`;

      // 2. Upload file to Supabase Storage
      const { error } = await supabase.storage
        .from("attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) throw error;

      // 3. Get the public download/display URL
      const { data: { publicUrl } } = supabase.storage
        .from("attachments")
        .getPublicUrl(filePath);

      // 4. Save metadata to workspace tasks
      addAttachmentToTask(task.id, {
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        url: publicUrl
      });

      toast.success("File uploaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`Upload failed: ${err.message || err}`, { id: toastId });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!task.tags.includes(tagInput.trim())) {
        updateTask(task.id, {
          tags: [...task.tags, tagInput.trim()]
        });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateTask(task.id, {
      tags: task.tags.filter(t => t !== tag)
    });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${task.id}?`)) {
      deleteTask(task.id);
      onClose();
    }
  };

  const statusColors: Record<WorkItem['status'], string> = {
    Backlog: "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
    "To Do": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    "In Progress": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    "In Review": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    Testing: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
    Done: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    Blocked: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    Rework: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    Cancelled: "bg-stone-200 text-stone-500 border-stone-300 dark:bg-stone-700 dark:text-stone-400 dark:border-stone-600 line-through"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

      {/* Modal Container */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
          <div className="flex items-center gap-3">
            <TaskTypeIcon type={task.type} className="size-6" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{task.id}</span>
            <div className="h-4 w-px bg-border" />
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className={`text-xs font-semibold px-2.5 py-1 border rounded-full focus:outline-none transition cursor-pointer ${statusColors[task.status]}`}
            >
              {['Backlog', 'To Do', 'In Progress', 'In Review', 'Testing', 'Done', 'Blocked', 'Rework', 'Cancelled'].map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            {task.status === "In Progress" ? (
              <button
                onClick={() => {
                  const success = transitionTaskStatus(task.id, "To Do");
                  if (success) toast.success(`Paused task ${task.id}`);
                }}
                className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm animate-pulse"
                title="Pause Task"
              >
                <Pause className="size-3.5" /> Pause Task
              </button>
            ) : (
              task.status !== "Done" && task.status !== "Cancelled" && task.type !== "Epic" && (
                <button
                  onClick={() => {
                    const success = transitionTaskStatus(task.id, "In Progress");
                    if (success) toast.success(`Started task ${task.id}`);
                  }}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Start Task"
                >
                  <Play className="size-3.5" /> Start Task
                </button>
              )
            )}

            <div className="h-5 w-px bg-border mx-1" />

            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition"
              title="Delete task"
            >
              <Trash className="size-4.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid md:grid-cols-3 gap-6">
          
          {/* Left / Middle: Title, Description, Comments */}
          <div className="md:col-span-2 space-y-6">
            {editing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xl font-semibold bg-secondary/50 border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full text-sm bg-secondary/50 border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="h-9 px-4 rounded-xl bg-primary text-white text-xs font-medium shadow-copper">Save</button>
                  <button onClick={() => setEditing(false)} className="h-9 px-4 rounded-xl border border-border text-xs font-medium hover:bg-secondary">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 onClick={() => setEditing(true)} className="text-xl font-semibold cursor-pointer hover:bg-secondary/30 p-1.5 rounded-lg transition">{task.title}</h2>
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Description</div>
                  <div
                    onClick={() => setEditing(true)}
                    className="text-sm text-foreground/80 bg-secondary/20 hover:bg-secondary/40 border border-transparent hover:border-border rounded-xl p-4 min-h-[100px] whitespace-pre-wrap cursor-pointer transition"
                  >
                    {task.description || <span className="text-muted-foreground italic">Add a description...</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Attachments ({task.attachments.length})</div>
                <label className="h-8 px-2.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary inline-flex items-center gap-1.5 cursor-pointer">
                  <Paperclip className="size-3.5" />
                  Attach File
                  <input type="file" onChange={handleAttachFile} className="hidden" />
                </label>
              </div>
              {task.attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {task.attachments.map((att, idx) => (
                    <div key={idx} className="relative group flex items-center min-w-0">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-2.5 p-2 bg-secondary/40 border border-border rounded-xl hover:bg-secondary/70 hover:border-primary/50 transition cursor-pointer min-w-0 pr-8"
                      >
                        <Paperclip className="size-4 text-primary shrink-0 group-hover:scale-110 transition" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate group-hover:text-primary transition">{att.name}</div>
                          <div className="text-[10px] text-muted-foreground">{att.size}</div>
                        </div>
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (confirm(`Are you sure you want to remove the attachment "${att.name}"?`)) {
                            removeAttachmentFromTask(task.id, att.url);
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove attachment"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Comments ({task.comments.length})</div>
              
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question or add details..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="submit" className="size-9 bg-primary text-white rounded-xl shadow-copper grid place-items-center"><Send className="size-3.5" /></button>
              </form>

              <div className="space-y-3">
                {task.comments.map((c) => (
                  <div key={c.id} className="flex gap-3 bg-secondary/20 border border-border/50 rounded-xl p-3">
                    <div className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-bold text-white uppercase shrink-0">
                      {c.author.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{c.author}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-1">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Metadata sidebar */}
          <div className="border-l border-border pl-6 space-y-5">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Attributes</div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Priority</span>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as any);
                    updateTask(task.id, { priority: e.target.value as any });
                  }}
                  className="col-span-2 h-8 px-2 rounded-lg bg-secondary border border-border"
                >
                  {['Low', 'Medium', 'High', 'Critical'].map(pr => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Assignee</span>
                <select
                  value={assignee}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignee(val);
                    updateTask(task.id, { assignee: val || undefined });
                    if (val) {
                      triggerTaskEmail(val);
                    }
                  }}
                  className="col-span-2 h-8 px-2 rounded-lg bg-secondary border border-border"
                >
                  <option value="">Unassigned</option>
                  {projectTeamMembers.map(r => (
                    <option key={r.id} value={r.name}>{r.name} ({r.dept || "Engineering"})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Reviewer</span>
                <select
                  value={reviewer}
                  onChange={(e) => {
                    setReviewer(e.target.value);
                    updateTask(task.id, { reviewer: e.target.value || undefined });
                  }}
                  className="col-span-2 h-8 px-2 rounded-lg bg-secondary border border-border"
                >
                  <option value="">None</option>
                  {projectTeamMembers.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Reporter</span>
                <span className="col-span-2 font-medium py-1 px-2 bg-secondary/40 rounded-lg">{task.reporter || "System"}</span>
              </div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    updateTask(task.id, { dueDate: e.target.value || undefined });
                  }}
                  className="col-span-2 h-8 px-2 rounded-lg bg-secondary border border-border"
                />
              </div>

              <div className="h-px bg-border my-4" />

              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Log & Estimate</div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Est. Hours</span>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => {
                    setEstimatedHours(Number(e.target.value));
                    updateTask(task.id, { estimatedHours: Number(e.target.value) });
                  }}
                  className="col-span-2 h-8 px-2 rounded-lg bg-secondary border border-border"
                />
              </div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Actual Hours</span>
                <input
                  type="number"
                  value={actualHours}
                  onChange={(e) => {
                    const newHrs = Number(e.target.value);
                    setActualHours(newHrs);
                    
                    // Also recalculate delay & score based on manual edit
                    let nextIsDelayed = task.isDelayed;
                    let nextPerformanceScore = task.performanceScore;
                    if (task.estimatedHours && task.estimatedHours > 0) {
                      if (newHrs > task.estimatedHours) {
                        nextIsDelayed = true;
                        const ratio = task.estimatedHours / newHrs;
                        nextPerformanceScore = Math.max(30, Math.round(90 * ratio));
                      } else {
                        const ratio = newHrs / task.estimatedHours;
                        if (ratio <= 0.5) {
                          nextPerformanceScore = 100;
                        } else {
                          nextPerformanceScore = Math.round(90 + 10 * (1 - (ratio - 0.5) / 0.5));
                        }
                      }
                    }
                    updateTask(task.id, { 
                      actualHours: newHrs, 
                      isDelayed: nextIsDelayed, 
                      performanceScore: nextPerformanceScore 
                    });
                  }}
                  className="col-span-2 h-8 px-2 rounded-lg bg-secondary border border-border"
                />
              </div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Live Tracked</span>
                <div className="col-span-2 py-1 px-2 bg-secondary/40 rounded-lg">
                  <TaskTimer task={task} showIcon />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Status</span>
                <div className="col-span-2">
                  {task.isDelayed ? (
                    <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase text-[9px] inline-flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="size-3 text-red-500" /> Delayed Task
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold uppercase text-[9px] inline-flex items-center">
                      On Schedule
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 items-center">
                <span className="text-muted-foreground">Perf. Score</span>
                <div className="col-span-2">
                  {task.performanceScore !== undefined ? (
                    <span className={`font-bold py-1 px-2.5 rounded-lg border text-[11px] ${
                      task.performanceScore >= 80 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        : task.performanceScore >= 60
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}>
                      {task.performanceScore}/100
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic text-[11px]">Not evaluated</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tags section */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-1">
                    {t}
                    <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-500 font-bold">×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Press Enter to add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full h-8 px-2 rounded-lg bg-secondary border border-border text-xs focus:outline-none"
              />
            </div>

            {/* Task Activity Logs */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="size-3.5" />
                History
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 text-[10px] text-muted-foreground">
                {task.activityHistory.map((act) => (
                  <div key={act.id} className="border-b border-border/40 pb-1">
                    <span className="font-medium text-foreground">{act.user}</span> {act.action}
                    <div className="text-[8px] mt-0.5">{new Date(act.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
