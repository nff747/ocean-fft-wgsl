/**
 * WGSL Radix-2 Stockham / Cooley-Tukey IFFT Butterfly Compute Shader.
 * Evaluates row/column passes of 2D Inverse Fast Fourier Transform on GPU storage textures.
 */

export const oceanFftShader = /* wgsl */ `
struct FftUniforms {
  stage: u32,                  // Current butterfly pass stage (0 to log2(N) - 1)
  direction: u32,              // 0 = Horizontal (Rows), 1 = Vertical (Columns)
  gridSize: u32,               // N
};

@group(0) @binding(0) var<uniform> params: FftUniforms;
@group(0) @binding(1) var inTex: texture_2d<f32>;
@group(0) @binding(2) var outTex: texture_storage_2d<rg32float, write>;

const PI: f32 = 3.141592653589793;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let coords = vec2<i32>(id.xy);
  let N = i32(params.gridSize);

  if (coords.x >= N || coords.y >= N) {
    return;
  }

  let stepLen = 1 << (params.stage + 1u);
  let halfStep = stepLen >> 1;

  var idx = coords.x;
  if (params.direction == 1u) {
    idx = coords.y;
  }

  let blockIdx = idx / stepLen;
  let localIdx = idx % stepLen;

  var p0 = coords;
  var p1 = coords;

  // Twiddle factor angle: + sign for Inverse FFT
  let angle = (2.0 * PI * f32(localIdx % halfStep)) / f32(stepLen);
  let twiddle = vec2<f32>(cos(angle), sin(angle));

  if (localIdx < halfStep) {
    // Upper butterfly branch
    if (params.direction == 0u) {
      p1.x = p0.x + halfStep;
    } else {
      p1.y = p0.y + halfStep;
    }
    let u = textureLoad(inTex, p0, 0).xy;
    let v = textureLoad(inTex, p1, 0).xy;
    // v * twiddle
    let vTwiddle = vec2<f32>(v.x * twiddle.x - v.y * twiddle.y, v.x * twiddle.y + v.y * twiddle.x);
    let res = u + vTwiddle;
    textureStore(outTex, coords, vec4<f32>(res, 0.0, 0.0));
  } else {
    // Lower butterfly branch
    if (params.direction == 0u) {
      p0.x = coords.x - halfStep;
    } else {
      p0.y = coords.y - halfStep;
    }
    let u = textureLoad(inTex, p0, 0).xy;
    let v = textureLoad(inTex, coords, 0).xy;
    let vTwiddle = vec2<f32>(v.x * twiddle.x - v.y * twiddle.y, v.x * twiddle.y + v.y * twiddle.x);
    let res = u - vTwiddle;
    textureStore(outTex, coords, vec4<f32>(res, 0.0, 0.0));
  }
}
`;
