"use client";

import React, { useEffect, useState } from "react";
import { WorkItem } from "@/lib/store";
import { AlertCircle, Clock } from "lucide-react";

interface TaskTimerProps {
  task: WorkItem;
  showIcon?: boolean;
}

export function TaskTimer({ task, showIcon = false }: TaskTimerProps) {
  const [actualHours, setActualHours] = useState(task.actualHours);

  useEffect(() => {
    if (task.status !== "In Progress" || !task.timerStartedAt) {
      setActualHours(task.actualHours);
      return;
    }

    const interval = setInterval(() => {
      const elapsedSeconds = Math.round((new Date().getTime() - new Date(task.timerStartedAt!).getTime()) / 1000);
      const totalSeconds = (task.accumulatedSeconds || 0) + elapsedSeconds;
      const hrs = Number((totalSeconds / 3600).toFixed(2));
      setActualHours(hrs);
    }, 1000);

    return () => clearInterval(interval);
  }, [task.status, task.timerStartedAt, task.actualHours, task.accumulatedSeconds]);

  const isDelayed = task.isDelayed || (task.estimatedHours > 0 && actualHours > task.estimatedHours);

  return (
    <span className={`inline-flex items-center gap-1 tabular-nums font-semibold ${
      isDelayed 
        ? "text-red-500 font-bold dark:text-red-400" 
        : task.status === "In Progress"
        ? "text-emerald-500 font-bold dark:text-emerald-400"
        : "text-muted-foreground"
    }`}>
      {showIcon && (
        isDelayed ? (
          <AlertCircle className="size-3 text-red-500 animate-bounce" />
        ) : task.status === "In Progress" ? (
          <Clock className="size-3 text-emerald-500 animate-spin" style={{ animationDuration: "3s" }} />
        ) : null
      )}
      <span>{actualHours}/{task.estimatedHours || 0}h</span>
    </span>
  );
}
