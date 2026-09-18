/**
 * Three.js Ocean Mesh & Surface Material Adapter.
 * Displaces dense PlaneGeometry vertices via ocean FFT textures and renders water optics.
 */

import { OceanConfig, DEFAULT_OCEAN_CONFIG } from '../types';

export class ThreeOceanMesh {
  public config: OceanConfig;
  public segments: number;

  constructor(config?: Partial<OceanConfig>, segments: number = 256) {
    this.config = { ...DEFAULT_OCEAN_CONFIG, ...config };
    this.segments = segments;
  }

  /**
   * Generates custom vertex and fragment shaders for Three.js ShaderMaterial.
   */
  public getShaderDefinition(): {
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, { value: any }>;
  } {
    const vertexShader = /* glsl */ `
      uniform sampler2D displacementMap;
      uniform float patchLength;
      uniform float choppiness;

      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec3 disp = texture2D(displacementMap, uv).xyz;
        vec3 displaced = position + vec3(disp.x * choppiness, disp.y, disp.z * choppiness);

        vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform sampler2D normalFoamMap;
      uniform vec3 sunDirection;
      uniform vec3 sunColor;
      uniform vec3 deepColor;
      uniform vec3 shallowColor;

      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vec4 normFoam = texture2D(normalFoamMap, vUv);
        vec3 normal = normalize(normFoam.xyz);
        float foam = normFoam.w;

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 lightDir = normalize(sunDirection);

        // Fresnel reflectance (Schlick approximation)
        float nDotV = max(0.0, dot(normal, viewDir));
        float fresnel = 0.02 + 0.98 * pow(1.0 - nDotV, 5.0);

        // Specular sun glint (Blinn-Phong)
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(0.0, dot(normal, halfDir)), 128.0) * 1.5;

        // Diffuse water tint
        vec3 waterColor = mix(deepColor, shallowColor, nDotV);

        // Blend specular reflection
        vec3 col = mix(waterColor, sunColor, fresnel) + sunColor * spec;

        // Sea foam overlay
        vec3 foamCol = vec3(0.95, 0.98, 1.0);
        col = mix(col, foamCol, foam);

        gl_FragColor = vec4(col, 0.92);
      }
    `;

    return {
      vertexShader,
      fragmentShader,
      uniforms: {
        patchLength: { value: this.config.patchLength },
        choppiness: { value: this.config.choppiness },
        sunDirection: { value: [0.6, 0.7, 0.3] },
        sunColor: { value: [1.0, 0.95, 0.85] },
        deepColor: { value: [0.01, 0.08, 0.22] },
        shallowColor: { value: [0.03, 0.35, 0.45] },
      }
    };
  }
}
