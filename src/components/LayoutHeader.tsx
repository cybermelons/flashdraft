/**
 * LayoutHeader - Simple, clean header component for layout pages
 * 
 * Provides consistent header with title, optional subtitle, and navigation
 */

import React from 'react';
import { HeaderButton } from './HeaderButton';

interface LayoutHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function LayoutHeader({ 
  title, 
  subtitle,
  className = ''
}: LayoutHeaderProps) {
  return (
    <header className={`bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and subtitle */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
            )}
          </div>
          
          {/* Right side - Back to home button */}
          <HeaderButton href="/" variant="secondary">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            Home
          </HeaderButton>
        </div>
      </div>
    </header>
  );
}
