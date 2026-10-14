/* Optional asset preview rigs. Values are authored for three.js r160, in linear lighting. */
(function (root) {
  const PRESETS = {
    soft: { name: 'Soft daylight', key: '#FFF5E9', keyK: 2.2, sky: '#ECF4FF', ground: '#B2A391', skyK: 1.3, fill: '#E3ECFF', fillK: 0.95, rim: '#FFFFFF', rimK: 0.55, position: [-9, 14, 8], exposure: 1.0 },
    neutral: { name: 'Neutral studio', key: '#FFFFFF', keyK: 2.35, sky: '#FFFFFF', ground: '#9BA5A4', skyK: 1.1, fill: '#E9F0FF', fillK: 1.05, rim: '#FFFFFF', rimK: 0.7, position: [-10, 15, 6], exposure: 1.0 },
    side: { name: 'Side light', key: '#FFF0DC', keyK: 2.5, sky: '#DCE9F7', ground: '#9E9588', skyK: 0.95, fill: '#E2EBFF', fillK: 0.7, rim: '#FFFFFF', rimK: 0.8, position: [-14, 8, 3], exposure: 1.0 },
    evening: { name: 'Warm evening', key: '#FFD8AE', keyK: 1.55, sky: '#C4D4ED', ground: '#AE937B', skyK: 1.0, fill: '#DCE7FF', fillK: 0.85, rim: '#FFE6C9', rimK: 0.6, position: [-10, 7, 8], exposure: 1.08 },
    night: { name: 'Night studio', key: '#D5E4FF', keyK: 0.95, sky: '#C1CFE9', ground: '#8D8582', skyK: 0.9, fill: '#CCDFFD', fillK: 0.85, rim: '#E6EEFF', rimK: 0.8, position: [-8, 12, -4], exposure: 1.1 }
  };
  const api = { PRESETS, ORDER: Object.keys(PRESETS) };
  root.DeskKitLighting = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
