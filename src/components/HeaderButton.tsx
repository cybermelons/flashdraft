/**
 * HeaderButton - Standardized button component for draft interface headers
 * 
 * Provides consistent sizing and styling for all header buttons
 */

import React from 'react';

interface HeaderButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'icon';
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function HeaderButton({ 
  href, 
  onClick, 
  variant = 'secondary',
  active = false,
  disabled = false,
  children, 
  className = '',
  title
}: HeaderButtonProps) {
  // Base classes for all buttons - standardized height and padding
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Size classes - uniform across all variants
  const sizeClasses = {
    primary: 'h-9 sm:h-10 px-3 sm:px-4 text-sm sm:text-base rounded-xl',
    secondary: 'h-9 sm:h-10 px-3 sm:px-4 text-sm sm:text-base rounded-xl',
    icon: 'h-9 sm:h-10 w-9 sm:w-10 rounded-xl' // Square for icon buttons
  };
  
  // Style classes based on variant and state
  const variantClasses = {
    primary: active
      ? 'bg-blue-600 hover:bg-blue-500 text-white'
      : 'bg-blue-600 hover:bg-blue-500 text-white',
    secondary: active
      ? 'bg-slate-600/50 text-white'
      : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white',
    icon: active
      ? 'bg-slate-600/50 text-white'
      : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
  };
  
  const classes = `${baseClasses} ${sizeClasses[variant]} ${variantClasses[variant]} ${className}`;
  
  // Render as link or button
  if (href && !disabled) {
    return (
      <a href={href} className={classes} title={title}>
        {children}
      </a>
    );
  }
  
  return (
    <button 
      onClick={onClick} 
      className={classes} 
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

/**
 * HeaderButtonGroup - Container for grouping header buttons
 */
export function HeaderButtonGroup({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 sm:gap-2 ${className}`}>
      {children}
    </div>
  );
}