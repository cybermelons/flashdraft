/**
 * LayoutHeader - Standardized header component for all layout pages
 * 
 * Provides consistent header styling and button sizes across all pages
 */

import React from 'react';
import { HeaderButton, HeaderButtonGroup } from './HeaderButton';

interface LayoutHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function LayoutHeader({ 
  title, 
  backHref = '/',
  backLabel = 'Back to Home',
  actions,
  className = ''
}: LayoutHeaderProps) {
  return (
    <header className={`bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
          <HeaderButtonGroup>
            {actions}
            <HeaderButton href={backHref} variant="secondary">
              {backLabel}
            </HeaderButton>
          </HeaderButtonGroup>
        </div>
      </div>
    </header>
  );
}