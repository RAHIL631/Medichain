// frontend/src/components/ui/PageHeader.jsx
import React from "react";

export function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        {breadcrumb && <p className="text-xs text-hc-text-muted mb-1">{breadcrumb}</p>}
        <h1 className="text-2xl font-bold text-hc-text leading-tight">{title}</h1>
        {description && <p className="text-sm text-hc-text-muted mt-1 max-w-lg leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
export default PageHeader;
