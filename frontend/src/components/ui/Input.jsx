// frontend/src/components/ui/Input.jsx
import React from "react";

export const Input = React.forwardRef(function Input({
  label, error, hint, id, required = false,
  className = "", containerClassName = "", prefix, suffix, ...props
}, ref) {
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className="hc-label">
          {label}{required && <span className="text-hc-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {prefix && <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-hc-text-muted">{prefix}</div>}
        <input
          ref={ref}
          id={id}
          className={[error ? "hc-input-error" : "hc-input", prefix ? "pl-10" : "", suffix ? "pr-10" : "", className].filter(Boolean).join(" ")}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {suffix && <div className="absolute inset-y-0 right-3 flex items-center">{suffix}</div>}
      </div>
      {error && <p className="mt-1.5 text-xs text-hc-danger font-medium">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-hc-text-muted">{hint}</p>}
    </div>
  );
});
export default Input;
