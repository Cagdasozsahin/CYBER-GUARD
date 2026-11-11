import * as THREE from 'three';
import { WORLD, B, BLOCKS, TILE_COUNT, MAX_BLOCK_ID, isTransparent, SPAWN } from './constants.js';
import { ZONES } from './Zones.js';

const { W, D, H, CHUNK } = WORLD;
const NCX = W / CHUNK, NCZ = D / CHUNK;

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash3(x, y, z, s) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const smooth = (t) => t * t * (3 - 2 * t);
function vnoise(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const a = hash3(xi, 0, zi, s), b = hash3(xi + 1, 0, zi, s), c = hash3(xi, 0, zi + 1, s), d = hash3(xi + 1, 0, zi + 1, s);
  const u = smooth(xf), v = smooth(zf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// yüz tanımları: yön, 4 köşe (CCW), gölge çarpanı
const FACES = [
  { d: [1, 0, 0],  c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.82 },
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.82 },
  { d: [0, 1, 0],  c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0 },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.5 },
  { d: [0, 0, 1],  c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.7 },
  { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.7 }
];
const UVC = [[0, 0], [1, 0], [1, 1], [0, 1]];

export class World {
  // materials: { solid, glow, glass } (testlerde null verilebilir => mesh üretilmez)
  constructor(materials) {
    this.mats = materials;
    this.group = new THREE.Group();
    this.data = new Uint8Array(W * D * H);
    this.edits = new Map();
    this.chunks = new Array(NCX * NCZ).fill(null);
    this.dirty = new Set();
    this.tint = [1, 1, 1];
  }

  idx(x, y, z) { return x + z * W + y * W * D; }
  inBounds(x, y, z) { return x >= 0 && x < W && z >= 0 && z < D && y >= 0 && y < H; }
  get(x, y, z) {
    if (x < 0 || x >= W || z < 0 || z >= D || y < 0) return B.BEDROCK; // dünya duvarı
    if (y >= H) return B.AIR;
    return this.data[x + z * W + y * W * D];
  }
  raw(x, y, z, id) { if (this.inBounds(x, y, z)) this.data[this.idx(x, y, z)] = id; }

  findAll(id) { const out = []; let i = this.data.indexOf(id); while (i !== -1) { const y = Math.floor(i / (W * D)), r = i - y * W * D, z = Math.floor(r / W); out.push({ x: r - z * W, y, z }); i = this.data.indexOf(id, i + 1); } return out; }
  get hasVault() { return this.data.includes(B.VAULT); }
  findVault(px, py, pz, r = 4) { // yakındaki en yakın Secure Vault bloğu
    let best = null, bd = r * r + 1;
    for (let y = Math.floor(py) - 2; y <= Math.floor(py) + 3; y++) for (let z = Math.floor(pz - r); z <= Math.floor(pz + r); z++) for (let x = Math.floor(px - r); x <= Math.floor(px + r); x++) {
      if (this.get(x, y, z) !== B.VAULT) continue; const d = (x + 0.5 - px) ** 2 + (z + 0.5 - pz) ** 2 + (y + 0.5 - py - 0.9) ** 2;
      if (d < bd) { bd = d; best = { x, y, z }; }
    }
    return best;
  }

  surfaceY(x, z) { // en üstteki katı bloğun üstü (ayak y'si)
    x = Math.floor(x); z = Math.floor(z);
    for (let y = H - 1; y >= 0; y--) if (this.get(x, y, z) !== B.AIR) return y + 1;
    return 1;
  }

  generate(zone = ZONES[0]) {
    const G = zone.gen, S0 = G.seed; this.tint = zone.tint || [1, 1, 1];
    this.data.fill(0); this.edits.clear();
    const hs = new Int16Array(W * D);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      let h = Math.floor(7 + (vnoise(x * 0.07, z * 0.07, 1 + S0) - 0.5) * 8 + (vnoise(x * 0.18, z * 0.18, 2 + S0) - 0.5) * 3);
      const dist = Math.hypot(x + 0.5 - SPAWN.x, z + 0.5 - SPAWN.z);
      if (dist < 8) { const t = Math.max(0, Math.min(1, (dist - 5) / 3)); h = Math.round(8 * (1 - t) + h * t); }
      h = Math.max(3, Math.min(18, h)); hs[x + z * W] = h;
      const patch = vnoise(x * 0.1, z * 0.1, 5 + S0) > 0.64;
      for (let y = 0; y <= h; y++) {
        let id = y === 0 ? B.BEDROCK : y === h ? (patch ? B.DATA : B.CIRCUIT) : B.DATA;
        if (y > 0 && dist > 6) {
          const r = hash3(x, y, z, 11 + S0), m = G.oreMul;
          if (y === h && r < 0.018 * m) id = r < 0.009 * m ? B.ORE_CRYSTAL : r < 0.015 * m ? B.ORE_SCRAP : B.ORE_SHARD;
          else if (y < h && y > 1 && r < 0.03 * m) id = r < 0.012 * m ? B.ORE_CRYSTAL : r < 0.026 * m ? B.ORE_SCRAP : B.ORE_SHARD;
        }
        this.data[this.idx(x, y, z)] = id;
      }
    }
    const R = mulberry32(1234 + S0);
    const farFromSpawn = (x, z, r) => Math.hypot(x - SPAWN.x, z - SPAWN.z) > r;
    // veri kristali kümeleri
    for (let i = 0; i < G.crystals; i++) {
      const cx = 4 + Math.floor(R() * (W - 8)), cz = 4 + Math.floor(R() * (D - 8));
      if (!farFromSpawn(cx, cz, 10)) continue;
      const n = 3 + Math.floor(R() * 4);
      for (let k = 0; k < n; k++) {
        const x = cx + Math.floor(R() * 5) - 2, z = cz + Math.floor(R() * 5) - 2;
        if (x < 1 || z < 1 || x >= W - 1 || z >= D - 1) continue;
        const h = hs[x + z * W]; const tall = 1 + Math.floor(R() * 2);
        for (let t = 1; t <= tall; t++) this.raw(x, h + t, z, B.ORE_CRYSTAL);
      }
    }
    // sunucu kuleleri
    let towers = 0;
    for (let tries = 0; tries < 60 && towers < G.towers; tries++) {
      const cx = 5 + Math.floor(R() * (W - 10)), cz = 5 + Math.floor(R() * (D - 10));
      if (!farFromSpawn(cx, cz, 14)) continue; towers++;
      let y0 = 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) y0 = Math.max(y0, hs[cx + dx + (cz + dz) * W]);
      const th = 8 + Math.floor(R() * 7);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, z = cz + dz;
        for (let y = hs[x + z * W] + 1; y <= y0 + th; y++) {
          const rel = y - y0;
          let id = B.DATA;
          if (rel > 0 && rel % 3 === 2 && Math.abs(dx) + Math.abs(dz) === 1) id = B.ENERGY;
          if (rel === th) id = (dx === 0 && dz === 0) ? B.ENERGY : B.FIREWALL;
          this.raw(x, y, z, id);
        }
      }
    }
    // neon enerji direkleri
    for (let i = 0; i < G.poles; i++) {
      const x = 3 + Math.floor(R() * (W - 6)), z = 3 + Math.floor(R() * (D - 6));
      if (!farFromSpawn(x, z, 9)) continue;
      const h = hs[x + z * W]; const ph = 4 + Math.floor(R() * 3);
      for (let t = 1; t <= ph; t++) this.raw(x, h + t, z, t === ph ? B.ENERGY : B.DATA);
    }
    // Trojan yuvaları (kale: 4 firewall sütunu) ve veri ağaçları
    const nests = [];
    for (let k = 0; k < G.nests; k++) {
      const a = 0.6 + k * 2.09 + R() * 0.5, rad = 21 + R() * 5;
      const cx = Math.max(7, Math.min(W - 8, Math.round(SPAWN.x + Math.cos(a) * rad))), cz = Math.max(7, Math.min(D - 8, Math.round(SPAWN.z + Math.sin(a) * rad)));
      const h = hs[cx + cz * W]; nests.push([cx, cz]);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { // düz taban
        const x = cx + dx, z = cz + dz; for (let y = hs[x + z * W] + 1; y <= h; y++) this.raw(x, y, z, B.DATA); for (let y = h + 1; y <= h + 6; y++) this.raw(x, y, z, B.AIR);
        this.raw(x, h, z, B.CIRCUIT); hs[x + z * W] = h;
      }
      this.raw(cx, h + 1, cz, B.NEST);
      for (const [sx, sz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let t = 1; t <= 3; t++) this.raw(cx + sx, h + t, cz + sz, t === 3 ? B.ENERGY : B.FIREWALL);
    }
    for (let i = 0, placed = 0; i < G.trees * 4 && placed < G.trees; i++) {
      const x = 3 + Math.floor(R() * (W - 6)), z = 3 + Math.floor(R() * (D - 6));
      if (!farFromSpawn(x, z, 10) || nests.some(([nx, nz]) => Math.hypot(x - nx, z - nz) < 5)) continue;
      const h = hs[x + z * W]; if (this.get(x, h + 1, z) !== B.AIR) continue; placed++;
      const th = 4 + Math.floor(R() * 3);
      for (let t = 1; t <= th; t++) this.raw(x, h + t, z, B.FIREWALL);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 1; dy++) {
        if (Math.abs(dx) + Math.abs(dz) > 3 - dy || (dx === 0 && dz === 0 && dy === 0)) continue;
        const xx = x + dx, zz = z + dz; if (this.get(xx, h + th + dy, zz) === B.AIR) this.raw(xx, h + th + dy, zz, B.CIRCUIT);
      }
      if (R() < 0.18) this.raw(x + 1, h + th - 1, z, B.ENERGY);
    }
    // güvenli başlangıç alanı: 4 enerji sütunu
    for (const [sx, sz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) for (let t = 1; t <= 3; t++) this.raw(SPAWN.x + sx, 8 + t, SPAWN.z + sz, t === 3 ? B.ENERGY : B.FIREWALL);
  }

  // ---- düzenleme ----
  setBlock(x, y, z, id, track = false) {
    if (!this.inBounds(x, y, z)) return false;
    const i = this.idx(x, y, z); this.data[i] = id;
    if (track) this.edits.set(i, id);
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    this.dirty.add(cx + cz * NCX);
    if (x % CHUNK === 0 && cx > 0) this.dirty.add(cx - 1 + cz * NCX);
    if (x % CHUNK === CHUNK - 1 && cx < NCX - 1) this.dirty.add(cx + 1 + cz * NCX);
    if (z % CHUNK === 0 && cz > 0) this.dirty.add(cx + (cz - 1) * NCX);
    if (z % CHUNK === CHUNK - 1 && cz < NCZ - 1) this.dirty.add(cx + (cz + 1) * NCX);
    return true;
  }
  applyEdits(list) { for (const [i, id] of list) { if (i >= 0 && i < this.data.length && id >= 0 && id <= MAX_BLOCK_ID) { this.data[i] = id; this.edits.set(i, id); } } }
  flush() { for (const ci of this.dirty) this.buildChunk(ci % NCX, Math.floor(ci / NCX)); this.dirty.clear(); }
  buildAll() { for (let cz = 0; cz < NCZ; cz++) for (let cx = 0; cx < NCX; cx++) this.buildChunk(cx, cz); this.dirty.clear(); }

  // ---- fizik yardımcıları ----
  collideBox(x, y, z, hw, h) {
    const e = 1e-4;
    const x0 = Math.floor(x - hw + e), x1 = Math.floor(x + hw - e);
    const z0 = Math.floor(z - hw + e), z1 = Math.floor(z + hw - e);
    const y0 = Math.floor(y + e), y1 = Math.floor(y + h - e);
    for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (this.get(xx, yy, zz) !== B.AIR) return true;
    return false;
  }

  // Amanatides-Woo voxel ışın izleme
  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tmx = dx > 0 ? (x + 1 - ox) * tdx : dx < 0 ? (ox - x) * tdx : Infinity;
    let tmy = dy > 0 ? (y + 1 - oy) * tdy : dy < 0 ? (oy - y) * tdy : Infinity;
    let tmz = dz > 0 ? (z + 1 - oz) * tdz : dz < 0 ? (oz - z) * tdz : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    while (t <= maxDist) {
      const id = this.get(x, y, z);
      if (id !== B.AIR) return { x, y, z, id, nx, ny, nz, dist: t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }

  // ---- mesh üretimi (yüz kırpmalı chunk) ----
  buildChunk(cx, cz) {
    const ci = cx + cz * NCX;
    const old = this.chunks[ci];
    if (old) for (const m of old) { this.group.remove(m); m.geometry.dispose(); }
    const L = { solid: this._buf(), glow: this._buf(), glass: this._buf() };
    const x0 = cx * CHUNK, z0 = cz * CHUNK, inv = 1 / TILE_COUNT, ins = 0.02 * inv;
    for (let y = 0; y < H; y++) for (let z = z0; z < z0 + CHUNK; z++) for (let x = x0; x < x0 + CHUNK; x++) {
      const id = this.data[x + z * W + y * W * D]; if (id === B.AIR) continue;
      const def = BLOCKS[id]; const b = L[def.layer];
      const jit = def.layer === 'glow' ? 1 : 0.94 + hash3(x, y, z, 3) * 0.12;
      for (const f of FACES) {
        const n = this.get(x + f.d[0], y + f.d[1], z + f.d[2]);
        if (n !== B.AIR && !(isTransparent(n) && n !== id)) continue;
        const sh = def.layer === 'glow' ? 1 : f.s * jit, tn = def.layer === 'solid' ? this.tint : null;
        const base = b.pos.length / 3;
        for (let k = 0; k < 4; k++) {
          const c = f.c[k];
          b.pos.push(x + c[0], y + c[1], z + c[2]); b.nor.push(f.d[0], f.d[1], f.d[2]); b.col.push(tn ? sh * tn[0] : sh, tn ? sh * tn[1] : sh, tn ? sh * tn[2] : sh);
          b.uv.push((def.tile + (UVC[k][0] ? 1 : 0)) * inv + (UVC[k][0] ? -ins : ins), UVC[k][1] ? 1 - 0.02 : 0.02);
        }
        b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const meshes = [];
    if (this.mats) for (const key of ['solid', 'glow', 'glass']) {
      const b = L[key]; if (!b.idx.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      geo.setIndex(b.idx); geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, this.mats[key]); if (key === 'glass') m.renderOrder = 2;
      this.group.add(m); meshes.push(m);
    }
    this.chunks[ci] = meshes;
    this.lastBuild = { quads: L.solid.idx.length / 6 + L.glow.idx.length / 6 + L.glass.idx.length / 6 };
  }
  _buf() { return { pos: [], nor: [], uv: [], col: [], idx: [] }; }

  dispose() { for (const ms of this.chunks) if (ms) for (const m of ms) m.geometry.dispose(); }
}
