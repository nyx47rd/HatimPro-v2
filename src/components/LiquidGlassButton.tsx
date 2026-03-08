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
    light: 'bg-white/10 backdrop-blur-md border-white/20',
    medium: 'bg-white/20 backdrop-blur-lg border-white/30 shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]',
    heavy: 'bg-white/30 backdrop-blur-xl border-white/40 shadow-[0_8px_32px_0_rgba(255,255,255,0.2)]'
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
        before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
        ${className}
      `}
      {...props}
    >
      <div className="relative z-10">
        {children}
      </div>
    </motion.button>
  );
};
