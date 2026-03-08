import React from 'react';
import { motion } from 'motion/react';

interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  intensity?: 'light' | 'medium' | 'heavy';
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({ 
  children, 
  className = '', 
  intensity = 'medium',
  ...props 
}) => {
  const intensityClasses = {
    light: 'bg-neutral-900/40 backdrop-blur-md border-white/10 hover:bg-neutral-900/50',
    medium: 'bg-neutral-900/60 backdrop-blur-lg border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:bg-neutral-900/70',
    heavy: 'bg-neutral-900/80 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] hover:bg-neutral-900/90'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden rounded-2xl border
        ${intensityClasses[intensity]}
        transition-all duration-300
        before:absolute before:inset-0
        before:-translate-x-full before:animate-shimmer
        before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent
        ${className}
      `}
      {...props}
    >
      <div className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
        {children}
      </div>
    </motion.button>
  );
};
