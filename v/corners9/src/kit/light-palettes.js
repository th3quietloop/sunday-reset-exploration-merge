/* Steady string light colors. Color changes apply to bulb materials, not geometry. */
(function (root) {
  'use strict';
  const palettes = {
    warm: { name: 'Warm white', colors: ['#FFD397'], spill: '#FFD8A8', strength: 0.65 },
    candle: { name: 'Candle amber', colors: ['#FFBA63', '#F6D299', '#ECA65C'], spill: '#FFC58A', strength: 0.58 },
    pearl: { name: 'Pearl', colors: ['#F3EFE5', '#E6EDF0', '#F8E9D4'], spill: '#F1E9DD', strength: 0.58 },
    pastel: { name: 'Soft pastels', colors: ['#EEB2B6', '#F0D695', '#B3D3BC', '#ACCADD', '#CBB6DB'], spill: '#EBD9CD', strength: 0.56 },
    forest: { name: 'Green and cream', colors: ['#AFC998', '#E4D9AE', '#82AE9D', '#F2E6BE'], spill: '#E0DFB4', strength: 0.55 },
    autumn: { name: 'Autumn', colors: ['#D68E5D', '#E9BF77', '#C47463', '#E0C39B'], spill: '#EBC492', strength: 0.56 },
    winter: { name: 'Winter blue', colors: ['#A8C8DB', '#D1DDE4', '#EEE6D6', '#B9BBD2'], spill: '#D1DCE3', strength: 0.56 },
    holiday: { name: 'Red and green', colors: ['#D88476', '#A1BB8C', '#E6C47F', '#E9DABE'], spill: '#ECD8B7', strength: 0.56 }
  };
  for (const palette of Object.values(palettes)) { Object.freeze(palette.colors); Object.freeze(palette); }
  const api = Object.freeze({ palettes: Object.freeze(palettes), order: Object.freeze(Object.keys(palettes)) });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DeskKitLightPalettes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
