// frontend/src/components/ui/Skeleton.jsx
import React from "react";

export function Skeleton({ className = "", width, height }) {
  return <div className={"hc-skeleton " + className} style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="hc-card p-6 space-y-3">
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={"h-4 " + (i % 2 === 0 ? "w-full" : "w-3/4")} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="hc-card p-5 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

export default Skeleton;
