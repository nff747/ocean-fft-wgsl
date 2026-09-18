import { describe, it, expect } from 'vitest';
import {
  OceanSpectrum,
  FFT2D,
  OceanSimulator,
  CPUReferenceOcean,
  DEFAULT_OCEAN_CONFIG,
  oceanSpectrumShader,
  oceanFftShader,
  oceanNormalsShader,
} from '../src/index';

describe('Tessendorf Phillips Spectrum & Dispersion', () => {
  it('should evaluate non-negative Phillips spectrum with directional wind preference', () => {
    const kxAligned = 0.1 * DEFAULT_OCEAN_CONFIG.windDirection[0];
    const kzAligned = 0.1 * DEFAULT_OCEAN_CONFIG.windDirection[1];
    const energyAligned = OceanSpectrum.phillips(kxAligned, kzAligned, DEFAULT_OCEAN_CONFIG);

    expect(energyAligned).toBeGreaterThan(0.0);

    // Perpendicular wave vector should have significantly lower energy
    const kxPerp = -kzAligned;
    const kzPerp = kxAligned;
    const energyPerp = OceanSpectrum.phillips(kxPerp, kzPerp, DEFAULT_OCEAN_CONFIG);

    expect(energyAligned).toBeGreaterThan(energyPerp * 2.0);
  });

  it('should compute deep water gravity dispersion relation omega = sqrt(g * k)', () => {
    const kx = 0.3;
    const kz = 0.4;
    const k = Math.hypot(kx, kz); // 0.5
    const omega = OceanSpectrum.dispersion(kx, kz, 0.0);
    const expected = Math.sqrt(9.81 * 0.5);

    expect(omega).toBeCloseTo(expected, 4);
  });

  it('should generate valid initial complex spectrum with conjugates', () => {
    const config = { ...DEFAULT_OCEAN_CONFIG, gridSize: 32 };
    const spec = OceanSpectrum.generateInitialSpectrum(config);

    expect(spec.length).toBe(32 * 32);
    expect(Number.isFinite(spec[0].h0.r)).toBe(true);
    expect(Number.isFinite(spec[0].h0.i)).toBe(true);
  });
});

describe('Cooley-Tukey Radix-2 FFT & IFFT', () => {
  it('should correctly reverse bits for power-of-two sizes', () => {
    // For N = 8 (log2N = 3):
    // 001 (1) -> 100 (4)
    // 011 (3) -> 110 (6)
    expect(FFT2D.bitReverse(1, 3)).toBe(4);
    expect(FFT2D.bitReverse(3, 3)).toBe(6);
    expect(FFT2D.bitReverse(7, 3)).toBe(7);
  });

  it('should achieve roundtrip identity: IFFT(FFT(x)) == x for 1D signals', () => {
    const n = 16;
    const orig = new Float32Array(n);
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      orig[i] = Math.sin((i * 2.0 * Math.PI) / n) + 0.5 * Math.cos((i * 4.0 * Math.PI) / n);
      real[i] = orig[i];
      imag[i] = 0.0;
    }

    // Forward FFT
    FFT2D.transform1D(real, imag, false);
    // Inverse FFT
    FFT2D.transform1D(real, imag, true);

    for (let i = 0; i < n; i++) {
      expect(real[i]).toBeCloseTo(orig[i], 3);
      expect(imag[i]).toBeCloseTo(0.0, 3);
    }
  });

  it('should achieve roundtrip identity: IFFT(FFT(M)) == M for 2D grids', () => {
    const n = 8;
    const real = new Float32Array(n * n);
    const imag = new Float32Array(n * n);
    const expected = new Float32Array(n * n);

    for (let i = 0; i < n * n; i++) {
      expected[i] = Math.random();
      real[i] = expected[i];
      imag[i] = 0.0;
    }

    FFT2D.transform2D(real, imag, n, false);
    FFT2D.transform2D(real, imag, n, true);

    for (let i = 0; i < n * n; i++) {
      expect(real[i]).toBeCloseTo(expected[i], 3);
    }
  });
});

describe('CPUReferenceOcean Synthesis & OceanSimulator', () => {
  it('should synthesize wave height and horizontal displacements across time', () => {
    const config = { ...DEFAULT_OCEAN_CONFIG, gridSize: 32 };
    const sim = new OceanSimulator(null, config);

    const frame = CPUReferenceOcean.synthesizeFrame(sim.spectrum, config, 1.5);
    expect(frame.heights.length).toBe(32 * 32);
    expect(frame.displaceX.length).toBe(32 * 32);
    expect(frame.displaceZ.length).toBe(32 * 32);

    expect(frame.maxHeight).toBeGreaterThan(0.0);
    expect(frame.minHeight).toBeLessThan(0.0);
  });

  it('should correctly format uniform data and pack initial spectrum texture', () => {
    const sim = new OceanSimulator(null, { gridSize: 64, choppiness: 1.5 });
    const packedH0 = sim.packH0TextureBuffer();
    expect(packedH0.length).toBe(64 * 64 * 4);

    const uniforms = sim.buildSpectrumUniforms(2.0);
    const u32 = new Uint32Array(uniforms.buffer);
    expect(u32[0]).toBe(64);
    expect(uniforms[2]).toBe(2.0);
    expect(uniforms[3]).toBe(1.5);
  });
});

describe('WGSL Ocean Compute Shaders Integrity', () => {
  it('should contain expected compute entrypoints and shader symbols', () => {
    expect(oceanSpectrumShader).toContain('@compute');
    expect(oceanSpectrumShader).toContain('outHeightSpectrum');
    expect(oceanSpectrumShader).toContain('outDisplacementX');
    expect(oceanSpectrumShader).toContain('outDisplacementZ');

    expect(oceanFftShader).toContain('@compute');
    expect(oceanFftShader).toContain('twiddle');
    expect(oceanFftShader).toContain('halfStep');

    expect(oceanNormalsShader).toContain('@compute');
    expect(oceanNormalsShader).toContain('jacobian');
    expect(oceanNormalsShader).toContain('outNormalFoamTex');
  });
});
