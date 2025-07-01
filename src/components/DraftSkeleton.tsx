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

      <div className="flex flex-1 min-h-0">
        {/* Main content area */}
        <main className="flex-1 p-6">
          {/* Pack area skeleton - 5x3 grid matching PackDisplay */}
          <div className="max-w-[1320px] mx-auto">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="relative">
                  <div className="aspect-[488/680] bg-slate-700 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Sidebar skeleton - matches DraftSidebar */}
        <aside className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50 p-4 overflow-y-auto">
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
        </aside>
      </div>

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