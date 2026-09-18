import { describe, it, expect } from 'vitest';
import { BeaufortScale } from '../src/utils/beaufort';

describe('Beaufort Wind Force Scale Classification', () => {
  it('should correctly classify light breeze, fresh breeze, and storm wind speeds', () => {
    expect(BeaufortScale.classify(2.5).scale).toBe(2);
    expect(BeaufortScale.classify(10.0).scale).toBe(5);
    expect(BeaufortScale.classify(15.0).scale).toBe(7);
    expect(BeaufortScale.classify(26.0).scale).toBe(10);
  });

  it('should provide probable wave height estimates matching oceanographic empirical tables', () => {
    const gale = BeaufortScale.classify(18.0);
    expect(gale.scale).toBe(8);
    expect(gale.probableWaveHeightMeters).toBeGreaterThanOrEqual(5.0);
  });
});
