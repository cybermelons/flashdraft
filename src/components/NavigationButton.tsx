/**
 * NavigationButton - Standardized navigation button for draft interface
 * 
 * Used for previous/next navigation with consistent sizing
 */

import React from 'react';

interface NavigationButtonProps {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  direction: 'prev' | 'next';
  title?: string;
  className?: string;
}

export function NavigationButton({ 
  href, 
  onClick, 
  disabled = false,
  direction,
  title,
  className = ''
}: NavigationButtonProps) {
  // Standardized size classes - matches HeaderButton icon size
  const sizeClasses = 'h-9 w-9 sm:h-10 sm:w-10';
  
  const baseClasses = `${sizeClasses} rounded-xl font-bold transition-all duration-200 flex items-center justify-center ${className}`;
  
  const enabledClasses = 'bg-slate-700/50 hover:bg-slate-600/50 text-white';
  const disabledClasses = 'bg-slate-800/50 text-slate-500 cursor-not-allowed';
  
  const classes = `${baseClasses} ${disabled ? disabledClasses : enabledClasses}`;
  
  const icon = direction === 'prev' ? (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
    </svg>
  ) : (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
    </svg>
  );
  
  if (disabled) {
    return (
      <span className={classes}>
        {icon}
      </span>
    );
  }
  
  if (href) {
    return (
      <a href={href} className={classes} title={title}>
        {icon}
      </a>
    );
  }
  
  return (
    <button onClick={onClick} className={classes} title={title}>
      {icon}
    </button>
  );
}