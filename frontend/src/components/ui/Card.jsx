// frontend/src/components/ui/Card.jsx
import React from "react";

export function Card({ children, className = "", hover = false, padding = true, ...props }) {
  return (
    <div className={[hover ? "hc-card-hover" : "hc-card", padding ? "p-6" : "", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}
export function CardHeader({ children, className = "" }) { return <div className={"mb-4 " + className}>{children}</div>; }
export function CardTitle({ children, className = "" }) { return <h3 className={"text-base font-semibold text-hc-text " + className}>{children}</h3>; }
export function CardDescription({ children, className = "" }) { return <p className={"text-sm text-hc-text-muted mt-1 " + className}>{children}</p>; }
export default Card;
