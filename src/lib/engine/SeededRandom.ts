/**
 * Seeded Random Number Generator
 * 
 * Linear Congruential Generator (LCG) for deterministic randomization.
 * Ensures reproducible drafts from seed strings.
 */

export class SeededRandom {
  private seed: number;

  constructor(seedString: string) {
    // Convert string to 32-bit integer seed
    this.seed = this.hashString(seedString);
  }

  /**
   * Hash string to 32-bit integer using simple hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive seed
    return Math.abs(hash) || 1;
  }

  /**
   * Generate next random number using LCG
   * Uses parameters: a = 1664525, c = 1013904223, m = 2^32
   */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296; // Return 0-1 float
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Shuffle array in-place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    
    return result;
  }

  /**
   * Pick random element from array
   */
  choice<T>(array: T[]): T {
    const index = this.nextInt(0, array.length);
    return array[index];
  }

  /**
   * Sample n elements from array without replacement
   */
  sample<T>(array: T[], n: number): T[] {
    if (n >= array.length) return [...array];
    
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, n);
  }

  /**
   * Reset to original seed (for reproducibility testing)
   */
  reset(seedString: string): void {
    this.seed = this.hashString(seedString);
  }

  /**
   * Get current seed state (for debugging)
   */
  getCurrentSeed(): number {
    return this.seed;
  }
}