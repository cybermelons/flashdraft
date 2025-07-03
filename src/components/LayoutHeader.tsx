/**
 * LayoutHeader - Standardized header component for all layout pages
 * 
 * Provides consistent header styling and button sizes across all pages
 */

import React from 'react';
import { HeaderButton, HeaderButtonGroup } from './HeaderButton';

interface LayoutHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function LayoutHeader({ 
  title, 
  subtitle,
  backHref = '/',
  backLabel = 'Back',
  actions,
  className = ''
}: LayoutHeaderProps) {
  return (
    <header className={`bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 ${className}`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* Mobile Layout */}
        <div className="flex flex-col sm:hidden gap-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-white truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            <HeaderButtonGroup>
              {actions}
              <HeaderButton href={backHref} variant="icon" title={backLabel}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </HeaderButton>
            </HeaderButtonGroup>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {title}
              {subtitle && (
                <span className="ml-3 text-sm sm:text-base text-slate-400 font-normal">{subtitle}</span>
              )}
            </h1>
          </div>
          <HeaderButtonGroup>
            {actions}
            <HeaderButton href={backHref} variant="secondary">
              <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7"></path>
              </svg>
              <span>{backLabel}</span>
            </HeaderButton>
          </HeaderButtonGroup>
        </div>
      </div>
    </header>
  );
}