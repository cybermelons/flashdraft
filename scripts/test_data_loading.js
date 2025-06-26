#!/usr/bin/env node

/**
 * Test script for data loading utilities
 */

import { readFile } from 'fs/promises';
import path from 'path';

// Simple validation without full TypeScript
async function testDataLoading() {
  console.log('Testing FlashDraft data loading...\n');
  
  try {
    // Test loading FIN set data
    const finPath = path.join(process.cwd(), 'data/raw/cards/fin_cards.json');
    const finData = JSON.parse(await readFile(finPath, 'utf-8'));
    
    console.log('✅ Final Fantasy (FIN) set loaded successfully');
    console.log(`   Cards: ${finData.total_cards}`);
    console.log(`   Set: ${finData.set_info.name}`);
    console.log(`   Type: ${finData.set_info.set_type}`);
    
    // Test a sample card
    const sampleCard = finData.cards[0];
    console.log(`   Sample card: ${sampleCard.name} (${sampleCard.rarity})`);
    console.log(`   Mana cost: ${sampleCard.mana_cost || 'N/A'}`);
    console.log(`   CMC: ${sampleCard.cmc}`);
    
    // Test rarity distribution
    const rarities = {};
    finData.cards.forEach(card => {
      rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
    });
    
    console.log('\n   Rarity distribution:');
    Object.entries(rarities).forEach(([rarity, count]) => {
      console.log(`     ${rarity}: ${count} cards`);
    });
    
    // Test DTK set if available
    try {
      const dtkPath = path.join(process.cwd(), 'data/raw/cards/dtk_cards.json');
      const dtkData = JSON.parse(await readFile(dtkPath, 'utf-8'));
      
      console.log('\n✅ Dragons of Tarkir (DTK) set loaded successfully');
      console.log(`   Cards: ${dtkData.total_cards}`);
      console.log(`   Set: ${dtkData.set_info.name}`);
      
    } catch (error) {
      console.log('\n⚠️  Dragons of Tarkir (DTK) set not found');
    }
    
    console.log('\n🎉 Data loading test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing data loading:', error.message);
    process.exit(1);
  }
}

testDataLoading();