import { FFT2D } from '../src/math/fft.js';
import { OceanSimulator } from '../src/core/OceanSimulator.js';
import { CPUReferenceOcean } from '../src/core/CPUReferenceOcean.js';

interface BenchResult {
  resolution: string;
  gridCells: number;
  fftElapsedMs: number;
  fullSynthesisMs: number;
  transformsPerSec: number;
}

function runBenchmark(n: number, iterations: number = 3): BenchResult {
  const real = new Float32Array(n * n);
  const imag = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) real[i] = Math.random();

  // Warmup 2D FFT
  FFT2D.transform2D(real, imag, n, true);

  const startFft = performance.now();
  for (let i = 0; i < iterations; i++) {
    FFT2D.transform2D(real, imag, n, true);
  }
  const avgFft = (performance.now() - startFft) / iterations;

  // Measure full frame synthesis (Spectrum + 3x 2D IFFT for Y, X, Z)
  const sim = new OceanSimulator(null, { gridSize: n });
  CPUReferenceOcean.synthesizeFrame(sim.spectrum, sim.config, 1.0);

  const startSynth = performance.now();
  for (let i = 0; i < iterations; i++) {
    CPUReferenceOcean.synthesizeFrame(sim.spectrum, sim.config, 1.0 + i * 0.1);
  }
  const avgSynth = (performance.now() - startSynth) / iterations;

  return {
    resolution: `${n}x${n}`,
    gridCells: n * n,
    fftElapsedMs: Number(avgFft.toFixed(2)),
    fullSynthesisMs: Number(avgSynth.toFixed(2)),
    transformsPerSec: Math.round(1000 / avgFft),
  };
}

console.log('⚡ TESSENDORF OCEAN 2D FFT THROUGHPUT BENCHMARK');
console.log('================================================================================');
console.log('| Grid Res  | Cells (Vertices) | 2D IFFT (ms) | Full Wave Frame (ms) | IFFT / sec |');
console.log('--------------------------------------------------------------------------------');

const resolutions = [64, 128, 256];
for (const res of resolutions) {
  const b = runBenchmark(res, 3);
  console.log(
    `| ${b.resolution.padEnd(9)} | ${b.gridCells.toLocaleString().padStart(16)} | ${b.fftElapsedMs.toFixed(2).padStart(12)} | ${b.fullSynthesisMs.toFixed(2).padStart(20)} | ${b.transformsPerSec.toLocaleString().padStart(10)} |`
  );
}

console.log('================================================================================');
console.log('✔ Benchmark completed successfully.');
