/**
 * Headless CPU Reference Ocean Wave Synthesizer.
 * Simulates time-domain ocean wave fields and extracts displacement / foam maps via 2D CPU IFFT.
 */

import { OceanConfig, SpectrumPoint } from '../types';
import { OceanSpectrum } from '../math/spectrum';
import { FFT2D } from '../math/fft';

export interface OceanFrame {
  heights: Float32Array;        // Y displacement
  displaceX: Float32Array;      // X horizontal displacement
  displaceZ: Float32Array;      // Z horizontal displacement
  maxHeight: number;
  minHeight: number;
}

export class CPUReferenceOcean {
  /**
   * Synthesizes full 3D ocean displacement grid at time t using 2D IFFT.
   */
  public static synthesizeFrame(
    spectrum: SpectrumPoint[],
    config: OceanConfig,
    time: number
  ): OceanFrame {
    const N = config.gridSize;
    const L = config.patchLength;

    const hReal = new Float32Array(N * N);
    const hImag = new Float32Array(N * N);
    const dxReal = new Float32Array(N * N);
    const dxImag = new Float32Array(N * N);
    const dzReal = new Float32Array(N * N);
    const dzImag = new Float32Array(N * N);

    // 1. Evaluate frequency domain amplitudes
    for (let m = 0; m < N; m++) {
      const kz = (2.0 * Math.PI * (m - N / 2)) / L;
      for (let n = 0; n < N; n++) {
        const kx = (2.0 * Math.PI * (n - N / 2)) / L;
        const idx = m * N + n;
        const pt = spectrum[idx];

        const omega = OceanSpectrum.dispersion(kx, kz, config.depth);
        const h = OceanSpectrum.evaluateHeightAtTime(pt, omega, time);

        hReal[idx] = h.r;
        hImag[idx] = h.i;

        const kLen = Math.hypot(kx, kz);
        if (kLen > 1e-6) {
          const kNormX = kx / kLen;
          const kNormZ = kz / kLen;

          // -i * (k / |k|) * h(k)
          dxReal[idx] = h.i * kNormX * config.choppiness;
          dxImag[idx] = -h.r * kNormX * config.choppiness;

          dzReal[idx] = h.i * kNormZ * config.choppiness;
          dzImag[idx] = -h.r * kNormZ * config.choppiness;
        }
      }
    }

    // 2. Perform 2D IFFT on height and horizontal displacements
    FFT2D.transform2D(hReal, hImag, N, true);
    FFT2D.transform2D(dxReal, dxImag, N, true);
    FFT2D.transform2D(dzReal, dzImag, N, true);

    // 3. Extract alternating spatial sign (-1)^(n+m) to shift origin to center
    let maxH = -Infinity;
    let minH = Infinity;

    for (let m = 0; m < N; m++) {
      for (let n = 0; n < N; n++) {
        const idx = m * N + n;
        const sign = (m + n) % 2 === 1 ? -1.0 : 1.0;

        hReal[idx] *= sign;
        dxReal[idx] *= sign;
        dzReal[idx] *= sign;

        if (hReal[idx] > maxH) maxH = hReal[idx];
        if (hReal[idx] < minH) minH = hReal[idx];
      }
    }

    return {
      heights: hReal,
      displaceX: dxReal,
      displaceZ: dzReal,
      maxHeight: maxH,
      minHeight: minH,
    };
  }
}
