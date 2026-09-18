/**
 * WGSL Ocean Surface Normals & Jacobian Foam Generation Shader.
 * Evaluates spatial derivatives, normal vectors, and Jacobian wave-folding foam thresholds.
 */

export const oceanNormalsShader = /* wgsl */ `
struct NormalUniforms {
  gridSize: u32,
  patchLength: f32,
  choppiness: f32,
  foamThreshold: f32,
};

@group(0) @binding(0) var<uniform> params: NormalUniforms;
@group(0) @binding(1) var inDisplacementTex: texture_2d<f32>; // xyz = (Dx, Dy, Dz)
@group(0) @binding(2) var outNormalFoamTex: texture_storage_2d<rgba16float, write>; // xyz = Normal, w = Foam

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let coords = vec2<i32>(id.xy);
  let N = i32(params.gridSize);

  if (coords.x >= N || coords.y >= N) {
    return;
  }

  let stepX = 1;
  let stepY = 1;

  let left = vec2<i32>((coords.x - stepX + N) % N, coords.y);
  let right = vec2<i32>((coords.x + stepX) % N, coords.y);
  let top = vec2<i32>(coords.x, (coords.y - stepY + N) % N);
  let bottom = vec2<i32>(coords.x, (coords.y + stepY) % N);

  let dL = textureLoad(inDisplacementTex, left, 0).xyz;
  let dR = textureLoad(inDisplacementTex, right, 0).xyz;
  let dT = textureLoad(inDisplacementTex, top, 0).xyz;
  let dB = textureLoad(inDisplacementTex, bottom, 0).xyz;

  let deltaWorld = (2.0 * params.patchLength) / f32(N);

  // Partial derivatives of displacement vector
  let dD_dx = (dR - dL) / deltaWorld;
  let dD_dz = (dB - dT) / deltaWorld;

  // Tangent vectors along X and Z
  let tangentX = vec3<f32>(1.0 + dD_dx.x, dD_dx.y, dD_dx.z);
  let tangentZ = vec3<f32>(dD_dz.x, dD_dz.y, 1.0 + dD_dz.z);

  let normal = normalize(cross(tangentZ, tangentX));

  // Jacobian determinant J = (1 + lambda*Dxx)*(1 + lambda*Dzz) - lambda^2*(Dxz*Dzx)
  let jxx = 1.0 + dD_dx.x;
  let jzz = 1.0 + dD_dz.z;
  let jxz = dD_dx.z;
  let jzx = dD_dz.x;

  let jacobian = jxx * jzz - jxz * jzx;
  let foam = clamp((params.foamThreshold - jacobian) * 1.5, 0.0, 1.0);

  textureStore(outNormalFoamTex, coords, vec4<f32>(normal, foam));
}
`;
