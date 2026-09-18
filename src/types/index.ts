/**
 * Phillips Spectrum & Tessendorf Ocean Wave Simulation Types.
 */

export interface Complex {
  r: number;
  i: number;
}

export interface OceanConfig {
  gridSize: number;       // Dimension N (power of 2: 128, 256, 512)
  patchLength: number;    // Physical domain size L in meters (e.g. 200.0)
  windSpeed: number;      // Wind speed V in m/s (e.g. 12.0)
  windDirection: [number, number]; // Normalized 2D wind direction vector (wx, wz)
  amplitude: number;      // Phillips spectrum scaling factor A (e.g. 0.0005)
  choppiness: number;     // Horizontal displacement factor lambda (e.g. 1.2)
  depth: number;          // Ocean depth in meters (0 = deep ocean gravity waves)
  smallWaveDamping: number; // Small capillary wave suppression factor l (e.g. 0.001)
}

export interface SpectrumPoint {
  h0: Complex;            // Initial Fourier amplitude h0(k)
  h0Conj: Complex;        // Complex conjugate h0*(-k)
}

export interface OceanTelemetry {
  fps: number;
  computeTimeMs: number;
  maxWaveHeight: number;
  gridSize: number;
  totalVertices: number;
}

export const DEFAULT_OCEAN_CONFIG: OceanConfig = {
  gridSize: 256,
  patchLength: 250.0,
  windSpeed: 14.0,
  windDirection: [0.8, 0.6],
  amplitude: 0.00045,
  choppiness: 1.25,
  depth: 0.0,
  smallWaveDamping: 0.001,
};
