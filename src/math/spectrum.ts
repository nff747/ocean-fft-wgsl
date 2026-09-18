/**
 * Jerry Tessendorf (2001) Phillips Ocean Wave Spectrum Formulation.
 * Generates initial Fourier amplitudes, dispersion relations, and time-domain wave vectors.
 */

import { OceanConfig, Complex, SpectrumPoint } from '../types';

export class OceanSpectrum {
  public static readonly GRAVITY = 9.81; // m/s^2

  /**
   * Box-Muller transform generating standard normal random numbers N(0, 1).
   */
  public static gaussianRandom(): [number, number] {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2);
    const z1 = mag * Math.sin(2.0 * Math.PI * u2);
    return [z0, z1];
  }

  /**
   * Evaluates Phillips directional energy spectrum Ph(k) at wave vector k.
   */
  public static phillips(kx: number, kz: number, config: OceanConfig): number {
    const kLen = Math.hypot(kx, kz);
    if (kLen < 1e-6) return 0.0;

    const k2 = kLen * kLen;
    const k4 = k2 * k2;

    // Largest wave caused by wind speed V
    const L = (config.windSpeed * config.windSpeed) / this.GRAVITY;
    const l2 = config.smallWaveDamping * config.smallWaveDamping;

    // Directional alignment |k_hat . w_hat|^2
    const kDotW = (kx * config.windDirection[0] + kz * config.windDirection[1]) / kLen;
    const dirFactor = kDotW * kDotW;

    // Capillary wave damping factor exp(-k^2 * l^2)
    const damping = Math.exp(-k2 * l2);

    // Phillips formula
    const ph = config.amplitude * (Math.exp(-1.0 / (k2 * L * L)) / k4) * dirFactor * damping;

    // Suppress waves traveling against wind
    return kDotW < 0 ? ph * 0.1 : ph;
  }

  /**
   * Evaluates deep water / finite depth dispersion relation omega(k).
   */
  public static dispersion(kx: number, kz: number, depth: number = 0.0): number {
    const k = Math.hypot(kx, kz);
    if (depth > 0.0) {
      return Math.sqrt(this.GRAVITY * k * Math.tanh(k * depth));
    }
    return Math.sqrt(this.GRAVITY * k);
  }

  /**
   * Pre-computes initial Fourier height field h0(k) and its conjugate h0*(-k).
   */
  public static generateInitialSpectrum(config: OceanConfig): SpectrumPoint[] {
    const N = config.gridSize;
    const L = config.patchLength;
    const spectrum: SpectrumPoint[] = new Array(N * N);

    for (let m = 0; m < N; m++) {
      const kz = (2.0 * Math.PI * (m - N / 2)) / L;
      for (let n = 0; n < N; n++) {
        const kx = (2.0 * Math.PI * (n - N / 2)) / L;
        const idx = m * N + n;

        const ph = this.phillips(kx, kz, config);
        const phConj = this.phillips(-kx, -kz, config);

        const [r1, i1] = this.gaussianRandom();
        const [r2, i2] = this.gaussianRandom();

        const sqrtHalf = 1.0 / Math.sqrt(2.0);
        const h0: Complex = {
          r: sqrtHalf * r1 * Math.sqrt(ph),
          i: sqrtHalf * i1 * Math.sqrt(ph),
        };

        const h0Conj: Complex = {
          r: sqrtHalf * r2 * Math.sqrt(phConj),
          i: -sqrtHalf * i2 * Math.sqrt(phConj),
        };

        spectrum[idx] = { h0, h0Conj };
      }
    }

    return spectrum;
  }

  /**
   * Evaluates complex height amplitude h(k, t) at time t.
   */
  public static evaluateHeightAtTime(
    point: SpectrumPoint,
    omega: number,
    t: number
  ): Complex {
    const cosWt = Math.cos(omega * t);
    const sinWt = Math.sin(omega * t);

    // h0 * exp(i * omega * t)
    const h0TermR = point.h0.r * cosWt - point.h0.i * sinWt;
    const h0TermI = point.h0.r * sinWt + point.h0.i * cosWt;

    // h0Conj * exp(-i * omega * t)
    const h0ConjTermR = point.h0Conj.r * cosWt + point.h0Conj.i * sinWt;
    const h0ConjTermI = -point.h0Conj.r * sinWt + point.h0Conj.i * cosWt;

    return {
      r: h0TermR + h0ConjTermR,
      i: h0TermI + h0ConjTermI,
    };
  }
}
