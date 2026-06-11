"use client";

import React, { useState } from "react";
import { WorkItem, Project } from "@/lib/store";
import { TaskTypeIcon } from "@/components/task-type-icon";
import { milestones } from "@/lib/mock";
import { Calendar, ChevronLeft, ChevronRight, Flag } from "lucide-react";

interface ProjectGanttProps {
  project: Project;
  tasks: WorkItem[];
}

export function ProjectGantt({ project, tasks }: ProjectGanttProps) {
  const projectTasks = tasks.filter(t => t.projectId === project.id && t.type !== "Epic");
  const projectMilestones = milestones.filter(m => m.project === project.name);

  // Timeline boundaries (defaults to project start & end, or standard 4-month range)
  const projStart = new Date(project.startDate || "2025-06-01");
  const projEnd = new Date(project.endDate || "2026-03-01");
  
  const totalDays = Math.max(1, Math.round((projEnd.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24)));

  // Task scheduling helpers (infer start/end if missing)
  const getTaskSchedule = (t: WorkItem) => {
    const end = t.dueDate ? new Date(t.dueDate) : projEnd;
    
    // Estimate start date: 8 hours of estimated work = 1 day, minimum 3 days duration
    const durationDays = Math.max(3, Math.ceil(t.estimatedHours / 8));
    const start = new Date(end.getTime());
    start.setDate(start.getDate() - durationDays);

    // Bound within project dates
    const finalStart = start < projStart ? projStart : start;
    const finalEnd = end > projEnd ? projEnd : end;

    return { start: finalStart, end: finalEnd };
  };

  const getPercentageStyles = (start: Date, end: Date) => {
    const startDiff = start.getTime() - projStart.getTime();
    const startPct = Math.min(100, Math.max(0, (startDiff / (1000 * 60 * 60 * 24)) / totalDays * 100));

    const durationDiff = end.getTime() - start.getTime();
    const durationPct = Math.min(100 - startPct, Math.max(1, (durationDiff / (1000 * 60 * 60 * 24)) / totalDays * 100));

    return { left: `${startPct}%`, width: `${durationPct}%` };
  };

  // Build grid month markers
  const months: { name: string; pctWidth: number }[] = [];
  const tempDate = new Date(projStart.getTime());
  
  while (tempDate < projEnd) {
    const month = tempDate.getMonth();
    const year = tempDate.getFullYear();
    const monthName = tempDate.toLocaleString("default", { month: "short" });
    
    // Calculate days remaining in this month within boundaries
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const endOfIntersect = lastDayOfMonth > projEnd ? projEnd : lastDayOfMonth;
    const daysInMonth = Math.round((endOfIntersect.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    months.push({
      name: `${monthName} '${String(year).slice(-2)}`,
      pctWidth: (daysInMonth / totalDays) * 100
    });

    // Advance to start of next month
    tempDate.setMonth(tempDate.getMonth() + 1);
    tempDate.setDate(1);
  }

  return (
    <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      
      {/* Timeline Controls / Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-secondary/10">
        <div className="flex items-center gap-2">
          <Calendar className="size-4.5 text-primary" />
          <h3 className="text-sm font-semibold">Project Schedule Timeline</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-primary" /> Active Tasks</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" /> Done</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500" /> Blocked</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        
        {/* Left: Task Titles List */}
        <div className="w-full md:w-80 shrink-0 border-r border-border bg-secondary/20 divide-y divide-border/40 select-none">
          <div className="h-10 px-4 flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/50">
            Work Item
          </div>
          <div className="divide-y divide-border/40 max-h-[500px] overflow-y-auto">
            {projectTasks.map((t) => (
              <div key={t.id} className="h-12 px-4 flex items-center gap-2 text-xs hover:bg-secondary/40 transition">
                <TaskTypeIcon type={t.type} className="size-3.5 shrink-0" />
                <span className="font-semibold text-muted-foreground shrink-0">{t.id}</span>
                <span className="truncate font-medium text-foreground/95">{t.title}</span>
              </div>
            ))}
            {projectMilestones.map((m, idx) => (
              <div key={idx} className="h-12 px-4 flex items-center gap-2 text-xs bg-amber-500/5 hover:bg-amber-500/10 transition border-t border-border">
                <Flag className="size-3.5 text-amber-500 shrink-0" />
                <span className="font-bold text-amber-600 uppercase text-[9px] tracking-wider shrink-0">Milestone</span>
                <span className="truncate font-semibold text-foreground/90">{m.name}</span>
              </div>
            ))}
            {projectTasks.length === 0 && projectMilestones.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground italic">No scheduled tasks</div>
            )}
          </div>
        </div>

        {/* Right: Gantt Bars Grid */}
        <div className="flex-1 overflow-x-auto select-none">
          <div className="min-w-[600px] divide-y divide-border/40 max-h-[540px]">
            
            {/* Header: Months */}
            <div className="h-10 flex bg-secondary/30">
              {months.map((m, idx) => (
                <div
                  key={idx}
                  style={{ width: `${m.pctWidth}%` }}
                  className="h-full border-r border-border last:border-none flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                >
                  {m.name}
                </div>
              ))}
            </div>

            {/* Task Bars List */}
            <div className="divide-y divide-border/40 overflow-y-auto max-h-[500px]">
              {projectTasks.map((t) => {
                const { start, end } = getTaskSchedule(t);
                const styles = getPercentageStyles(start, end);
                
                const barColor =
                  t.status === "Done"
                    ? "bg-emerald-500 shadow-emerald"
                    : t.status === "Blocked"
                    ? "bg-red-500 shadow-red"
                    : "bg-gradient-to-r from-primary to-accent shadow-copper";

                return (
                  <div key={t.id} className="h-12 relative flex items-center px-2 hover:bg-secondary/10 transition">
                    {/* Grid vertical lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {months.map((m, idx) => (
                        <div key={idx} style={{ width: `${m.pctWidth}%` }} className="h-full border-r border-border/30 last:border-none" />
                      ))}
                    </div>

                    {/* Gantt Bar */}
                    <div
                      style={{ left: styles.left, width: styles.width }}
                      className={`absolute h-6 rounded-lg ${barColor} flex items-center px-2.5 text-[10px] font-bold text-white shadow-soft transition-all duration-350 cursor-pointer overflow-hidden group`}
                      title={`${t.id}: ${t.title} (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`}
                    >
                      <span className="truncate group-hover:scale-105 transition-transform duration-150">{t.title}</span>
                    </div>
                  </div>
                );
              })}

              {/* Milestone flags */}
              {projectMilestones.map((m, idx) => {
                // Heuristic: map December milestones to middle of month, others to similar dates
                const parseDateStr = (dateStr: string) => {
                  const currentYear = new Date().getFullYear();
                  return new Date(`${dateStr}, ${currentYear}`);
                };
                
                const milestoneDate = parseDateStr(m.date);
                const boundedDate = milestoneDate < projStart ? projStart : milestoneDate > projEnd ? projEnd : milestoneDate;
                const diff = boundedDate.getTime() - projStart.getTime();
                const leftPct = (diff / (1000 * 60 * 60 * 24)) / totalDays * 100;

                return (
                  <div key={idx} className="h-12 relative flex items-center px-2 bg-amber-500/5 hover:bg-amber-500/10 transition">
                    <div className="absolute inset-0 flex pointer-events-none">
                      {months.map((mo, i) => (
                        <div key={i} style={{ width: `${mo.pctWidth}%` }} className="h-full border-r border-border/30 last:border-none" />
                      ))}
                    </div>

                    {/* Flag pins */}
                    <div
                      style={{ left: `${leftPct}%` }}
                      className="absolute -translate-x-1/2 flex flex-col items-center gap-1 z-10 cursor-pointer"
                      title={`Milestone: ${m.name} (${m.date})`}
                    >
                      <Flag className="size-4 text-amber-500 fill-amber-500 drop-shadow-sm" />
                      <div className="h-4 w-0.5 bg-amber-500" />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
