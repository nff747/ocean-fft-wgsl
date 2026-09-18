/**
 * WGSL Time-Domain Ocean Wave Spectrum Evolution Compute Shader.
 * Evaluates complex Fourier amplitudes for vertical height and horizontal choppy displacements.
 */

export const oceanSpectrumShader = /* wgsl */ `
struct OceanUniforms {
  gridSize: u32,               // N (e.g. 256)
  patchLength: f32,            // L (e.g. 250.0m)
  time: f32,                   // Current time in seconds
  choppiness: f32,             // Lambda horizontal displacement
};

@group(0) @binding(0) var<uniform> uniforms: OceanUniforms;
@group(0) @binding(1) var inH0Tex: texture_2d<f32>;        // rg = h0, ba = h0Conj
@group(0) @binding(2) var outHeightSpectrum: texture_storage_2d<rg32float, write>;
@group(0) @binding(3) var outDisplacementX: texture_storage_2d<rg32float, write>;
@group(0) @binding(4) var outDisplacementZ: texture_storage_2d<rg32float, write>;

const PI: f32 = 3.141592653589793;
const GRAVITY: f32 = 9.81;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let coords = vec2<i32>(id.xy);
  let N = i32(uniforms.gridSize);

  if (coords.x >= N || coords.y >= N) {
    return;
  }

  let kx = (2.0 * PI * f32(coords.x - N / 2)) / uniforms.patchLength;
  let kz = (2.0 * PI * f32(coords.y - N / 2)) / uniforms.patchLength;
  let kLen = max(length(vec2<f32>(kx, kz)), 1e-6);

  let omega = sqrt(GRAVITY * kLen);
  let cosWt = cos(omega * uniforms.time);
  let sinWt = sin(omega * uniforms.time);

  let h0Sample = textureLoad(inH0Tex, coords, 0);
  let h0 = h0Sample.xy;
  let h0Conj = h0Sample.zw;

  // h(k, t) = h0 * exp(i * w * t) + h0Conj * exp(-i * w * t)
  let h0Term = vec2<f32>(
    h0.x * cosWt - h0.y * sinWt,
    h0.x * sinWt + h0.y * cosWt
  );
  let h0ConjTerm = vec2<f32>(
    h0Conj.x * cosWt + h0Conj.y * sinWt,
    -h0Conj.x * sinWt + h0Conj.y * cosWt
  );

  let h = h0Term + h0ConjTerm;

  // Horizontal Choppy Displacements: D(k) = -i * (k / |k|) * h(k)
  // Multiplied by -i: (r + i*m)*(-i) = m - i*r
  let kNorm = vec2<f32>(kx, kz) / kLen;

  let dx = vec2<f32>(h.y * kNorm.x, -h.x * kNorm.x) * uniforms.choppiness;
  let dz = vec2<f32>(h.y * kNorm.y, -h.x * kNorm.y) * uniforms.choppiness;

  textureStore(outHeightSpectrum, coords, vec4<f32>(h, 0.0, 0.0));
  textureStore(outDisplacementX, coords, vec4<f32>(dx, 0.0, 0.0));
  textureStore(outDisplacementZ, coords, vec4<f32>(dz, 0.0, 0.0));
}
`;
