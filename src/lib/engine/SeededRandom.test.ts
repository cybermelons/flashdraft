/**
 * Seeded Random Tests - Verify deterministic randomization
 */

import { describe, it, expect } from 'vitest';
import { SeededRandom } from './SeededRandom';

describe('SeededRandom', () => {
  describe('Determinism', () => {
    it('should produce same sequence with same seed', () => {
      const rng1 = new SeededRandom('test-seed');
      const rng2 = new SeededRandom('test-seed');

      const sequence1 = Array.from({ length: 10 }, () => rng1.next());
      const sequence2 = Array.from({ length: 10 }, () => rng2.next());

      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRandom('seed-1');
      const rng2 = new SeededRandom('seed-2');

      const sequence1 = Array.from({ length: 10 }, () => rng1.next());
      const sequence2 = Array.from({ length: 10 }, () => rng2.next());

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should reset to produce same sequence', () => {
      const rng = new SeededRandom('test-seed');
      
      const sequence1 = Array.from({ length: 5 }, () => rng.next());
      
      rng.reset('test-seed');
      const sequence2 = Array.from({ length: 5 }, () => rng.next());

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe('next()', () => {
    it('should return values between 0 and 1', () => {
      const rng = new SeededRandom('test');
      
      for (let i = 0; i < 100; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should have good distribution', () => {
      const rng = new SeededRandom('distribution-test');
      const buckets = [0, 0, 0, 0]; // 0-0.25, 0.25-0.5, 0.5-0.75, 0.75-1
      
      for (let i = 0; i < 10000; i++) {
        const value = rng.next();
        const bucket = Math.floor(value * 4);
        buckets[bucket]++;
      }
      
      // Each bucket should have roughly 25% (±5%)
      buckets.forEach(count => {
        expect(count).toBeGreaterThan(2000);
        expect(count).toBeLessThan(3000);
      });
    });
  });

  describe('nextInt()', () => {
    it('should return integers in range', () => {
      const rng = new SeededRandom('int-test');
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(5, 10);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThan(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should handle single value range', () => {
      const rng = new SeededRandom('single-test');
      const value = rng.nextInt(5, 6);
      expect(value).toBe(5);
    });
  });

  describe('shuffle()', () => {
    it('should shuffle deterministically', () => {
      const rng1 = new SeededRandom('shuffle-test');
      const rng2 = new SeededRandom('shuffle-test');
      
      const array1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const shuffled1 = rng1.shuffle(array1);
      const shuffled2 = rng2.shuffle(array2);
      
      expect(shuffled1).toEqual(shuffled2);
      expect(shuffled1).not.toEqual(array1); // Should be shuffled
    });

    it('should not modify original array', () => {
      const rng = new SeededRandom('immutable-test');
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(original);
      
      expect(original).toEqual([1, 2, 3, 4, 5]);
      expect(shuffled).not.toBe(original);
    });

    it('should maintain all elements', () => {
      const rng = new SeededRandom('elements-test');
      const array = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(array);
      
      expect(shuffled.sort()).toEqual(array.sort());
    });
  });

  describe('choice()', () => {
    it('should pick element from array', () => {
      const rng = new SeededRandom('choice-test');
      const array = ['a', 'b', 'c', 'd', 'e'];
      
      for (let i = 0; i < 20; i++) {
        const chosen = rng.choice(array);
        expect(array).toContain(chosen);
      }
    });

    it('should pick deterministically', () => {
      const rng1 = new SeededRandom('choice-deterministic');
      const rng2 = new SeededRandom('choice-deterministic');
      const array = ['a', 'b', 'c', 'd', 'e'];
      
      const choices1 = Array.from({ length: 10 }, () => rng1.choice(array));
      const choices2 = Array.from({ length: 10 }, () => rng2.choice(array));
      
      expect(choices1).toEqual(choices2);
    });
  });

  describe('sample()', () => {
    it('should sample without replacement', () => {
      const rng = new SeededRandom('sample-test');
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sampled = rng.sample(array, 5);
      
      expect(sampled).toHaveLength(5);
      expect(new Set(sampled).size).toBe(5); // All unique
      sampled.forEach(item => {
        expect(array).toContain(item);
      });
    });

    it('should return all elements if n >= array length', () => {
      const rng = new SeededRandom('sample-all');
      const array = [1, 2, 3, 4, 5];
      const sampled = rng.sample(array, 10);
      
      expect(sampled.sort()).toEqual(array.sort());
    });

    it('should sample deterministically', () => {
      const rng1 = new SeededRandom('sample-deterministic');
      const rng2 = new SeededRandom('sample-deterministic');
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const sample1 = rng1.sample(array, 5);
      const sample2 = rng2.sample(array, 5);
      
      expect(sample1).toEqual(sample2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty seed string', () => {
      const rng = new SeededRandom('');
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });

    it('should handle very long seeds', () => {
      const longSeed = 'a'.repeat(1000);
      const rng = new SeededRandom(longSeed);
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });

    it('should handle unicode seeds', () => {
      const rng1 = new SeededRandom('🎲🃏🎯');
      const rng2 = new SeededRandom('🎲🃏🎯');
      
      const value1 = rng1.next();
      const value2 = rng2.next();
      
      expect(value1).toBe(value2);
    });
  });
});