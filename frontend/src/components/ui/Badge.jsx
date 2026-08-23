// frontend/src/components/ui/Badge.jsx
import React from "react";

const VARIANTS = {
  success: "hc-badge-success", warning: "hc-badge-warning", danger: "hc-badge-danger",
  info: "hc-badge-info", neutral: "hc-badge-neutral", violet: "hc-badge-violet",
  primary: "hc-badge-primary", teal: "hc-badge-teal",
};
const STATUS_MAP = {
  verified: "success", active: "success", safe: "success", healthy: "success",
  pending: "warning", review: "warning",
  revoked: "danger", expired: "danger", high: "danger", urgent: "danger",
  inactive: "neutral", unknown: "neutral",
  ai: "violet", blockchain: "violet",
};

export function Badge({ children, variant = "neutral", className = "", dot = false }) {
  return (
    <span className={(VARIANTS[variant] || "hc-badge-neutral") + (className ? " " + className : "")}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
export function StatusBadge({ status = "" }) {
  const lower = (status || "").toLowerCase();
  const variant = STATUS_MAP[lower] || "neutral";
  return <Badge variant={variant} dot>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
export default Badge;
