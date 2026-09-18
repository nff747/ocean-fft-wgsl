/**
 * Beaufort Wind Force Scale & Empirical Sea State Classification.
 */

export interface BeaufortState {
  scale: number;
  description: string;
  minSpeedMs: number;
  maxSpeedMs: number;
  probableWaveHeightMeters: number;
}

export class BeaufortScale {
  public static readonly TABLE: BeaufortState[] = [
    { scale: 0, description: 'Calm', minSpeedMs: 0.0, maxSpeedMs: 0.2, probableWaveHeightMeters: 0.0 },
    { scale: 1, description: 'Light air', minSpeedMs: 0.3, maxSpeedMs: 1.5, probableWaveHeightMeters: 0.1 },
    { scale: 2, description: 'Light breeze', minSpeedMs: 1.6, maxSpeedMs: 3.3, probableWaveHeightMeters: 0.2 },
    { scale: 3, description: 'Gentle breeze', minSpeedMs: 3.4, maxSpeedMs: 5.4, probableWaveHeightMeters: 0.6 },
    { scale: 4, description: 'Moderate breeze', minSpeedMs: 5.5, maxSpeedMs: 7.9, probableWaveHeightMeters: 1.0 },
    { scale: 5, description: 'Fresh breeze', minSpeedMs: 8.0, maxSpeedMs: 10.7, probableWaveHeightMeters: 2.0 },
    { scale: 6, description: 'Strong breeze', minSpeedMs: 10.8, maxSpeedMs: 13.8, probableWaveHeightMeters: 3.0 },
    { scale: 7, description: 'Near gale', minSpeedMs: 13.9, maxSpeedMs: 17.1, probableWaveHeightMeters: 4.0 },
    { scale: 8, description: 'Gale', minSpeedMs: 17.2, maxSpeedMs: 20.7, probableWaveHeightMeters: 5.5 },
    { scale: 9, description: 'Strong gale', minSpeedMs: 20.8, maxSpeedMs: 24.4, probableWaveHeightMeters: 7.0 },
    { scale: 10, description: 'Storm', minSpeedMs: 24.5, maxSpeedMs: 28.4, probableWaveHeightMeters: 9.0 },
    { scale: 11, description: 'Violent storm', minSpeedMs: 28.5, maxSpeedMs: 32.6, probableWaveHeightMeters: 11.5 },
    { scale: 12, description: 'Hurricane force', minSpeedMs: 32.7, maxSpeedMs: Infinity, probableWaveHeightMeters: 14.0 },
  ];

  public static classify(speedMs: number): BeaufortState {
    for (const item of this.TABLE) {
      if (speedMs >= item.minSpeedMs && speedMs <= item.maxSpeedMs) {
        return item;
      }
    }
    return this.TABLE[this.TABLE.length - 1];
  }
}
