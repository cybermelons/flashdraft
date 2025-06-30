/**
 * Tests for SeededRandom class
 */

import { describe, test, expect } from 'vitest';
import { SeededRandom, generateSeed, isValidSeed } from './seededRandom';

describe('SeededRandom', () => {
  describe('Determinism', () => {
    test('same seed produces same sequence', () => {
      const seed = 'test123';
      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);
      
      // Generate 10 numbers from each
      const sequence1 = Array.from({ length: 10 }, () => rng1.next());
      const sequence2 = Array.from({ length: 10 }, () => rng2.next());
      
      expect(sequence1).toEqual(sequence2);
    });
    
    test('different seeds produce different sequences', () => {
      const rng1 = new SeededRandom('seed1');
      const rng2 = new SeededRandom('seed2');
      
      const sequence1 = Array.from({ length: 10 }, () => rng1.next());
      const sequence2 = Array.from({ length: 10 }, () => rng2.next());
      
      expect(sequence1).not.toEqual(sequence2);
    });
    
    test('reset returns to original sequence', () => {
      const rng = new SeededRandom('test123');
      
      const first = rng.next();
      const second = rng.next();
      
      rng.reset();
      const firstAgain = rng.next();
      const secondAgain = rng.next();
      
      expect(first).toBe(firstAgain);
      expect(second).toBe(secondAgain);
    });
  });
  
  describe('next()', () => {
    test('returns numbers between 0 and 1', () => {
      const rng = new SeededRandom('test123');
      
      for (let i = 0; i < 100; i++) {
        const num = rng.next();
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(1);
      }
    });
    
    test('produces different values in sequence', () => {
      const rng = new SeededRandom('test123');
      const values = new Set();
      
      // Generate 100 values - should be mostly unique
      for (let i = 0; i < 100; i++) {
        values.add(rng.next());
      }
      
      // Should have high uniqueness (>95%)
      expect(values.size).toBeGreaterThan(95);
    });
  });
  
  describe('nextInt()', () => {
    test('returns integers in specified range', () => {
      const rng = new SeededRandom('test123');
      
      for (let i = 0; i < 100; i++) {
        const num = rng.nextInt(5, 15);
        expect(num).toBeGreaterThanOrEqual(5);
        expect(num).toBeLessThan(15);
        expect(Number.isInteger(num)).toBe(true);
      }
    });
    
    test('throws on invalid range', () => {
      const rng = new SeededRandom('test123');
      expect(() => rng.nextInt(10, 5)).toThrow('min must be less than max');
      expect(() => rng.nextInt(5, 5)).toThrow('min must be less than max');
    });
  });
  
  describe('nextIntMax()', () => {
    test('returns integers from 0 to max-1', () => {
      const rng = new SeededRandom('test123');
      
      for (let i = 0; i < 100; i++) {
        const num = rng.nextIntMax(10);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(10);
        expect(Number.isInteger(num)).toBe(true);
      }
    });
  });
  
  describe('shuffle()', () => {
    test('shuffles array deterministically', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const rng1 = new SeededRandom('shuffle123');
      const rng2 = new SeededRandom('shuffle123');
      
      const shuffled1 = rng1.shuffle(array);
      const shuffled2 = rng2.shuffle(array);
      
      expect(shuffled1).toEqual(shuffled2);
    });
    
    test('does not modify original array', () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];
      
      const rng = new SeededRandom('test123');
      const shuffled = rng.shuffle(array);
      
      expect(array).toEqual(original);
      expect(shuffled).not.toBe(array);
    });
    
    test('contains all original elements', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const rng = new SeededRandom('test123');
      const shuffled = rng.shuffle(array);
      
      expect(shuffled.sort()).toEqual(array.sort());
      expect(shuffled.length).toBe(array.length);
    });
    
    test('actually shuffles (not always same order)', () => {
      const array = Array.from({ length: 20 }, (_, i) => i);
      const rng = new SeededRandom('test123');
      const shuffled = rng.shuffle(array);
      
      // Should not be in original order (very unlikely)
      expect(shuffled).not.toEqual(array);
    });
  });
  
  describe('choice()', () => {
    test('picks element from array', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];
      const rng = new SeededRandom('test123');
      
      for (let i = 0; i < 20; i++) {
        const choice = rng.choice(array);
        expect(array).toContain(choice);
      }
    });
    
    test('is deterministic', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];
      
      const rng1 = new SeededRandom('choice123');
      const rng2 = new SeededRandom('choice123');
      
      const choices1 = Array.from({ length: 10 }, () => rng1.choice(array));
      const choices2 = Array.from({ length: 10 }, () => rng2.choice(array));
      
      expect(choices1).toEqual(choices2);
    });
    
    test('throws on empty array', () => {
      const rng = new SeededRandom('test123');
      expect(() => rng.choice([])).toThrow('Cannot pick from empty array');
    });
  });
  
  describe('sample()', () => {
    test('picks specified number of elements', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const rng = new SeededRandom('test123');
      
      const sample = rng.sample(array, 5);
      expect(sample.length).toBe(5);
      
      // All elements should be from original array
      sample.forEach(item => {
        expect(array).toContain(item);
      });
      
      // Should be unique
      expect(new Set(sample).size).toBe(5);
    });
    
    test('returns empty array for count 0', () => {
      const array = [1, 2, 3, 4, 5];
      const rng = new SeededRandom('test123');
      const sample = rng.sample(array, 0);
      
      expect(sample).toEqual([]);
    });
    
    test('throws when count exceeds array length', () => {
      const array = [1, 2, 3];
      const rng = new SeededRandom('test123');
      
      expect(() => rng.sample(array, 5)).toThrow('Cannot sample more items than array length');
    });
    
    test('is deterministic', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const rng1 = new SeededRandom('sample123');
      const rng2 = new SeededRandom('sample123');
      
      const sample1 = rng1.sample(array, 5);
      const sample2 = rng2.sample(array, 5);
      
      expect(sample1).toEqual(sample2);
    });
  });
  
  describe('derive()', () => {
    test('creates different sequence from base seed', () => {
      const baseSeed = 'base123';
      const rng = new SeededRandom(baseSeed);
      const derived = rng.derive('bot1');
      
      const baseSequence = Array.from({ length: 10 }, () => rng.next());
      rng.reset();
      const derivedSequence = Array.from({ length: 10 }, () => derived.next());
      
      expect(baseSequence).not.toEqual(derivedSequence);
    });
    
    test('derived seeds are deterministic', () => {
      const baseSeed = 'base123';
      const rng1 = new SeededRandom(baseSeed);
      const rng2 = new SeededRandom(baseSeed);
      
      const derived1 = rng1.derive('bot1');
      const derived2 = rng2.derive('bot1');
      
      const sequence1 = Array.from({ length: 10 }, () => derived1.next());
      const sequence2 = Array.from({ length: 10 }, () => derived2.next());
      
      expect(sequence1).toEqual(sequence2);
    });
  });
  
  describe('getSeed()', () => {
    test('returns original seed string', () => {
      const seed = 'myseed123';
      const rng = new SeededRandom(seed);
      
      // Generate some numbers to advance state
      rng.next();
      rng.next();
      
      expect(rng.getSeed()).toBe(seed);
    });
  });
});

describe('generateSeed', () => {
  test('generates valid seed strings', () => {
    for (let i = 0; i < 10; i++) {
      const seed = generateSeed();
      expect(isValidSeed(seed)).toBe(true);
      expect(seed.length).toBe(12);
    }
  });
  
  test('generates different seeds each time', () => {
    const seeds = new Set();
    for (let i = 0; i < 100; i++) {
      seeds.add(generateSeed());
    }
    
    // Should be unique
    expect(seeds.size).toBe(100);
  });
});

describe('isValidSeed', () => {
  test('validates correct seed format', () => {
    expect(isValidSeed('abc12345')).toBe(true);
    expect(isValidSeed('test123456789')).toBe(true);
    expect(isValidSeed('abcdefghijklmnop')).toBe(true);
  });
  
  test('rejects invalid seed formats', () => {
    expect(isValidSeed('')).toBe(false);
    expect(isValidSeed('short')).toBe(false);
    expect(isValidSeed('UPPERCASE')).toBe(false);
    expect(isValidSeed('has-dash')).toBe(false);
    expect(isValidSeed('has_underscore')).toBe(false);
    expect(isValidSeed('has space')).toBe(false);
    expect(isValidSeed('toolongfortestingvalidation')).toBe(false);
  });
});

describe('Real-world pack simulation', () => {
  test('can generate consistent MTG packs', () => {
    // Simulate MTG pack with 15 cards: 1 rare, 3 uncommon, 11 common
    const seed = 'pack123';
    
    // Mock card pool
    const rares = Array.from({ length: 10 }, (_, i) => ({ id: `rare_${i}`, rarity: 'rare' }));
    const uncommons = Array.from({ length: 20 }, (_, i) => ({ id: `uncommon_${i}`, rarity: 'uncommon' }));
    const commons = Array.from({ length: 50 }, (_, i) => ({ id: `common_${i}`, rarity: 'common' }));
    
    function generatePack(rng: SeededRandom) {
      return [
        rng.choice(rares),
        ...rng.sample(uncommons, 3),
        ...rng.sample(commons, 11)
      ];
    }
    
    const rng1 = new SeededRandom(seed);
    const rng2 = new SeededRandom(seed);
    
    const pack1 = generatePack(rng1);
    const pack2 = generatePack(rng2);
    
    expect(pack1).toEqual(pack2);
    expect(pack1.length).toBe(15);
  });
});