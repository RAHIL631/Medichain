// frontend/src/components/ui/StatCard.jsx
import React from "react";
import { SkeletonStat } from "./Skeleton";

const ICON_BG = {
  default: "bg-hc-blue-soft    text-hc-blue",
  success: "bg-hc-success-soft text-hc-success",
  warning: "bg-hc-warning-soft text-hc-warning",
  danger:  "bg-hc-danger-soft  text-hc-danger",
  teal:    "bg-hc-teal-soft    text-hc-teal",
  violet:  "bg-hc-violet-soft  text-hc-violet",
};

export function StatCard({ icon, label, value, sub, loading = false, variant = "default", action, actionLabel }) {
  if (loading) return <SkeletonStat />;
  const iconCls = ICON_BG[variant] || ICON_BG.default;
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const Comp = icon;
    return <Comp className="w-5 h-5" />;
  };

  return (
    <div className="hc-card p-5 flex items-start gap-4">
      {icon && <div className={"w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 " + iconCls}>{renderIcon()}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-hc-text-muted uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-hc-text leading-none">{value != null ? value : "—"}</p>
        {sub && <p className="text-xs text-hc-text-muted mt-1">{sub}</p>}
      </div>
      {action && actionLabel && (
        <button onClick={action} className="text-xs text-hc-blue hover:underline font-medium flex-shrink-0 mt-0.5">{actionLabel}</button>
      )}
    </div>
  );
}
export default StatCard;
