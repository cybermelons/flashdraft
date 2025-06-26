/**
 * FlashDraft API - List Available Sets
 * 
 * API endpoint to get list of available MTG sets.
 */

import type { APIRoute } from 'astro';
import { listAvailableSets } from '../../../shared/utils/dataLoader';

export const GET: APIRoute = async () => {
  try {
    const sets = await listAvailableSets();
    
    return new Response(JSON.stringify({ sets }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to list sets' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};