// frontend/src/components/ui/Button.jsx
import React from "react";
import { Loader2 } from "lucide-react";

const VARIANT_CLS = {
  primary:   "hc-btn-primary",
  secondary: "hc-btn-secondary",
  ghost:     "hc-btn-ghost",
  danger:    "hc-btn-danger",
  teal:      "hc-btn-teal",
};
const SIZE_CLS = { sm: "hc-btn-sm", md: "", lg: "hc-btn-lg" };

export const Button = React.forwardRef(function Button({
  children, variant = "primary", size = "md",
  loading = false, fullWidth = false, className = "", ...props
}, ref) {
  return (
    <button
      ref={ref}
      className={["hc-btn", VARIANT_CLS[variant] || VARIANT_CLS.primary, SIZE_CLS[size] || "", fullWidth ? "w-full" : "", className].filter(Boolean).join(" ")}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
});

export default Button;
