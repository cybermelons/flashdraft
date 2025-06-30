/**
 * Test script to verify draft determinism
 * Run with: node test_draft_determinism.js
 */

import { DraftService } from './src/services/DraftService.js';

async function testDraftDeterminism() {
  console.log('Testing draft determinism...');
  
  const service = new DraftService();
  
  // Create draft twice with same conditions
  console.log('\n=== Creating first draft ===');
  const draft1 = await service.createDraft('FFX');
  const started1 = await service.startDraft(draft1.seed);
  
  // Simulate some picks
  console.log('\n=== Making picks in first draft ===');
  const humanPlayer1 = started1.players.find(p => p.isHuman);
  const firstCard1 = humanPlayer1.currentPack.cards[0].id;
  console.log(`First pick: ${firstCard1}`);
  
  const afterPick1 = await service.makeHumanPick(started1, firstCard1);
  
  // Now create second draft with SAME SEED
  console.log('\n=== Creating second draft with SAME SEED ===');
  const draft2 = await service.createDraft('FFX');
  // Override seed to match first draft
  draft2.seed = draft1.seed;
  
  const started2 = await service.startDraft(draft2.seed);
  
  console.log('\n=== Comparing initial state ===');
  const humanPlayer2 = started2.players.find(p => p.isHuman);
  const firstCard2 = humanPlayer2.currentPack.cards[0].id;
  console.log(`First pick: ${firstCard2}`);
  
  console.log(`\nCards match: ${firstCard1 === firstCard2}`);
  
  if (firstCard1 === firstCard2) {
    console.log('✅ Basic determinism works');
    
    // Test replay determinism
    console.log('\n=== Testing replay determinism ===');
    const replayed = await service.navigateToPosition(draft1.seed, 1, 2);
    const humanPlayerReplayed = replayed.players.find(p => p.isHuman);
    const secondCard = humanPlayerReplayed.currentPack.cards[0].id;
    
    console.log(`After pick 1, next card available: ${secondCard}`);
    
  } else {
    console.log('❌ Basic determinism FAILED');
    console.log('First draft pack:', humanPlayer1.currentPack.cards.map(c => c.id));
    console.log('Second draft pack:', humanPlayer2.currentPack.cards.map(c => c.id));
  }
}

testDraftDeterminism().catch(console.error);