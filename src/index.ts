/**
 * Ocean FFT WGSL
 * Real-Time Phillips Spectrum & Tessendorf Ocean Wave FFT Simulation in WebGPU / WGSL
 * @packageDocumentation
 */

export * from './types';
export * from './math/spectrum';
export * from './math/fft';
export * from './core/OceanSimulator';
export * from './core/CPUReferenceOcean';
export * from './core/ThreeOceanMesh';
export * from './utils/beaufort';

export { oceanSpectrumShader } from './shaders/oceanSpectrum.wgsl';
export { oceanFftShader } from './shaders/oceanFft.wgsl';
export { oceanNormalsShader } from './shaders/oceanNormals.wgsl';
