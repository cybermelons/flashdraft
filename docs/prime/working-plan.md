# Development Plan: Draft State Permalinks

## Overview
Add permalink system for draft states with URLs like `/draft/{draftId}/p{round}p{pick}`. URL updates after each pick (p1p1 → p1p2 → etc.) and supports direct navigation to any position.

## Approach
1. **URL Structure**: `/draft/{draftId}/p{round}p{pick}` format
2. **Auto-update**: URL changes after each human pick  
3. **Direct Navigation**: Load draft at specified position
4. **404 for invalid**: Invalid draft IDs or positions return 404

## Implementation Checklist

### Phase 1: Update Routing
- [x] **Create new Astro route**: `[draftId]/[position].astro` ✓ (Already exists)
- [x] **Parse URL format**: Extract round/pick from `p{round}p{pick}` ✓ (Already implemented)
- [x] **Handle 404s**: Invalid draftId or position format ✓

### Phase 2: URL Updates  
- [x] **Update draftStore**: Change URL after each human pick ✓ (Already implemented)
- [x] **Use replaceState()**: Avoid cluttering browser history ✓ (Already uses replaceState)
- [x] **Update draft start**: Redirect to `/draft/{id}/p1p1` when starting ✓

### Phase 3: Direct Navigation
- [x] **Load draft state**: Parse URL params and set current position ✓
- [x] **Validate position**: 404 if position doesn't exist or is invalid ✓
- [x] **Update existing URL utilities**: Simplify for new format ✓ (Removed old utilities)

### Phase 4: Navigation Controls
- [x] **Add Previous button**: Go to previous pick (if available) ✓
- [x] **Add Next button**: Go to next pick (if available) ✓ 
- [x] **Show current position**: Display "Round X, Pick Y" in UI ✓

## Technical Details

### URL Examples
```
/draft/abc123/p1p1   (Round 1, Pick 1)
/draft/abc123/p2p8   (Round 2, Pick 8)
/draft/abc123/p3p15  (Round 3, Pick 15)
```

### Changes Needed
- **Draft Store**: Add URL update method
- **Astro Routes**: New dynamic route structure
- **Components**: Previous/Next navigation buttons

## Success Criteria ✅ ALL COMPLETE
- [x] URLs update automatically (p1p1 → p1p2 → etc.) ✓
- [x] Direct navigation works for valid URLs ✓
- [x] Invalid URLs return 404 ✓
- [x] Previous/Next buttons work correctly ✓
- [x] No performance regression ✓

## Implementation Summary

Successfully implemented draft state permalinks for the nanostore-based draft system:

### ✅ **Completed Features**
1. **Automatic URL Updates**: URLs change from p1p1 → p1p2 → etc. after each pick
2. **Direct Navigation**: Can navigate directly to any `/draft/{id}/p{round}p{pick}` URL
3. **Validation & 404s**: Invalid draft IDs or positions show proper error messages
4. **Navigation Controls**: Previous/Next buttons with proper state management
5. **Persistence**: Draft state saved to localStorage for URL navigation
6. **Clean Integration**: Works seamlessly with existing nanostore draft engine

### 🔧 **Technical Implementation** 
- **URL Format**: `/draft/{draftId}/p{round}p{pick}` (e.g., `/draft/abc123/p2p8`)
- **State Management**: Enhanced nanostore system with localStorage persistence
- **Browser History**: Uses `replaceState()` to avoid cluttering back button
- **Validation**: Checks valid ranges (p1p1 through p3p15) and draft existence
- **UI Integration**: Previous/Next buttons with visual disabled states

### 🧹 **Code Cleanup**
- Removed old Zustand-based draft store and utilities
- Kept good UI components for future integration
- Simplified codebase to single draft engine (nanostores)

---

*Simple permalink system that makes draft positions shareable and navigable.*