/**
 * Test a complete draft through the engine
 * Run with: node test_full_draft.mjs
 */

import { readFileSync } from 'fs';

// Read and parse the TypeScript files as text to extract the logic
const serviceCode = readFileSync('./src/services/DraftService.ts', 'utf8');
const applyActionCode = readFileSync('./src/services/applyAction.ts', 'utf8');
const actionsCode = readFileSync('./src/services/types/DraftActions.ts', 'utf8');

console.log('Testing full draft simulation...');

// Simple direct test of the action sequence
console.log('\n=== Testing Action Sequence ===');

const testActions = [
  { type: 'CREATE_DRAFT', setCode: 'FFX' },
  { type: 'START_DRAFT' },
  { type: 'HUMAN_PICK', cardId: 'ffx-common-1' },
  { type: 'BOT_PICK', playerId: 'bot-1', cardId: 'ffx-common-2' },
  { type: 'BOT_PICK', playerId: 'bot-2', cardId: 'ffx-common-3' },
  { type: 'BOT_PICK', playerId: 'bot-3', cardId: 'ffx-common-4' },
  { type: 'BOT_PICK', playerId: 'bot-4', cardId: 'ffx-common-5' },
  { type: 'BOT_PICK', playerId: 'bot-5', cardId: 'ffx-common-6' },
  { type: 'BOT_PICK', playerId: 'bot-6', cardId: 'ffx-common-7' },
  { type: 'BOT_PICK', playerId: 'bot-7', cardId: 'ffx-common-8' },
  { type: 'PASS_PACKS' },
  { type: 'ADVANCE_POSITION' }
];

console.log('Expected action sequence for one pick:', testActions.map(a => a.type));

console.log('\n=== Key Question: Is this the right action sequence? ===');
console.log('After human pick + all bot picks + pass packs + advance position');
console.log('Should the human be at p1p2 with a pack of 14 cards?');

console.log('\n=== Testing Pick 2 ===');
const pick2Actions = [
  { type: 'HUMAN_PICK', cardId: 'ffx-common-9' },
  // ... same bot picks pattern
  { type: 'PASS_PACKS' },
  { type: 'ADVANCE_POSITION' }
];

console.log('Pick 2 should advance to p1p3...');

console.log('\n=== Core Engine Test Needed ===');
console.log('1. Create draft with seed "test123"');
console.log('2. Apply actions sequence above');
console.log('3. Verify human player is at p1p2 with correct pack');
console.log('4. Replay SAME sequence from seed "test123"');
console.log('5. Verify IDENTICAL result');

console.log('\n=== If this fails, engine is broken ===');
console.log('If this passes, UI integration is broken');