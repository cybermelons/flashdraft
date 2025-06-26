#!/usr/bin/env node

/**
 * Test script for pack generation system
 */

import { readFile } from 'fs/promises';
import path from 'path';

// Simple pack generation test without full TypeScript
async function testPackGeneration() {
  console.log('Testing FlashDraft pack generation...\n');
  
  try {
    // Load FIN set data
    const finPath = path.join(process.cwd(), 'data/raw/cards/fin_cards.json');
    const finData = JSON.parse(await readFile(finPath, 'utf-8'));
    
    console.log('✅ Final Fantasy (FIN) set loaded');
    console.log(`   Total cards: ${finData.total_cards}`);
    
    // Simple pack generation simulation
    const draftableCards = finData.cards.filter(card => card.booster);
    console.log(`   Draftable cards: ${draftableCards.length}`);
    
    // Group by rarity
    const rarityGroups = {
      common: [],
      uncommon: [],
      rare: [],
      mythic: [],
      special: [],
      bonus: []
    };
    
    draftableCards.forEach(card => {
      if (rarityGroups[card.rarity]) {
        rarityGroups[card.rarity].push(card);
      }
    });
    
    console.log('\n   Rarity distribution in draftable cards:');
    Object.entries(rarityGroups).forEach(([rarity, cards]) => {
      if (cards.length > 0) {
        console.log(`     ${rarity}: ${cards.length} cards`);
      }
    });
    
    // Generate sample pack
    console.log('\n📦 Generating sample pack...');
    const pack = [];
    
    // Add 1 rare/mythic (1/8 chance for mythic)
    const rarePool = Math.random() < 0.125 ? rarityGroups.mythic : rarityGroups.rare;
    if (rarePool.length > 0) {
      pack.push(rarePool[Math.floor(Math.random() * rarePool.length)]);
    }
    
    // Add 3 uncommons
    for (let i = 0; i < 3 && rarityGroups.uncommon.length > 0; i++) {
      const card = rarityGroups.uncommon[Math.floor(Math.random() * rarityGroups.uncommon.length)];
      if (!pack.find(c => c.id === card.id)) {
        pack.push(card);
      }
    }
    
    // Add 11 commons
    for (let i = 0; i < 11 && rarityGroups.common.length > 0; i++) {
      const card = rarityGroups.common[Math.floor(Math.random() * rarityGroups.common.length)];
      if (!pack.find(c => c.id === card.id)) {
        pack.push(card);
      }
    }
    
    console.log(`   Generated pack with ${pack.length} cards:`);
    
    const packRarities = {};
    pack.forEach(card => {
      packRarities[card.rarity] = (packRarities[card.rarity] || 0) + 1;
      console.log(`     ${card.name} (${card.rarity}) - ${card.mana_cost || 'No cost'}`);
    });
    
    console.log('\n   Pack rarity breakdown:');
    Object.entries(packRarities).forEach(([rarity, count]) => {
      console.log(`     ${rarity}: ${count} cards`);
    });
    
    // Test multiple packs for consistency
    console.log('\n🎲 Testing pack consistency (10 packs)...');
    const allPackRarities = { common: [], uncommon: [], rare: [], mythic: [] };
    
    for (let packNum = 0; packNum < 10; packNum++) {
      const testPack = [];
      
      // Same logic as above
      const testRarePool = Math.random() < 0.125 ? rarityGroups.mythic : rarityGroups.rare;
      if (testRarePool.length > 0) {
        testPack.push(testRarePool[Math.floor(Math.random() * testRarePool.length)]);
      }
      
      for (let i = 0; i < 3 && rarityGroups.uncommon.length > 0; i++) {
        const card = rarityGroups.uncommon[Math.floor(Math.random() * rarityGroups.uncommon.length)];
        if (!testPack.find(c => c.id === card.id)) {
          testPack.push(card);
        }
      }
      
      for (let i = 0; i < 11 && rarityGroups.common.length > 0; i++) {
        const card = rarityGroups.common[Math.floor(Math.random() * rarityGroups.common.length)];
        if (!testPack.find(c => c.id === card.id)) {
          testPack.push(card);
        }
      }
      
      // Count rarities
      const packCounts = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
      testPack.forEach(card => {
        if (packCounts[card.rarity] !== undefined) {
          packCounts[card.rarity]++;
        }
      });
      
      Object.entries(packCounts).forEach(([rarity, count]) => {
        allPackRarities[rarity].push(count);
      });
    }
    
    console.log('   Average cards per rarity across 10 packs:');
    Object.entries(allPackRarities).forEach(([rarity, counts]) => {
      if (counts.length > 0) {
        const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        console.log(`     ${rarity}: ${avg.toFixed(1)} cards (range: ${Math.min(...counts)}-${Math.max(...counts)})`);
      }
    });
    
    console.log('\n🎉 Pack generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing pack generation:', error.message);
    process.exit(1);
  }
}

testPackGeneration();