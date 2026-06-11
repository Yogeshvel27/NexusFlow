import React from "react";

export default function Loading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="relative size-12">
        <div className="absolute inset-0 rounded-full border-4 border-stone-200/60 dark:border-stone-800/40" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
      </div>
      <div className="flex flex-col items-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">Loading NexusFlow</span>
        <span className="text-[10px] text-muted-foreground">Retrieving workspace data...</span>
      </div>
    </div>
  );
}
