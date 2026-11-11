import * as THREE from 'three';
import { TILE_COUNT } from './constants.js';

// Prosedürel 16px blok doku atlası (harici dosya yok, konsept görselinden kopya yok).
const S = 16;
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function makeAtlas() {
  const c = document.createElement('canvas');
  c.width = S * TILE_COUNT; c.height = S;
  const g = c.getContext('2d');
  const R = rng(7);
  const px = (t, x, y, col) => { g.fillStyle = col; g.fillRect(t * S + x, y, 1, 1); };
  const rect = (t, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(t * S + x, y, w, h); };
  const speckle = (t, cols, n) => { for (let i = 0; i < n; i++) px(t, (R() * S) | 0, (R() * S) | 0, cols[(R() * cols.length) | 0]); };

  // 0 circuit
  rect(0, 0, 0, S, S, '#0e3a47'); speckle(0, ['#0b3140', '#124657'], 40);
  rect(0, 0, 4, 9, 1, '#2fd1e8'); rect(0, 8, 4, 1, 7, '#2fd1e8'); rect(0, 8, 10, 8, 1, '#2fd1e8');
  rect(0, 3, 12, 1, 4, '#1c8fa6'); rect(0, 3, 12, 6, 1, '#1c8fa6');
  rect(0, 7, 3, 3, 3, '#7af0ff'); rect(0, 12, 9, 3, 3, '#7af0ff'); rect(0, 0, 0, S, 1, '#0a2b36');
  // 1 data
  rect(1, 0, 0, S, S, '#15527c'); speckle(1, ['#124a70', '#1a5d8c'], 36);
  rect(1, 0, 0, S, 1, '#2aa5d8'); rect(1, 0, 0, 1, S, '#2aa5d8'); rect(1, 0, 15, S, 1, '#0d3a5a'); rect(1, 15, 0, 1, S, '#0d3a5a');
  rect(1, 4, 4, 8, 8, '#1a6a9c'); rect(1, 6, 6, 4, 4, '#3cc4f0');
  // 2 firewall
  rect(2, 0, 0, S, S, '#a8381a');
  for (let y = 0; y < S; y += 4) { rect(2, 0, y, S, 1, '#ff9a4a'); const off = (y / 4) % 2 ? 0 : 4; for (let x = off; x < S; x += 8) rect(2, x, y, 1, 4, '#5e1d0c'); }
  speckle(2, ['#c8501f', '#8e2c12'], 30);
  // 3 glass
  g.clearRect(3 * S, 0, S, S); rect(3, 0, 0, S, S, 'rgba(110,230,255,0.28)');
  rect(3, 0, 0, S, 1, '#7ff1ff'); rect(3, 0, 15, S, 1, '#7ff1ff'); rect(3, 0, 0, 1, S, '#7ff1ff'); rect(3, 15, 0, 1, S, '#7ff1ff');
  rect(3, 3, 3, 3, 1, '#d8fbff'); rect(3, 3, 3, 1, 3, '#d8fbff');
  // 4 energy
  rect(4, 0, 0, S, S, '#d8f23a'); speckle(4, ['#f2ff7a', '#bfd92a'], 50);
  rect(4, 0, 0, S, 1, '#7d8c10'); rect(4, 0, 15, S, 1, '#7d8c10'); rect(4, 0, 0, 1, S, '#7d8c10'); rect(4, 15, 0, 1, S, '#7d8c10');
  rect(4, 7, 2, 3, 5, '#fffbd0'); rect(4, 5, 7, 6, 2, '#fffbd0'); rect(4, 6, 9, 3, 5, '#fffbd0');
  // 5 vault
  rect(5, 0, 0, S, S, '#1a2250'); speckle(5, ['#222c66', '#141a3c'], 30);
  rect(5, 0, 0, S, 1, '#6e4dff'); rect(5, 0, 15, S, 1, '#6e4dff'); rect(5, 0, 0, 1, S, '#6e4dff'); rect(5, 15, 0, 1, S, '#6e4dff');
  rect(5, 5, 7, 6, 6, '#54e7ff'); rect(5, 6, 3, 4, 1, '#54e7ff'); rect(5, 6, 3, 1, 5, '#54e7ff'); rect(5, 9, 3, 1, 5, '#54e7ff'); rect(5, 7, 9, 2, 2, '#0b1d3a');
  // taş tabanı + cevher
  const stone = (t) => { rect(t, 0, 0, S, S, '#14384e'); speckle(t, ['#10304a', '#1a4560', '#0e2a3d'], 50); };
  stone(6); for (const [x, y] of [[3, 9], [9, 3], [10, 10], [5, 3]]) { rect(6, x, y, 3, 4, '#44e8ff'); rect(6, x + 1, y, 1, 2, '#d6fbff'); }
  stone(7); for (const [x, y] of [[2, 3], [9, 2], [4, 10], [11, 9]]) { rect(7, x, y, 4, 3, '#9bff7a'); rect(7, x, y + 1, 4, 1, '#3a9c31'); rect(7, x + 1, y, 1, 1, '#eaffd8'); }
  stone(8); for (const [x, y] of [[3, 3], [9, 8], [11, 2], [3, 10]]) { rect(8, x, y, 3, 4, '#c18bff'); rect(8, x + 1, y, 1, 2, '#f0dcff'); }
  // 9 bedrock
  rect(9, 0, 0, S, S, '#0b111c'); speckle(9, ['#05080f', '#141c2c', '#1b2538'], 70);

  // 10 trojan yuvası
  rect(10, 0, 0, S, S, '#3a0710'); speckle(10, ['#5a0c1a', '#260408'], 40);
  rect(10, 0, 0, S, 1, '#ff3b5c'); rect(10, 0, 15, S, 1, '#ff3b5c'); rect(10, 0, 0, 1, S, '#ff3b5c'); rect(10, 15, 0, 1, S, '#ff3b5c');
  rect(10, 3, 5, 10, 6, '#ff2a4a'); rect(10, 5, 4, 6, 8, '#ff2a4a'); rect(10, 6, 6, 4, 4, '#fff0f3'); rect(10, 7, 7, 2, 2, '#14040a');
  // 11 safe zone generator
  rect(11, 0, 0, S, S, '#0b3d4a'); speckle(11, ['#0f5668', '#09323d'], 30);
  rect(11, 0, 0, S, 1, '#5dffd6'); rect(11, 0, 15, S, 1, '#5dffd6'); rect(11, 0, 0, 1, S, '#5dffd6'); rect(11, 15, 0, 1, S, '#5dffd6');
  rect(11, 4, 3, 8, 7, '#5dffd6'); rect(11, 5, 10, 6, 2, '#5dffd6'); rect(11, 6, 12, 4, 1, '#5dffd6'); rect(11, 6, 5, 4, 4, '#0b3d4a'); rect(11, 7, 6, 2, 2, '#e8fffa');

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeMaterials(tex) {
  return {
    solid: new THREE.MeshLambertMaterial({ map: tex, vertexColors: true }),
    glow: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true }),
    glass: new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false })
  };
}
