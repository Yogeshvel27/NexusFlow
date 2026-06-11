import React from "react";
import {
  ArrowUp,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Square,
  Zap,
  GitMerge,
  Target,
  Hexagon,
  LucideIcon,
  BookOpen,
  Rocket,
  AlertTriangle,
  Ban
} from "lucide-react";
import { WorkItem } from "@/lib/store";

interface TaskTypeIconProps {
  type: WorkItem['type'];
  className?: string;
}

export const taskTypeMeta: Record<
  WorkItem['type'],
  { icon: LucideIcon; color: string; bgColor: string; label: string }
> = {
  Epic: {
    icon: Zap,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "Epic"
  },
  "Feature Request": {
    icon: Bookmark,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "Feature"
  },
  Improvement: {
    icon: ArrowUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    label: "Improvement"
  },
  UX: {
    icon: Square,
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    label: "UX"
  },
  Technology: {
    icon: Hexagon,
    color: "text-stone-400",
    bgColor: "bg-stone-400/10",
    label: "Tech"
  },
  Task: {
    icon: CheckCircle2,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Task"
  },
  "Sub-task": {
    icon: GitMerge,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    label: "Sub-task"
  },
  "Test Sub-task": {
    icon: Target,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    label: "Test Sub-task"
  },
  Bug: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Bug"
  },
  Story: {
    icon: BookOpen,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    label: "Story"
  },
  Feature: {
    icon: Rocket,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    label: "Feature"
  },
  Risk: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
    label: "Risk"
  },
  Issue: {
    icon: Ban,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    label: "Issue"
  }
};

export function TaskTypeIcon({ type, className = "size-4" }: TaskTypeIconProps) {
  const meta = taskTypeMeta[type];
  if (!meta) return null;

  const IconComponent = meta.icon;

  return (
    <span
      className={`inline-flex items-center justify-center p-1 rounded ${meta.bgColor} ${meta.color} ${className}`}
      title={meta.label}
    >
      <IconComponent className="size-full shrink-0" />
    </span>
  );
}
