/* Standalone asset recipes. Geometry stays shared across finishes. No DOM, textures, or app state. */
(function (root) {
  'use strict';
  const FINISHES = {
    clear: { name: 'Clear glass', kind: 'glass', color: '#E7F4F0', roughness: 0.08, transmission: 0.97, thickness: 0.56, ior: 1.47, attenuationColor: '#D5EEE2', attenuationDistance: 4.0, clearcoat: 0.3 },
    frosted: { name: 'Frosted glass', kind: 'glass', color: '#E3F0E8', roughness: 0.38, transmission: 0.79, thickness: 0.65, ior: 1.46, attenuationColor: '#DDECE6', attenuationDistance: 3.4, clearcoat: 0.08 },
    amber: { name: 'Amber glass', kind: 'glass', color: '#EDC48D', roughness: 0.13, transmission: 0.91, thickness: 0.64, ior: 1.48, attenuationColor: '#A85C20', attenuationDistance: 1.75, clearcoat: 0.25 },
    smoked: { name: 'Smoked glass', kind: 'glass', color: '#A0B1B3', roughness: 0.17, transmission: 0.89, thickness: 0.6, ior: 1.47, attenuationColor: '#5A656A', attenuationDistance: 2.2, clearcoat: 0.22 },
    sea_glass: { name: 'Sea glass', kind: 'glass', color: '#89BFB0', roughness: 0.45, transmission: 0.65, thickness: 0.67, ior: 1.46, attenuationColor: '#4C9481', attenuationDistance: 2.9, clearcoat: 0 },
    oak: { name: 'Oiled oak', kind: 'wood', color: '#B58A59', roughness: 0.65, clearcoat: 0.08, grain: { scale: 9, strength: 0.20, pores: 0.075, seed: 1.2, tint: '#624122' } },
    walnut: { name: 'Oiled walnut', kind: 'wood', color: '#795139', roughness: 0.56, clearcoat: 0.18, grain: { scale: 10, strength: 0.28, pores: 0.035, seed: 8.1, tint: '#321F14' } },
    maple: { name: 'Satin maple', kind: 'wood', color: '#E6CFA7', roughness: 0.61, clearcoat: 0.08, grain: { scale: 16, strength: 0.13, pores: 0.018, seed: 2.4, tint: '#A47C4C' } },
    cherry: { name: 'Cherry wood', kind: 'wood', color: '#BC7755', roughness: 0.56, clearcoat: 0.12, grain: { scale: 13, strength: 0.23, pores: 0.025, seed: 5.6, tint: '#663622' } },
    painted: { name: 'Painted sage wood', kind: 'wood', color: '#8EA899', roughness: 0.68, clearcoat: 0.05, grain: { scale: 13, strength: 0.09, pores: 0.024, seed: 1.2, tint: '#456557' } },
    ceramic: { name: 'Ivory ceramic', kind: 'ceramic', color: '#F0E5CF', roughness: 0.26, clearcoat: 0.5, clearcoatRoughness: 0.15, speckle: 0.025 },
    terracotta: { name: 'Terracotta', kind: 'ceramic', color: '#BD7355', roughness: 0.91, clearcoat: 0, speckle: 0.055 },
    cork: { name: 'Natural cork', kind: 'cork', color: '#BC9264', roughness: 0.94, clearcoat: 0, speckle: 0.2 },
    enamel: { name: 'Blue enamel', kind: 'paint', color: '#62899F', roughness: 0.31, clearcoat: 0.52, clearcoatRoughness: 0.16 }
  };
  const ORDER = ['clear', 'frosted', 'amber', 'smoked', 'sea_glass', 'oak', 'walnut', 'maple', 'cherry', 'painted', 'ceramic', 'terracotta', 'cork', 'enamel'];
  const LABEL = { color: '#F7F1E5', ink: '#342B24', roughness: 0.85, transmission: 0, opacity: 1 };
  const ASSETS = ['block_sample', 'block_long', 'block_pill', 'block_arch', 'block_tile', 'block_stack', 'block_box', 'block_organizer', 'block_lid', 'block_tray', 'block_rack', 'block_tokens'];
  function recipe(id) { return FINISHES[id] || FINISHES.oak; }

  /* Object-space grain works on the packed Blender geometry without UVs. The finite, irregular
     growth bands and small longitudinal pores remain quiet at desk scale. No image is fetched. */
  function surfaceShader(material, THREE, spec) {
    if (!spec.grain && !spec.speckle) return material;
    const grain = spec.grain;
    material.onBeforeCompile = function (shader) {
      shader.uniforms.kitGrainTint = { value: new THREE.Color(grain ? grain.tint : '#62401F') };
      shader.vertexShader = 'varying vec3 vKitSurface;\nvarying vec3 vKitSurfaceNormal;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvKitSurface = position;\nvKitSurfaceNormal = normal;');
      shader.fragmentShader = `varying vec3 vKitSurface;
varying vec3 vKitSurfaceNormal;
uniform vec3 kitGrainTint;
float kitHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float kitNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kitHash(i), kitHash(i + vec3(1,0,0)), f.x), mix(kitHash(i + vec3(0,1,0)), kitHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(kitHash(i + vec3(0,0,1)), kitHash(i + vec3(1,0,1)), f.x), mix(kitHash(i + vec3(0,1,1)), kitHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
` + shader.fragmentShader;
      const glslFloat = (v) => Number(v).toFixed(5);
      const code = grain ? `
vec3 p = vKitSurface + vec3(${glslFloat(grain.seed)}, 0.0, ${glslFloat(grain.seed * 0.63)});
float slow = kitNoise(p * vec3(0.28, 1.45, 1.55));
float bend = (slow - 0.5) * 0.38;
vec3 grainP = vec3(p.x * 0.65, (p.y + bend) * ${glslFloat(grain.scale)}, (p.z + bend * 0.6) * ${glslFloat(grain.scale)});
float coarse = kitNoise(grainP);
float fine = kitNoise(vec3(p.x * 1.1, (p.y + bend * 0.7) * 72.0, (p.z + bend * 0.4) * 95.0));
float annual = smoothstep(0.42, 0.82, coarse);
float pores = smoothstep(0.63, 0.93, fine);
float endFace = pow(abs(normalize(vKitSurfaceNormal).x), 10.0);
vec2 endP = vec2(p.y * 0.82 + 0.4, p.z);
float endRadius = length(endP) * 1.2 + kitNoise(vec3(endP * 2.1, 0.0)) * 0.24;
float endRing = kitNoise(vec3(endRadius * ${glslFloat(grain.scale * 2.1)}, 0.0, 0.0));
annual = mix(annual, smoothstep(0.4, 0.78, endRing), endFace * 0.75);
float grainTone = annual * ${glslFloat(grain.strength)} + pores * ${glslFloat(grain.pores)};
diffuseColor.rgb = mix(diffuseColor.rgb, kitGrainTint, grainTone);
diffuseColor.rgb *= 0.94 + 0.075 * slow;
` : `
vec3 p = vKitSurface;
float granules = kitNoise(p * ${spec.kind === 'cork' ? '30.0' : '115.0'});
float pores = smoothstep(0.70, 0.90, granules);
diffuseColor.rgb *= 1.0 + (granules - 0.52) * ${glslFloat(spec.speckle * 2)};
diffuseColor.rgb = mix(diffuseColor.rgb, kitGrainTint, pores * ${glslFloat(spec.speckle)});
`;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + code);
    };
    material.customProgramCacheKey = function () { return 'desk-kit-surface-v1:' + JSON.stringify(spec); };
    return material;
  }

  /* Keep opacity at 1 for physical transmission, so opaque plaques depth-test correctly.
     A reflection environment is optional but strongly improves edge readability on clear glass. */
  function createMaterial(THREE, id, options) {
    const spec = recipe(id), opts = options || {};
    const params = { color: opts.color || spec.color, roughness: spec.roughness, metalness: 0,
      clearcoat: spec.clearcoat || 0, clearcoatRoughness: spec.clearcoatRoughness || 0.22,
      transmission: spec.transmission || 0, thickness: spec.thickness || 0,
      ior: spec.ior || 1.45, opacity: 1, transparent: false, envMapIntensity: opts.envMapIntensity ?? 1.05 };
    if (spec.attenuationColor) params.attenuationColor = spec.attenuationColor;
    if (spec.attenuationDistance) params.attenuationDistance = spec.attenuationDistance;
    if (opts.envMap) params.envMap = opts.envMap;
    const material = surfaceShader(new THREE.MeshPhysicalMaterial(params), THREE, spec);
    material.name = 'Desk Kit / ' + spec.name;
    material.userData.blockFinish = ORDER.includes(id) ? id : 'oak';
    material.userData.castShadow = spec.kind !== 'glass';
    return material;
  }

  /* The caller owns and disposes returned materials. Labels deliberately never inherit glass. */
  function materialForGroup(THREE, group, finishId, options) {
    const opts = options || {};
    if (group.n === 'body') return createMaterial(THREE, finishId, opts);
    if (group.n === 'wood') return createMaterial(THREE, opts.wood || (recipe(finishId).kind === 'wood' ? finishId : 'oak'), opts);
    if (group.n === 'paper') return new THREE.MeshStandardMaterial({ color: LABEL.color, roughness: LABEL.roughness });
    return null;
  }
  function applyToThing(THREE, thing, finishId, options) {
    thing.traverse(function (mesh) {
      if (!mesh.isMesh) return;
      const group = mesh.userData.group || { n: mesh.userData.role };
      const next = materialForGroup(THREE, group, finishId, options);
      if (!next) return;
      const old = mesh.material;
      mesh.material = next;
      mesh.castShadow = next.userData.castShadow !== false;
      mesh.receiveShadow = true;
      mesh.renderOrder = 0;
      if (old && !Array.isArray(old)) old.dispose();
    });
    thing.userData.blockFinish = finishId;
    return thing;
  }
  const api = { FINISHES, ORDER, LABEL, ASSETS, recipe, createMaterial, materialForGroup, applyToThing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BlockFinishes = api;
})(typeof window !== 'undefined' ? window : globalThis);
