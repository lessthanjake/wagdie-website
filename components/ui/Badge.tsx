import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const baseStyles = "inline-flex items-center px-2 py-0.5 text-caption  tracking-widest font-eskapade border";

  const variants = {
    default: "bg-midnight/40 border-soul-900/50 text-ash",
    accent: "bg-soul-accent/10 border-soul-accent/40 text-soul-accent shadow-soul-glow",
    outline: "bg-transparent border-soul-900/50 text-ash hover:text-bone hover:border-soul-accent/40 transition-colors",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
