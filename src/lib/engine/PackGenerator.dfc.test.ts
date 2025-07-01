import { describe, it, expect } from 'vitest';
import { PackGenerator } from './PackGenerator';
import { loadSetData } from '../setData';

describe('PackGenerator - Dual-Faced Card Handling', () => {
  it('should not include meld back faces in generated packs', () => {
    // Load Final Fantasy set data
    const setData = loadSetData('FIN');
    expect(setData).toBeTruthy();
    
    if (!setData) return;
    
    // Create pack generator
    const generator = new PackGenerator(setData, 'test-dfc-seed');
    
    // Generate multiple packs to increase chance of hitting meld cards
    const packs = generator.generatePacks(100, 'test-dfc');
    
    // Collect all card names from all packs
    const allCardNames = new Set<string>();
    const allCardIds = new Set<string>();
    for (const pack of packs) {
      for (const card of pack.cards) {
        allCardNames.add(card.name);
        allCardIds.add(card.id);
      }
    }
    
    // Known meld back face that should NOT appear
    const meldBackFaceName = 'Ragnarok, Divine Deliverance';
    
    // Check that no meld back faces appear
    expect(allCardNames.has(meldBackFaceName)).toBe(false);
    
    if (allCardNames.has(meldBackFaceName)) {
      console.error('Found meld back face in packs:', meldBackFaceName);
      // Check which IDs were included
      const ragnarokIds = ['01c5bafe-c995-4cef-90fb-7ccb95858511', '0f40e47b-32ed-4846-92b3-cc54e89368fe', 'cbcde2c1-e973-4ec0-b333-d71fa7452ef1', 'a951cc35-bd29-467f-b28c-5d57340e7450'];
      const foundIds = ragnarokIds.filter(id => allCardIds.has(id));
      console.error('Found these Ragnarok IDs:', foundIds);
    }
  });
  
  it('should include transform DFCs with double-slash names in packs', () => {
    const setData = loadSetData('FIN');
    expect(setData).toBeTruthy();
    
    if (!setData) return;
    
    const generator = new PackGenerator(setData, 'test-dfc-seed-2');
    const packs = generator.generatePacks(100, 'test-transform-cards');
    
    const allCardNames = new Set<string>();
    for (const pack of packs) {
      for (const card of pack.cards) {
        allCardNames.add(card.name);
      }
    }
    
    // Known transform DFCs that SHOULD be able to appear (with double-slash names)
    const transformDFCs = [
      'Crystal Fragments // Summon: Alexander',
      'Dion, Bahamut\'s Dominant // Bahamut, Warden of Light',
      'Sidequest: Catch a Fish // Cooking Campsite',
      'Venat, Heart of Hydaelyn // Hydaelyn, the Mothercrystal',
      'Jill, Shiva\'s Dominant // Shiva, Warden of Ice',
      'Sidequest: Card Collection // Magicked Card',
      'Cecil, Dark Knight // Cecil, Redeemed Paladin',
      'Jecht, Reluctant Guardian // Braska\'s Final Aeon',
      'Sephiroth, Fabled SOLDIER // Sephiroth, One-Winged Angel',
      'Clive, Ifrit\'s Dominant // Ifrit, Warden of Inferno',
      'Joshua, Phoenix\'s Dominant // Phoenix, Warden of Fire',
      'Kefka, Court Mage // Kefka, Ruler of Ruin',
      'Kuja, Genome Sorcerer // Trance Kuja, Fate Defied',
      'Serah Farron // Crystallized Serah',
      'Terra, Magical Adept // Esper Terra',
      'The Emperor of Palamecia // The Lord Master of Hell',
      'Ultimecia, Time Sorceress // Ultimecia, Omnipotent',
      'Vincent Valentine // Galian Beast',
      'Zenos yae Galvus // Shinryu, Transcendent Rival'
    ];
    
    // At least some transform DFCs should appear in 100 packs
    const foundDFCs = transformDFCs.filter(name => allCardNames.has(name));
    
    expect(foundDFCs.length).toBeGreaterThan(0);
    console.log(`Found ${foundDFCs.length} different transform DFCs in 100 packs`);
  });
  
  it('should filter out meld back faces from pack generation', () => {
    const setData = loadSetData('FIN');
    expect(setData).toBeTruthy();
    
    if (!setData) return;
    
    // Check how many Ragnarok cards are in the raw data
    const ragnarokCount = setData.cards.filter(c => c.name === 'Ragnarok, Divine Deliverance').length;
    console.log(`Raw data contains ${ragnarokCount} Ragnarok, Divine Deliverance cards`);
    
    // Create pack generator which should filter out meld back faces
    const generator = new PackGenerator(setData, 'test-meld-filter');
    
    // Get the filtered card groups
    const groups = (generator as any).groupCardsByRarity();
    
    // Count Ragnarok cards after filtering
    let filteredRagnarokCount = 0;
    for (const rarity of Object.values(groups)) {
      filteredRagnarokCount += (rarity as any[]).filter(c => c.name === 'Ragnarok, Divine Deliverance').length;
    }
    
    console.log(`After filtering: ${filteredRagnarokCount} Ragnarok cards remain`);
    
    // Should have filtered out all meld back faces
    expect(filteredRagnarokCount).toBe(0);
  });
  
  it('should properly handle transform DFC data in pack cards', () => {
    const setData = loadSetData('FIN');
    expect(setData).toBeTruthy();
    
    if (!setData) return;
    
    const generator = new PackGenerator(setData, 'test-dfc-data');
    const pack = generator.generatePack('test-pack-1');
    
    // Find any transform DFCs in the pack
    const transformCards = pack.cards.filter(card => card.layout === 'transform');
    
    if (transformCards.length > 0) {
      console.log(`Found ${transformCards.length} transform cards in pack`);
      
      for (const dfc of transformCards) {
        // Transform DFCs should have card_faces array
        expect(dfc.card_faces).toBeDefined();
        expect(dfc.card_faces?.length).toBe(2);
        
        // Should use double-slash name format
        expect(dfc.name).toContain('//');
        
        // Should have proper data
        if (dfc.card_faces) {
          const frontFace = dfc.card_faces[0];
          const backFace = dfc.card_faces[1];
          
          // Front face should have mana cost (unless it's a land)
          if (!dfc.type?.includes('Land')) {
            expect(frontFace.mana_cost || dfc.manaCost).toBeTruthy();
          }
          
          // Back face typically has no mana cost
          expect(backFace.mana_cost).toBeFalsy();
        }
      }
    }
    
    // Check that no meld back faces are in the pack
    const meldBackFaces = pack.cards.filter(card => 
      card.layout === 'meld' && card.collector_number?.endsWith('b')
    );
    
    expect(meldBackFaces.length).toBe(0);
  });
});