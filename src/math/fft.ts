/**
 * Cooley-Tukey Radix-2 Fast Fourier Transform (FFT & IFFT).
 * Provides 1D and 2D Discrete Fourier Transforms with bit-reversal permutations.
 */

import { Complex } from '../types';

export class FFT2D {
  /**
   * Reverses bit order of an integer up to log2(N) bits.
   */
  public static bitReverse(x: number, log2N: number): number {
    let n = 0;
    for (let i = 0; i < log2N; i++) {
      n = (n << 1) | (x & 1);
      x >>= 1;
    }
    return n;
  }

  /**
   * 1D in-place Cooley-Tukey Radix-2 FFT / IFFT.
   *
   * @param real Real components array of length N (N must be power of 2).
   * @param imag Imaginary components array of length N.
   * @param inverse If true, computes IFFT (exponential with + sign).
   */
  public static transform1D(real: Float32Array, imag: Float32Array, inverse: boolean = false): void {
    const n = real.length;
    const log2n = Math.round(Math.log2(n));

    // Bit-reversal permutation
    for (let i = 0; i < n; i++) {
      const rev = this.bitReverse(i, log2n);
      if (i < rev) {
        const tr = real[i]; real[i] = real[rev]; real[rev] = tr;
        const ti = imag[i]; imag[i] = imag[rev]; imag[rev] = ti;
      }
    }

    // Butterfly passes
    const sign = inverse ? 1.0 : -1.0;
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const angle = (sign * 2.0 * Math.PI) / len;
      const wStepR = Math.cos(angle);
      const wStepI = Math.sin(angle);

      for (let i = 0; i < n; i += len) {
        let wR = 1.0;
        let wI = 0.0;
        for (let j = 0; j < halfLen; j++) {
          const uR = real[i + j];
          const uI = imag[i + j];
          const vR = real[i + j + halfLen] * wR - imag[i + j + halfLen] * wI;
          const vI = real[i + j + halfLen] * wI + imag[i + j + halfLen] * wR;

          real[i + j] = uR + vR;
          imag[i + j] = uI + vI;
          real[i + j + halfLen] = uR - vR;
          imag[i + j + halfLen] = uI - vI;

          const nextWR = wR * wStepR - wI * wStepI;
          const nextWI = wR * wStepI + wI * wStepR;
          wR = nextWR;
          wI = nextWI;
        }
      }
    }

    // Normalization for inverse transform
    if (inverse) {
      for (let i = 0; i < n; i++) {
        real[i] /= n;
        imag[i] /= n;
      }
    }
  }

  /**
   * 2D Cooley-Tukey Radix-2 FFT / IFFT on N x N grid.
   */
  public static transform2D(
    real: Float32Array,
    imag: Float32Array,
    n: number,
    inverse: boolean = false
  ): void {
    const rowR = new Float32Array(n);
    const rowI = new Float32Array(n);
    const colR = new Float32Array(n);
    const colI = new Float32Array(n);

    // 1. Transform all rows
    for (let y = 0; y < n; y++) {
      const rowOffset = y * n;
      for (let x = 0; x < n; x++) {
        rowR[x] = real[rowOffset + x];
        rowI[x] = imag[rowOffset + x];
      }
      this.transform1D(rowR, rowI, inverse);
      for (let x = 0; x < n; x++) {
        real[rowOffset + x] = rowR[x];
        imag[rowOffset + x] = rowI[x];
      }
    }

    // 2. Transform all columns
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        colR[y] = real[y * n + x];
        colI[y] = imag[y * n + x];
      }
      this.transform1D(colR, colI, inverse);
      for (let y = 0; y < n; y++) {
        real[y * n + x] = colR[y];
        imag[y * n + x] = colI[y];
      }
    }
  }
}
