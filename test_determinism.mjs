/**
 * Test script to verify draft determinism
 * Run with: pnpm exec node test_determinism.mjs
 */

console.log('Testing draft determinism...');

// Simple test of seeded random first
import { SeededRandom } from './src/shared/utils/seededRandom.js';

console.log('\n=== Testing SeededRandom ===');
const seed = 'test123';
const rng1 = new SeededRandom(seed);
const rng2 = new SeededRandom(seed);

const sequence1 = [];
const sequence2 = [];

for (let i = 0; i < 10; i++) {
  sequence1.push(rng1.next());
  sequence2.push(rng2.next());
}

console.log('Sequence 1:', sequence1);
console.log('Sequence 2:', sequence2);
console.log('Sequences match:', JSON.stringify(sequence1) === JSON.stringify(sequence2));

// Test pack generation
import { generateAllDraftPacks } from './src/shared/utils/seededPackGenerator.js';

console.log('\n=== Testing Pack Generation ===');
const mockSetData = {
  set_code: 'TEST',
  cards: []
};

// Generate mock cards
for (let i = 1; i <= 50; i++) {
  mockSetData.cards.push({
    id: `test-common-${i}`,
    name: `Test Card ${i}`,
    rarity: 'common',
    booster: true,
    colors: [['W', 'U', 'B', 'R', 'G'][i % 5]],
    cmc: i % 5 + 1
  });
}

const packs1 = generateAllDraftPacks(seed, mockSetData);
const packs2 = generateAllDraftPacks(seed, mockSetData);

console.log('Pack 1 first card:', packs1[0][0].cards[0].id);
console.log('Pack 2 first card:', packs2[0][0].cards[0].id);
console.log('Packs match:', packs1[0][0].cards[0].id === packs2[0][0].cards[0].id);

// Test full pack comparison
const pack1Cards = packs1[0][0].cards.map(c => c.id);
const pack2Cards = packs2[0][0].cards.map(c => c.id);
console.log('Full pack match:', JSON.stringify(pack1Cards) === JSON.stringify(pack2Cards));

if (JSON.stringify(pack1Cards) !== JSON.stringify(pack2Cards)) {
  console.log('Pack 1:', pack1Cards);
  console.log('Pack 2:', pack2Cards);
}