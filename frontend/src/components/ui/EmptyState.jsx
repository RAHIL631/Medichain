// frontend/src/components/ui/EmptyState.jsx
import React from "react";
import { Button } from "./Button";

export function EmptyState({ icon, title, description, action, actionLabel, variant = "default" }) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const Comp = icon;
    return <Comp className="w-8 h-8" />;
  };

  return (
    <div className={"hc-card p-12 text-center flex flex-col items-center " + (variant === "dashed" ? "border-dashed" : "")}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-hc-bg-alt border border-hc-border-light flex items-center justify-center mb-5 text-hc-text-light">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-base font-semibold text-hc-text mb-2">{title}</h3>
      {description && <p className="text-sm text-hc-text-muted max-w-xs leading-relaxed mb-6">{description}</p>}
      {action && actionLabel && <Button variant="primary" onClick={action}>{actionLabel}</Button>}
    </div>
  );
}
export default EmptyState;
