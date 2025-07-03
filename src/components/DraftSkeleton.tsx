/**
 * Draft Skeleton - Loading state skeleton for draft interface
 * 
 * Displays skeleton elements that match the exact dimensions of the
 * actual draft interface to prevent layout shift during loading.
 */

export function DraftSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header skeleton - matches DraftHeader */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Draft info skeleton */}
            <div className="flex items-center gap-6">
              <div>
                <div className="h-7 w-32 bg-slate-700 rounded animate-pulse mb-2" />
                <div className="flex items-center gap-3">
                  <div className="h-6 w-20 bg-slate-700/50 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-slate-700/50 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Navigation skeleton */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700/50 animate-pulse" />
                <div className="text-center">
                  <div className="h-7 w-20 bg-slate-700 rounded animate-pulse mb-1" />
                  <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-700/50 animate-pulse" />
              </div>
            </div>

            {/* Right side controls skeleton */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-24 bg-slate-700/50 rounded-xl animate-pulse" />
              <div className="h-10 w-32 bg-slate-700/50 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content area - full width when sidebar closed */}
      <div className="flex-1 relative overflow-hidden">
        <main className="h-full p-6 overflow-y-auto">
          {/* Pack area skeleton - Exactly matching PackDisplay responsive grid */}
          <div className="w-full">
            <div className="gap-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="relative group w-full">
                  {/* Exact same structure as PackDisplay cards with responsive aspect ratio */}
                  <div className="w-full aspect-[488/680] bg-slate-700/50 border border-slate-600 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Sidebar skeleton - hidden by default to match real DraftSidebar (translate-x-full = hidden) */}
      <aside className="fixed top-0 right-0 h-full w-full lg:w-80 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700/50 flex flex-col transition-transform duration-300 z-30 translate-x-full">
        <div className="p-4">
          {/* Decklist header */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-24 bg-slate-700 rounded animate-pulse" />
            <div className="h-6 w-12 bg-slate-700/50 rounded animate-pulse" />
          </div>

          {/* Sort/filter controls */}
          <div className="flex gap-2 mb-4">
            <div className="h-9 w-24 bg-slate-700/50 rounded-lg animate-pulse" />
            <div className="h-9 w-24 bg-slate-700/50 rounded-lg animate-pulse" />
          </div>

          {/* Mana curve skeleton */}
          <div className="bg-slate-700/30 rounded-lg p-3 mb-4">
            <div className="h-5 w-20 bg-slate-600 rounded animate-pulse mb-2" />
            <div className="flex items-end gap-1" style={{ height: '60px' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-600 rounded-t animate-pulse"
                  style={{ height: `${20 + Math.random() * 40}px` }}
                />
              ))}
            </div>
          </div>

          {/* Card list skeleton */}
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-700/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </aside>

      {/* Progress bar skeleton */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-t border-slate-700/50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-700/50 rounded-full h-3">
              <div className="bg-slate-600 h-3 rounded-full animate-pulse" style={{ width: '33%' }} />
            </div>
            <div className="h-5 w-32 bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}