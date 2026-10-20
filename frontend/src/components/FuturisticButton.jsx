import React from 'react';

const FuturisticButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  type = 'button',
  icon = null,
  disabled = false,
  loading = false,
  ...rest
}) => {
  const baseStyles = 'relative inline-flex items-center justify-center font-display tracking-widest font-bold uppercase transition-all duration-300 rounded-lg overflow-hidden group';
  
  const variants = {
    primary: 'bg-gradient-to-r from-accent-blue to-accent-cyan text-white neon-glow-hover px-6 py-3',
    secondary: 'bg-medichain-surface border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 hover:border-accent-cyan neon-glow-hover px-6 py-3',
    danger: 'bg-medichain-surface border border-status-danger/30 text-status-danger hover:bg-status-danger/10 hover:border-status-danger hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] px-6 py-3',
    wallet: 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] px-6 py-3'
  };

  const widthStyle = fullWidth ? 'w-full' : 'w-auto';
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
      {...rest}
    >
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          icon && <span className="w-5 h-5">{icon}</span>
        )}
        {children}
      </span>
      {/* Glow overlay */}
      {!isDisabled && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-300"></div>}
    </button>
  );
};

export default FuturisticButton;
