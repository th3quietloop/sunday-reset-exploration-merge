(function(p){"use strict";const c={clear:{name:"Clear glass",kind:"glass",color:"#E7F4F0",roughness:.08,transmission:.97,thickness:.56,ior:1.47,attenuationColor:"#D5EEE2",attenuationDistance:4,clearcoat:.3},frosted:{name:"Frosted glass",kind:"glass",color:"#E3F0E8",roughness:.38,transmission:.79,thickness:.65,ior:1.46,attenuationColor:"#DDECE6",attenuationDistance:3.4,clearcoat:.08},amber:{name:"Amber glass",kind:"glass",color:"#EDC48D",roughness:.13,transmission:.91,thickness:.64,ior:1.48,attenuationColor:"#A85C20",attenuationDistance:1.75,clearcoat:.25},smoked:{name:"Smoked glass",kind:"glass",color:"#A0B1B3",roughness:.17,transmission:.89,thickness:.6,ior:1.47,attenuationColor:"#5A656A",attenuationDistance:2.2,clearcoat:.22},sea_glass:{name:"Sea glass",kind:"glass",color:"#89BFB0",roughness:.45,transmission:.65,thickness:.67,ior:1.46,attenuationColor:"#4C9481",attenuationDistance:2.9,clearcoat:0},oak:{name:"Oiled oak",kind:"wood",color:"#B58A59",roughness:.65,clearcoat:.08,grain:{scale:9,strength:.2,pores:.075,seed:1.2,tint:"#624122"}},walnut:{name:"Oiled walnut",kind:"wood",color:"#795139",roughness:.56,clearcoat:.18,grain:{scale:10,strength:.28,pores:.035,seed:8.1,tint:"#321F14"}},maple:{name:"Satin maple",kind:"wood",color:"#E6CFA7",roughness:.61,clearcoat:.08,grain:{scale:16,strength:.13,pores:.018,seed:2.4,tint:"#A47C4C"}},cherry:{name:"Cherry wood",kind:"wood",color:"#BC7755",roughness:.56,clearcoat:.12,grain:{scale:13,strength:.23,pores:.025,seed:5.6,tint:"#663622"}},painted:{name:"Painted sage wood",kind:"wood",color:"#8EA899",roughness:.68,clearcoat:.05,grain:{scale:13,strength:.09,pores:.024,seed:1.2,tint:"#456557"}},ceramic:{name:"Ivory ceramic",kind:"ceramic",color:"#F0E5CF",roughness:.26,clearcoat:.5,clearcoatRoughness:.15,speckle:.025},terracotta:{name:"Terracotta",kind:"ceramic",color:"#BD7355",roughness:.91,clearcoat:0,speckle:.055},cork:{name:"Natural cork",kind:"cork",color:"#BC9264",roughness:.94,clearcoat:0,speckle:.2},enamel:{name:"Blue enamel",kind:"paint",color:"#62899F",roughness:.31,clearcoat:.52,clearcoatRoughness:.16}},f=["clear","frosted","amber","smoked","sea_glass","oak","walnut","maple","cherry","painted","ceramic","terracotta","cork","enamel"],l={color:"#F7F1E5",ink:"#342B24",roughness:.85,transmission:0,opacity:1},m=["block_sample","block_long","block_pill","block_arch","block_tile","block_stack","block_box","block_organizer","block_lid","block_tray","block_rack","block_tokens"];function u(t){return c[t]||c.oak}function h(t,r,a){if(!a.grain&&!a.speckle)return t;const e=a.grain;return t.onBeforeCompile=function(o){o.uniforms.kitGrainTint={value:new r.Color(e?e.tint:"#62401F")},o.vertexShader=`varying vec3 vKitSurface;
varying vec3 vKitSurfaceNormal;
`+o.vertexShader,o.vertexShader=o.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vKitSurface = position;
vKitSurfaceNormal = normal;`),o.fragmentShader=`varying vec3 vKitSurface;
varying vec3 vKitSurfaceNormal;
uniform vec3 kitGrainTint;
float kitHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float kitNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kitHash(i), kitHash(i + vec3(1,0,0)), f.x), mix(kitHash(i + vec3(0,1,0)), kitHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(kitHash(i + vec3(0,0,1)), kitHash(i + vec3(1,0,1)), f.x), mix(kitHash(i + vec3(0,1,1)), kitHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`+o.fragmentShader;const n=i=>Number(i).toFixed(5),s=e?`
vec3 p = vKitSurface + vec3(${n(e.seed)}, 0.0, ${n(e.seed*.63)});
float slow = kitNoise(p * vec3(0.28, 1.45, 1.55));
float bend = (slow - 0.5) * 0.38;
vec3 grainP = vec3(p.x * 0.65, (p.y + bend) * ${n(e.scale)}, (p.z + bend * 0.6) * ${n(e.scale)});
float coarse = kitNoise(grainP);
float fine = kitNoise(vec3(p.x * 1.1, (p.y + bend * 0.7) * 72.0, (p.z + bend * 0.4) * 95.0));
float annual = smoothstep(0.42, 0.82, coarse);
float pores = smoothstep(0.63, 0.93, fine);
float endFace = pow(abs(normalize(vKitSurfaceNormal).x), 10.0);
vec2 endP = vec2(p.y * 0.82 + 0.4, p.z);
float endRadius = length(endP) * 1.2 + kitNoise(vec3(endP * 2.1, 0.0)) * 0.24;
float endRing = kitNoise(vec3(endRadius * ${n(e.scale*2.1)}, 0.0, 0.0));
annual = mix(annual, smoothstep(0.4, 0.78, endRing), endFace * 0.75);
float grainTone = annual * ${n(e.strength)} + pores * ${n(e.pores)};
diffuseColor.rgb = mix(diffuseColor.rgb, kitGrainTint, grainTone);
diffuseColor.rgb *= 0.94 + 0.075 * slow;
`:`
vec3 p = vKitSurface;
float granules = kitNoise(p * ${a.kind==="cork"?"30.0":"115.0"});
float pores = smoothstep(0.70, 0.90, granules);
diffuseColor.rgb *= 1.0 + (granules - 0.52) * ${n(a.speckle*2)};
diffuseColor.rgb = mix(diffuseColor.rgb, kitGrainTint, pores * ${n(a.speckle)});
`;o.fragmentShader=o.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
`+s)},t.customProgramCacheKey=function(){return"desk-kit-surface-v1:"+JSON.stringify(a)},t}function d(t,r,a){const e=u(r),o=a||{},n={color:o.color||e.color,roughness:e.roughness,metalness:0,clearcoat:e.clearcoat||0,clearcoatRoughness:e.clearcoatRoughness||.22,transmission:e.transmission||0,thickness:e.thickness||0,ior:e.ior||1.45,opacity:1,transparent:!1,envMapIntensity:o.envMapIntensity??1.05};e.attenuationColor&&(n.attenuationColor=e.attenuationColor),e.attenuationDistance&&(n.attenuationDistance=e.attenuationDistance),o.envMap&&(n.envMap=o.envMap);const s=h(new t.MeshPhysicalMaterial(n),t,e);return s.name="Desk Kit / "+e.name,s.userData.blockFinish=f.includes(r)?r:"oak",s.userData.castShadow=e.kind!=="glass",s}function k(t,r,a,e){const o=e||{};return r.n==="body"?d(t,a,o):r.n==="wood"?d(t,o.wood||(u(a).kind==="wood"?a:"oak"),o):r.n==="paper"?new t.MeshStandardMaterial({color:l.color,roughness:l.roughness}):null}function v(t,r,a,e){return r.traverse(function(o){if(!o.isMesh)return;const n=o.userData.group||{n:o.userData.role},s=k(t,n,a,e);if(!s)return;const i=o.material;o.material=s,o.castShadow=s.userData.castShadow!==!1,o.receiveShadow=!0,o.renderOrder=0,i&&!Array.isArray(i)&&i.dispose()}),r.userData.blockFinish=a,r}const g={FINISHES:c,ORDER:f,LABEL:l,ASSETS:m,recipe:u,createMaterial:d,materialForGroup:k,applyToThing:v};typeof module<"u"&&module.exports&&(module.exports=g),p.BlockFinishes=g})(typeof window<"u"?window:globalThis);
