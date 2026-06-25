import React from 'react';

const GlassCard = ({ 
  children, 
  className = '', 
  glowBorder = false,
  animated = false
}) => {
  const borderClasses = glowBorder 
    ? 'border-accent-cyan/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
    : 'border-medichain-border';

  const animationClasses = animated 
    ? 'relative overflow-hidden' 
    : '';

  return (
    <div className={`glass-card p-6 ${borderClasses} ${animationClasses} ${className}`}>
      {/* Animated scanline effect for extreme futuristic feel if requested */}
      {animated && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-gradient-to-b from-transparent via-accent-cyan to-transparent h-10 w-full animate-scanline"></div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
