import { describe, it, expect } from 'vitest';
import {
  OceanSpectrum,
  FFT2D,
  OceanSimulator,
  CPUReferenceOcean,
  ThreeOceanMesh,
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

describe('JONSWAP Spectral Enhancement', () => {
  it('should peak sharply at omega == omegaP and approach 1.0 away from resonance', () => {
    const omegaP = 1.2;
    const gamma = 3.3;

    // At peak: exp(0) = 1, so multiplier is gamma
    const atPeak = OceanSpectrum.jonswapMultiplier(omegaP, omegaP, gamma);
    expect(atPeak).toBeCloseTo(gamma, 4);

    // Far above peak: multiplier should decay toward 1.0
    const farAbove = OceanSpectrum.jonswapMultiplier(5.0, omegaP, gamma);
    expect(farAbove).toBeCloseTo(1.0, 1);
    expect(farAbove).toBeLessThan(atPeak);
  });
});

describe('Butterfly Stage Twiddle Factors', () => {
  it('should generate exact pairs and unit twiddle factors for stages', () => {
    const n = 8;
    // Stage 0: step = 1, len = 2. Twiddle factor angles: j=0 -> angle 0 -> (1, 0)
    const stage0 = FFT2D.computeButterflyStage(0, n);
    expect(stage0.length).toBe(4);
    for (const tw of stage0) {
      expect(tw.twiddleR).toBeCloseTo(1.0, 5);
      expect(tw.twiddleI).toBeCloseTo(0.0, 5);
      expect(tw.indexB - tw.indexA).toBe(1);
    }

    // Stage 1: step = 2, len = 4. Twiddles for j=0 (1,0) and j=1 (cos(-pi/2) = 0, sin(-pi/2) = -1)
    const stage1 = FFT2D.computeButterflyStage(1, n);
    expect(stage1.length).toBe(4);
    expect(stage1[0].twiddleR).toBeCloseTo(1.0, 5);
    expect(stage1[1].twiddleR).toBeCloseTo(0.0, 5);
    expect(stage1[1].twiddleI).toBeCloseTo(-1.0, 5);
  });
});

describe('Jacobian Foam Synthesis', () => {
  it('should compute valid bounded foam map values across synthesized ocean frame', () => {
    const config = { ...DEFAULT_OCEAN_CONFIG, gridSize: 32, choppiness: 1.2 };
    const spec = OceanSpectrum.generateInitialSpectrum(config);
    const frame = CPUReferenceOcean.synthesizeFrame(spec, config, 2.5);

    expect(frame.foam).toBeDefined();
    expect(frame.foam!.length).toBe(32 * 32);

    for (let i = 0; i < frame.foam!.length; i++) {
      const val = frame.foam![i];
      expect(val).toBeGreaterThanOrEqual(0.0);
      expect(val).toBeLessThanOrEqual(1.0);
    }
  });
});

describe('ThreeOceanMesh Material Packing', () => {
  it('should generate shader definition and pack 32-byte material uniforms', () => {
    const mesh = new ThreeOceanMesh({ patchLength: 512, choppiness: 1.8 }, 128);
    const def = mesh.getShaderDefinition();
    expect(def.vertexShader).toContain('displacementMap');
    expect(def.fragmentShader).toContain('normalFoamMap');
    expect(def.uniforms.patchLength.value).toBe(512);

    const packed = mesh.packMaterialUniforms();
    expect(packed.length).toBe(8);
    expect(packed.byteLength).toBe(32);
    expect(packed[0]).toBe(512);
    expect(packed[1]).toBeCloseTo(1.8, 5);
    expect(packed[2]).toBe(128);
    expect(packed[3]).toBeCloseTo(0.02, 5);
  });
});
