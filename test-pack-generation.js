/**
 * Test script to verify pack generation logic
 */

import { createPackGenerator } from './src/engine/generators/PackGenerator.js';

// Mock set data for testing
const mockSetData = {
  set_code: 'TEST',
  set_info: { code: 'TEST', name: 'Test Set' },
  cards: [
    // Commons (15 unique cards)
    { id: 'common-1', name: 'Common Card 1', rarity: 'common', booster: true, type_line: 'Creature', cmc: 1 },
    { id: 'common-2', name: 'Common Card 2', rarity: 'common', booster: true, type_line: 'Creature', cmc: 2 },
    { id: 'common-3', name: 'Common Card 3', rarity: 'common', booster: true, type_line: 'Creature', cmc: 3 },
    { id: 'common-4', name: 'Common Card 4', rarity: 'common', booster: true, type_line: 'Creature', cmc: 1 },
    { id: 'common-5', name: 'Common Card 5', rarity: 'common', booster: true, type_line: 'Creature', cmc: 2 },
    { id: 'common-6', name: 'Common Card 6', rarity: 'common', booster: true, type_line: 'Creature', cmc: 3 },
    { id: 'common-7', name: 'Common Card 7', rarity: 'common', booster: true, type_line: 'Creature', cmc: 1 },
    { id: 'common-8', name: 'Common Card 8', rarity: 'common', booster: true, type_line: 'Creature', cmc: 2 },
    { id: 'common-9', name: 'Common Card 9', rarity: 'common', booster: true, type_line: 'Creature', cmc: 3 },
    { id: 'common-10', name: 'Common Card 10', rarity: 'common', booster: true, type_line: 'Creature', cmc: 1 },
    { id: 'common-11', name: 'Common Card 11', rarity: 'common', booster: true, type_line: 'Creature', cmc: 2 },
    { id: 'common-12', name: 'Common Card 12', rarity: 'common', booster: true, type_line: 'Creature', cmc: 3 },
    { id: 'common-13', name: 'Common Card 13', rarity: 'common', booster: true, type_line: 'Creature', cmc: 1 },
    { id: 'common-14', name: 'Common Card 14', rarity: 'common', booster: true, type_line: 'Creature', cmc: 2 },
    { id: 'common-15', name: 'Common Card 15', rarity: 'common', booster: true, type_line: 'Creature', cmc: 3 },
    
    // Uncommons (5 unique cards)
    { id: 'uncommon-1', name: 'Uncommon Card 1', rarity: 'uncommon', booster: true, type_line: 'Creature', cmc: 3 },
    { id: 'uncommon-2', name: 'Uncommon Card 2', rarity: 'uncommon', booster: true, type_line: 'Creature', cmc: 4 },
    { id: 'uncommon-3', name: 'Uncommon Card 3', rarity: 'uncommon', booster: true, type_line: 'Creature', cmc: 3 },
    { id: 'uncommon-4', name: 'Uncommon Card 4', rarity: 'uncommon', booster: true, type_line: 'Creature', cmc: 4 },
    { id: 'uncommon-5', name: 'Uncommon Card 5', rarity: 'uncommon', booster: true, type_line: 'Creature', cmc: 3 },
    
    // Rares (3 unique cards)
    { id: 'rare-1', name: 'Rare Card 1', rarity: 'rare', booster: true, type_line: 'Creature', cmc: 5 },
    { id: 'rare-2', name: 'Rare Card 2', rarity: 'rare', booster: true, type_line: 'Creature', cmc: 6 },
    { id: 'rare-3', name: 'Rare Card 3', rarity: 'rare', booster: true, type_line: 'Creature', cmc: 5 },
  ]
};

function testPackGeneration() {
  console.log('Testing pack generation...');
  
  const generator = createPackGenerator('TEST');
  
  // Generate a single pack
  const pack1 = generator.generatePack(mockSetData, 1, 0);
  
  console.log(`Pack 1 generated with ${pack1.cards.length} cards:`);
  pack1.cards.forEach((card, index) => {
    console.log(`  ${index + 1}. ${card.name} (${card.id}) - ${card.rarity}`);
  });
  
  // Check for duplicates in pack 1
  const pack1Ids = pack1.cards.map(card => card.id);
  const pack1UniqueIds = new Set(pack1Ids);
  
  if (pack1Ids.length !== pack1UniqueIds.size) {
    console.error('❌ DUPLICATES FOUND IN PACK 1:');
    const duplicates = pack1Ids.filter((id, index) => pack1Ids.indexOf(id) !== index);
    duplicates.forEach(dupId => {
      const card = pack1.cards.find(c => c.id === dupId);
      console.error(`  Duplicate: ${card.name} (${dupId})`);
    });
  } else {
    console.log('✅ Pack 1 has no duplicates');
  }
  
  // Generate another pack to test independence
  const pack2 = generator.generatePack(mockSetData, 1, 1);
  
  console.log(`\nPack 2 generated with ${pack2.cards.length} cards:`);
  pack2.cards.forEach((card, index) => {
    console.log(`  ${index + 1}. ${card.name} (${card.id}) - ${card.rarity}`);
  });
  
  // Check for duplicates in pack 2
  const pack2Ids = pack2.cards.map(card => card.id);
  const pack2UniqueIds = new Set(pack2Ids);
  
  if (pack2Ids.length !== pack2UniqueIds.size) {
    console.error('❌ DUPLICATES FOUND IN PACK 2:');
    const duplicates = pack2Ids.filter((id, index) => pack2Ids.indexOf(id) !== index);
    duplicates.forEach(dupId => {
      const card = pack2.cards.find(c => c.id === dupId);
      console.error(`  Duplicate: ${card.name} (${dupId})`);
    });
  } else {
    console.log('✅ Pack 2 has no duplicates');
  }
}

testPackGeneration();