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

  it('should generate valid simulation presets for calm, gale, and storm states', () => {
    const calmPreset = BeaufortScale.getSimulationPreset(0);
    expect(calmPreset.amplitude).toBeCloseTo(0.0001, 4);
    expect(calmPreset.choppiness).toBeCloseTo(0.5, 2);

    const galePreset = BeaufortScale.getSimulationPreset(8);
    expect(galePreset.amplitude).toBeCloseTo(2.75, 2);
    expect(galePreset.choppiness).toBeCloseTo(1.3, 2);
    expect(galePreset.windSpeed).toBeGreaterThan(17.0);
  });
