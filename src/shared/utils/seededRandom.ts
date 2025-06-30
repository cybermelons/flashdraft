/**
 * Seeded Random Number Generator
 * 
 * Uses Linear Congruential Generator (LCG) for deterministic randomness.
 * Same seed always produces the same sequence of random numbers.
 */

export class SeededRandom {
  private seed: number;
  private originalSeed: string;
  
  constructor(seedString: string) {
    this.originalSeed = seedString;
    // Convert string seed to number using simple hash
    this.seed = this.hashSeed(seedString);
  }
  
  /**
   * Convert string seed to number using a simple hash function
   */
  private hashSeed(seedString: string): number {
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive number
    return Math.abs(hash) || 1;
  }
  
  /**
   * Generate next random number between 0 (inclusive) and 1 (exclusive)
   * Uses LCG algorithm: next = (a * seed + c) mod m
   */
  next(): number {
    // LCG parameters (from Numerical Recipes)
    const a = 1664525;
    const c = 1013904223;
    const m = 2147483647; // 2^31 - 1
    
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }
  
  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    if (min >= max) {
      throw new Error('min must be less than max');
    }
    return Math.floor(this.next() * (max - min)) + min;
  }
  
  /**
   * Generate random integer between 0 (inclusive) and max (exclusive)
   */
  nextIntMax(max: number): number {
    return this.nextInt(0, max);
  }
  
  /**
   * Shuffle array using Fisher-Yates algorithm with seeded randomness
   * Returns a new shuffled array, does not modify original
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextIntMax(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    
    return result;
  }
  
  /**
   * Pick a random element from array
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const index = this.nextIntMax(array.length);
    return array[index];
  }
  
  /**
   * Pick multiple random elements from array without replacement
   */
  sample<T>(array: T[], count: number): T[] {
    if (count > array.length) {
      throw new Error('Cannot sample more items than array length');
    }
    if (count <= 0) {
      return [];
    }
    
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }
  
  /**
   * Get original seed string
   */
  getSeed(): string {
    return this.originalSeed;
  }
  
  /**
   * Create a new SeededRandom with a derived seed for isolated randomness
   * Useful for bot decisions that need their own sequence
   */
  derive(suffix: string): SeededRandom {
    return new SeededRandom(`${this.originalSeed}_${suffix}`);
  }
  
  /**
   * Reset to original seed state
   */
  reset(): void {
    this.seed = this.hashSeed(this.originalSeed);
  }
}

/**
 * Generate a random seed string
 */
export function generateSeed(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Validate that a seed string is valid
 */
export function isValidSeed(seed: string): boolean {
  // Must be non-empty and contain only alphanumeric characters
  return /^[a-z0-9]{8,16}$/.test(seed);
}