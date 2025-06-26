/**
 * FlashDraft API - Get Set Data
 * 
 * API endpoint to load MTG set data for client-side consumption.
 */

import type { APIRoute } from 'astro';
import { loadSetData } from '../../../shared/utils/dataLoader';

export const GET: APIRoute = async ({ params }) => {
  const { setCode } = params;
  
  if (!setCode) {
    return new Response(JSON.stringify({ error: 'Set code is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const setData = await loadSetData(setCode.toUpperCase());
    
    return new Response(JSON.stringify(setData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to load set data' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};