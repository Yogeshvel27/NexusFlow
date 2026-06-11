"use client";

import React, { useState, useRef } from "react";
import {
  X,
  ClipboardList,
  Bug,
  Crown,
  TrendingUp,
  FileText,
  User,
  Calendar,
  Clock,
  Paperclip,
  Plus,
  ShieldCheck,
  Sparkles,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  Pencil,
  Layers,
  Tag,
  Flag,
  Activity,
  BookOpen,
  Rocket,
  AlertTriangle,
  Ban,
  ChevronDown
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { WorkItem } from "@/lib/store";
import { resources } from "@/lib/mock";
import { toast } from "sonner";

const statusesMeta = [
  { id: "Backlog", label: "Backlog", color: "bg-stone-400" },
  { id: "To Do", label: "To Do", color: "bg-blue-500" },
  { id: "In Progress", label: "In Progress", color: "bg-amber-500" },
  { id: "In Review", label: "In Review", color: "bg-purple-500" },
  { id: "Testing", label: "Testing", color: "bg-cyan-500" },
  { id: "Done", label: "Done", color: "bg-emerald-500" },
  { id: "Blocked", label: "Blocked", color: "bg-red-500" },
  { id: "Rework", label: "Rework", color: "bg-yellow-500" },
  { id: "Cancelled", label: "Cancelled", color: "bg-stone-500" }
] as const;

interface CreateTaskModalProps {
  projectId: string;
  defaultStatus?: WorkItem['status'];
  defaultParentId?: string;
  defaultType?: WorkItem['type'];
  onClose: () => void;
}

export function CreateTaskModal({
  projectId,
  defaultStatus = "To Do",
  defaultParentId,
  defaultType = "Task",
  onClose
}: CreateTaskModalProps) {
  const { createTask, addAttachmentToTask } = useWorkspace();

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  // Custom Type state (using selectable cards instead of a select dropdown)
  const [type, setType] = useState<WorkItem['type']>(
    defaultType
  );
  
  // Priority selection states
  const [priority, setPriority] = useState<WorkItem['priority']>("Medium");
  const [status, setStatus] = useState<WorkItem['status']>(defaultStatus);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(8);
  const [labels, setLabels] = useState<string[]>(["Frontend"]);
  const [newLabelInput, setNewLabelInput] = useState("");
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);

  // Attachments State
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task Title is required.");
      return;
    }

    const createdTask = createTask({
      projectId,
      parentId: defaultParentId,
      type,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: assignee || undefined,
      dueDate: dueDate || undefined,
      estimatedHours,
      actualHours: 0,
      tags: labels
    });

    if (createdTask && attachments.length > 0) {
      attachments.forEach(att => {
        addAttachmentToTask(createdTask.id, {
          name: att.name,
          size: att.size,
          url: "#"
        });
      });
    }

    toast.success(`Task ${title} created successfully.`);
    onClose();
  };

  // Add Label helper
  const handleAddLabel = () => {
    if (newLabelInput.trim() && !labels.includes(newLabelInput.trim())) {
      setLabels(prev => [...prev, newLabelInput.trim()]);
      setNewLabelInput("");
    }
  };

  // Remove Label helper
  const handleRemoveLabel = (lbl: string) => {
    setLabels(prev => prev.filter(l => l !== lbl));
  };

  // File Attachment helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const fileList = Array.from(e.target.files);
    
    // Check extension
    const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".docx", ".doc", ".xlsx", ".txt"];
    const addedFiles: typeof attachments = [];

    fileList.forEach(file => {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (
        file.type.startsWith("image/") ||
        ext === ".pdf" ||
        ext === ".doc" ||
        ext === ".docx" ||
        ext === ".xlsx" ||
        ext === ".txt"
      ) {
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        addedFiles.push({
          name: file.name,
          size: `${sizeInMb} MB`,
          type: file.type
        });
      } else {
        toast.warning(`File "${file.name}" ignored. Only screenshots, images, documents, and PDFs are supported.`);
      }
    });

    if (addedFiles.length > 0) {
      setAttachments(prev => [...prev, ...addedFiles]);
      toast.success(`Attached ${addedFiles.length} file(s).`);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

      {/* Redesigned Modal Container */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-3xl shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-stone-800 dark:text-stone-200">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-border flex items-start justify-between bg-secondary/10">
          <div className="flex gap-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Create Work Item</h3>
              <p className="text-[11px] text-muted-foreground">Add a new item to track and manage work.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition">
            <X className="size-4.5" />
          </button>
        </div>

        {/* Compact Form Body */}
        <form onSubmit={handleCreate} className="px-6 py-4 space-y-3 text-xs">
          
          {/* Task Title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Pencil className="size-3.5 text-primary" /> Task Title <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground tabular-nums">{title.length} / 100</span>
            </div>
            <input
              required
              maxLength={100}
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-8.5 px-3 rounded-lg bg-secondary/50 border border-border focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary text-xs transition-all"
            />
          </div>

          {/* Type Select Cards */}
          <div className="space-y-1">
            <label className="font-bold text-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" /> Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "Task", label: "Task", icon: <ClipboardList className="size-3.5" />, color: "text-blue-500" },
                { id: "Story", label: "Story", icon: <BookOpen className="size-3.5" />, color: "text-amber-600" },
                { id: "Bug", label: "Bug", icon: <Bug className="size-3.5" />, color: "text-red-500" },
                { id: "Epic", label: "Epic", icon: <Crown className="size-3.5" />, color: "text-purple-500" },
                { id: "Feature", label: "Feature", icon: <Rocket className="size-3.5" />, color: "text-emerald-500" },
                { id: "Risk", label: "Risk", icon: <AlertTriangle className="size-3.5" />, color: "text-yellow-600" },
                { id: "Issue", label: "Issue", icon: <Ban className="size-3.5" />, color: "text-rose-500" }
              ].map((t) => {
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as any)}
                    className={`h-9 border rounded-lg flex items-center gap-2 px-2.5 transition-all text-left cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                        : "border-border hover:bg-secondary/40"
                    }`}
                  >
                    <span className={`${t.color}`}>{t.icon}</span>
                    <span className="font-semibold text-foreground">{t.label}</span>
                    {isSelected && (
                      <span className="ml-auto size-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Two Column Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* Left Column */}
            <div className="space-y-3">
              
              {/* Description & Rich text mockup */}
              <div className="space-y-1">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" /> Description
                </label>
                <div className="border border-border rounded-lg overflow-hidden bg-secondary/30">
                  <textarea
                    rows={3}
                    placeholder="Describe the task details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent focus:outline-none text-xs resize-none"
                  />
                  {/* Mock formatting toolbar */}
                  <div className="px-1.5 py-1 border-t border-border bg-secondary/80 flex items-center gap-1 flex-wrap text-muted-foreground select-none">
                    <button type="button" className="p-0.5 hover:bg-secondary rounded hover:text-foreground"><Bold className="size-3" /></button>
                    <button type="button" className="p-0.5 hover:bg-secondary rounded hover:text-foreground"><Italic className="size-3" /></button>
                    <button type="button" className="p-0.5 hover:bg-secondary rounded hover:text-foreground"><Link className="size-3" /></button>
                    <div className="h-3 w-px bg-border mx-0.5" />
                    <button type="button" className="p-0.5 hover:bg-secondary rounded hover:text-foreground"><List className="size-3" /></button>
                    <button type="button" className="p-0.5 hover:bg-secondary rounded hover:text-foreground"><ListOrdered className="size-3" /></button>
                    <div className="h-3 w-px bg-border mx-0.5" />
                    <button type="button" className="p-0.5 hover:bg-secondary rounded hover:text-foreground"><Quote className="size-3" /></button>
                    <button type="button" className="p-0.5 hover:bg-secondary rounded hover:text-foreground"><Code className="size-3" /></button>
                    <button type="button" className="p-0.5 hover:bg-secondary rounded hover:text-foreground"><Paperclip className="size-3" /></button>
                  </div>
                </div>
              </div>

              {/* Assignee Selection */}
              <div className="space-y-1">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" /> Assignee
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full h-8.5 px-2.5 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                >
                  <option value="">Search or select member</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.name}>{r.name} ({r.role})</option>
                  ))}
                </select>
              </div>

              {/* Labels/Tags */}
              <div className="space-y-1">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Tag className="size-3.5 text-primary" /> Labels
                </label>
                <div className="flex flex-wrap gap-1 items-center p-1.5 border border-border rounded-lg bg-secondary/20 min-h-[32px]">
                  {labels.map(lbl => (
                    <span key={lbl} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold text-[9px]">
                      {lbl}
                      <button type="button" onClick={() => handleRemoveLabel(lbl)} className="hover:text-red-500 font-bold ml-0.5">×</button>
                    </span>
                  ))}
                  
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                      className="size-5 rounded border border-border bg-card flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                    {showLabelDropdown && (
                      <div className="absolute left-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-elevated p-2 z-10 space-y-1.5">
                        <input
                          placeholder="Label name..."
                          value={newLabelInput}
                          onChange={(e) => setNewLabelInput(e.target.value)}
                          className="w-full h-7 px-1.5 bg-secondary text-xs rounded border border-border"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLabel())}
                        />
                        <button
                          type="button"
                          onClick={handleAddLabel}
                          className="w-full h-7 bg-primary text-white font-bold rounded text-[10px]"
                        >
                          Add Label
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-3">
              
              {/* Priority Chips */}
              <div className="space-y-1">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Flag className="size-3.5 text-primary" /> Priority
                </label>
                <div className="flex gap-1.5">
                  {[
                    { id: "Low", color: "bg-emerald-500 text-emerald-600 border-emerald-500/20 bg-emerald-500/5" },
                    { id: "Medium", color: "bg-amber-500 text-amber-600 border-primary bg-primary/5 font-bold ring-1 ring-primary" },
                    { id: "High", color: "bg-red-500 text-red-600 border-red-500/20 bg-red-500/5" },
                    { id: "Critical", color: "bg-purple-500 text-purple-600 border-purple-500/20 bg-purple-500/5" }
                  ].map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id as any)}
                        className={`flex-1 h-8 rounded-lg border text-[9px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? p.color
                            : "border-border hover:bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        <span className={`size-1 rounded-full ${
                          p.id === "Low" ? "bg-emerald-500" :
                          p.id === "Medium" ? "bg-amber-500" :
                          p.id === "High" ? "bg-red-500" : "bg-purple-500"
                        }`} />
                        {p.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Custom Dropdown */}
              <div className="space-y-1">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Activity className="size-3.5 text-primary" /> Status
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full h-8.5 px-2.5 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${statusesMeta.find(s => s.id === status)?.color || 'bg-stone-400'}`} />
                      <span className="font-semibold text-foreground">{status}</span>
                    </div>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>

                  {showStatusDropdown && (
                    <>
                      {/* Invisible backdrop to dismiss dropdown */}
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                      
                      <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-elevated p-1 z-20 max-h-56 overflow-y-auto">
                        {statusesMeta.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setStatus(s.id);
                              setShowStatusDropdown(false);
                            }}
                            className={`w-full h-8 px-2 rounded flex items-center gap-2 hover:bg-secondary/60 text-left transition cursor-pointer text-xs ${
                              status === s.id ? "bg-primary/5 text-primary font-bold" : "text-foreground"
                            }`}
                          >
                            <span className={`size-2 rounded-full ${s.color}`} />
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Due Date & Estimated Hours (Grid) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" /> Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-8.5 px-2 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary" /> Estimate
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      className="w-full h-8.5 pl-2 pr-6 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                    />
                    <span className="absolute right-2 text-[9px] text-muted-foreground font-semibold">hrs</span>
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-1">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Paperclip className="size-3.5 text-primary" /> Attachments
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                  className="hidden"
                />

                <div
                  onClick={triggerFileSelect}
                  className="border border-dashed border-border hover:border-primary rounded-lg py-2 px-3 text-center bg-secondary/10 hover:bg-primary/5 transition cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                    <Paperclip className="size-3 text-primary" />
                    <span className="font-semibold text-[9px]">Drag & drop files or <span className="text-primary hover:underline font-bold">browse</span></span>
                  </div>
                </div>

                {/* Render Attached Files list */}
                {attachments.length > 0 && (
                  <div className="space-y-1 max-h-[50px] overflow-y-auto">
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 border border-border rounded bg-card text-[9px]">
                        <span className="truncate font-semibold max-w-[150px]">{file.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{file.size}</span>
                          <button
                            type="button"
                            onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-red-500 font-bold hover:bg-secondary p-0.5 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground/85 font-medium">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Drafts are saved automatically</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="h-8.5 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-secondary transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="h-8.5 px-3 rounded-lg border border-primary/25 text-primary hover:bg-primary/5 text-xs font-semibold transition"
              >
                Save Draft
              </button>
              <button
                type="submit"
                className="h-8.5 px-3.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold shadow-copper inline-flex items-center gap-1.5 transition"
              >
                <Sparkles className="size-3" />
                Create Work Item
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
