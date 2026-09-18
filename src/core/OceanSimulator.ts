/**
 * WebGPU Ocean Wave Simulator Coordinator.
 * Orchestrates Phillips spectrum initialization, IFFT compute dispatches, and normal/foam extraction.
 */

import { OceanConfig, DEFAULT_OCEAN_CONFIG, SpectrumPoint } from '../types';
import { OceanSpectrum } from '../math/spectrum';

export class OceanSimulator {
  public device: GPUDevice | null;
  public config: OceanConfig;
  public spectrum: SpectrumPoint[];

  constructor(device: GPUDevice | null = null, config?: Partial<OceanConfig>) {
    this.device = device;
    this.config = { ...DEFAULT_OCEAN_CONFIG, ...config };
    this.spectrum = OceanSpectrum.generateInitialSpectrum(this.config);
  }

  /**
   * Regenerates initial Phillips Fourier spectrum when wind speed, direction, or amplitude change.
   */
  public updateSpectrum(newConfig?: Partial<OceanConfig>): void {
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
    this.spectrum = OceanSpectrum.generateInitialSpectrum(this.config);
  }

  /**
   * Packs initial spectrum points into an RGBA Float32Array suitable for GPU texture uploading.
   */
  public packH0TextureBuffer(): Float32Array {
    const N = this.config.gridSize;
    const buffer = new Float32Array(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      const pt = this.spectrum[i];
      buffer[i * 4 + 0] = pt.h0.r;
      buffer[i * 4 + 1] = pt.h0.i;
      buffer[i * 4 + 2] = pt.h0Conj.r;
      buffer[i * 4 + 3] = pt.h0Conj.i;
    }
    return buffer;
  }

  /**
   * Generates uniform data buffer for spectrum evaluation compute shader.
   */
  public buildSpectrumUniforms(time: number): Float32Array {
    const buffer = new Float32Array(4);
    const u32View = new Uint32Array(buffer.buffer);
    u32View[0] = this.config.gridSize;
    buffer[1] = this.config.patchLength;
    buffer[2] = time;
    buffer[3] = this.config.choppiness;
    return buffer;
  }

  /**
   * Generates uniform data buffer for FFT butterfly passes.
   */
  public buildFftUniforms(stage: number, direction: 0 | 1): Uint32Array {
    const buffer = new Uint32Array(4);
    buffer[0] = stage;
    buffer[1] = direction;
    buffer[2] = this.config.gridSize;
    buffer[3] = 0; // padding
    return buffer;
  }

  /**
   * Generates uniform data buffer for normal and foam generation compute pass.
   */
  public buildNormalUniforms(foamThreshold: number = 0.8): Float32Array {
    const buffer = new Float32Array(4);
    const u32View = new Uint32Array(buffer.buffer);
    u32View[0] = this.config.gridSize;
    buffer[1] = this.config.patchLength;
    buffer[2] = this.config.choppiness;
    buffer[3] = foamThreshold;
    return buffer;
  }
}
