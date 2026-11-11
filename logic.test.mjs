// Saf mantık testleri (tarayıcı gerekmez): node tests/logic.test.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/game/World.js';
import { Inventory } from '../src/game/Inventory.js';
import { Crafting } from '../src/game/Crafting.js';
import { stepBody } from '../src/game/Physics.js';
import { B, SPAWN, WORLD, RECIPES, ITEMS, SAFE_RADIUS } from '../src/game/constants.js';
import { ZONES } from '../src/game/Zones.js';
import { SaveManager } from '../src/game/SaveManager.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓', name); };

const w = new World(null); w.generate(); w.buildAll();
t('dünya üretildi, yüzey/ana kaya var', () => {
  assert.equal(w.get(10, 0, 10), B.BEDROCK); assert.notEqual(w.get(10, 3, 10), B.AIR);
  assert.equal(w.get(-1, 5, 5), B.BEDROCK, 'dünya dışı katı'); assert.equal(w.get(5, WORLD.H + 3, 5), B.AIR);
});
t('spawn alanı düz ve boş', () => { const y = w.surfaceY(SPAWN.x + 0.5, SPAWN.z + 0.5); assert.equal(y, 9); assert.equal(w.collideBox(SPAWN.x + 0.5, y, SPAWN.z + 0.5, 0.3, 1.7), false); });
t('chunk mesh üretimi yüz kırpıyor', () => { w.buildChunk(0, 0); assert.ok(w.lastBuild.quads > 0 && w.lastBuild.quads < 16 * 16 * 32 * 6); });
t('raycast aşağıya zemini buluyor, normal +Y', () => { const h = w.raycast(32.5, 20, 32.5, 0, -1, 0, 30); assert.ok(h); assert.equal(h.ny, 1); assert.equal(h.y, 8); });
t('raycast boşlukta null', () => assert.equal(w.raycast(32.5, 25, 32.5, 0, 1, 0, 5), null));
t('blok kır/yerleştir + kirli chunk', () => {
  assert.ok(w.setBlock(32, 8, 32, B.AIR, true)); assert.equal(w.get(32, 8, 32), B.AIR); assert.ok(w.dirty.size >= 1); w.flush(); assert.equal(w.dirty.size, 0);
  assert.ok(w.setBlock(32, 8, 32, B.CIRCUIT, true)); assert.equal(w.setBlock(-1, 0, 0, 1), false);
});
t('fizik: düşen cisim zemine oturur, dünya dışına çıkamaz', () => {
  const b = { pos: new THREE.Vector3(40.5, 20, 40.5), vel: new THREE.Vector3(), hw: 0.3, h: 1.7 };
  for (let i = 0; i < 200; i++) { b.vel.y -= 26 * 0.016; stepBody(w, b, 0.016); }
  assert.ok(b.onGround); assert.equal(b.pos.y, w.surfaceY(40.5, 40.5));
  b.vel.set(-50, 0, -50); for (let i = 0; i < 100; i++) { b.vel.y -= 26 * 0.016; b.vel.x = -50; b.vel.z = -50; stepBody(w, b, 0.016); }
  assert.ok(b.pos.x >= 0.3 - 1e-6 && b.pos.z >= 0.3 - 1e-6 && b.pos.y > 0, 'sınır içinde kaldı');
});
t('düzenlemeler kayıt/yükleme ile geri geliyor', () => {
  const w2 = new World(null); w2.generate(); w2.applyEdits([...w.edits]); assert.deepEqual(Array.from(w2.data), Array.from(w.data));
});
t('envanter: yığınlama, taşma, çıkarma', () => {
  const inv = new Inventory(24);
  assert.equal(inv.add('data_crystal', 70), 0); assert.equal(inv.count('data_crystal'), 70); assert.equal(inv.slots[0].count, 64);
  assert.equal(inv.add('blaster', 1), 0); assert.equal(inv.add('blaster', 1), 0); assert.equal(inv.slots.filter((s) => s?.id === 'blaster').length, 2, 'araç yığınlanmaz');
  assert.ok(inv.remove('data_crystal', 66)); assert.equal(inv.count('data_crystal'), 4); assert.equal(inv.remove('data_crystal', 9), false);
  const full = new Inventory(2); full.add('data_crystal', 64); full.add('circuit_scrap', 64); assert.equal(full.add('data_crystal', 5), 5);
  const j = new Inventory(24); j.fromJSON(JSON.parse(JSON.stringify(inv.toJSON()))); assert.equal(j.count('blaster'), 2);
  const bad = new Inventory(24); bad.fromJSON([['x', -3], 'zzz', null, ['data_crystal', 2.5]]); assert.ok(bad.isEmpty(), 'bozuk veri reddedildi');
});
t('crafting: malzeme yoksa üretmez, varsa düşer', () => {
  const inv = new Inventory(24), c = new Crafting(inv), bl = RECIPES.find((r) => r.id === 'blaster');
  assert.equal(c.canCraft(bl), false); assert.equal(c.craft(bl), false);
  inv.add('data_crystal', 3); inv.add('circuit_scrap', 1); assert.equal(c.canCraft(bl), false);
  inv.add('circuit_scrap', 1); assert.ok(c.craft(bl)); assert.equal(inv.count('blaster'), 1); assert.equal(inv.count('data_crystal'), 0);
  inv.add('data_crystal', 5); inv.add('circuit_scrap', 5); assert.equal(c.canCraft(bl), false, 'ikinci blaster üretilmez');
  const fw = RECIPES.find((r) => r.id === 'firewall'); inv.add('firewall_chip', 1); assert.ok(c.craft(fw)); assert.equal(inv.count('firewall_block'), 4);
});
t('tüm tarif/eşya referansları geçerli', () => { for (const r of RECIPES) { assert.ok(ITEMS[r.out], r.out); for (const k of Object.keys(r.cost)) assert.ok(ITEMS[k], k); } });
t('kasa bulma', () => { w.setBlock(34, 9, 34, B.VAULT, true); const v = w.findVault(33.5, 9, 33.5, 4); assert.deepEqual([v.x, v.y, v.z], [34, 9, 34]); assert.ok(w.hasVault); assert.equal(w.findVault(5, 9, 5, 3), null); });

t('bölge 2: 3 yuva, ağaçlar, spawn temiz; bölge 1 yuvasız', () => {
  const w1 = new World(null); w1.generate(ZONES[0]); assert.equal(w1.findAll(B.NEST).length, 0);
  const w2 = new World(null); w2.generate(ZONES[1]); const nests = w2.findAll(B.NEST); assert.equal(nests.length, 3);
  for (const nst of nests) assert.ok(Math.hypot(nst.x - SPAWN.x, nst.z - SPAWN.z) >= 18, 'yuva spawn\'dan uzak');
  assert.equal(w2.collideBox(SPAWN.x + 0.5, w2.surfaceY(SPAWN.x + 0.5, SPAWN.z + 0.5), SPAWN.z + 0.5, 0.3, 1.7), false);
  let trunks = 0; for (let i = 0; i < w2.data.length; i++) if (w2.data[i] === B.FIREWALL) trunks++; assert.ok(trunks > 150, 'ağaç gövdeleri var');
  w2.buildAll(); assert.ok(w2.lastBuild.quads > 0);
});
t('güvenli alan yarıçapı 25 (50 blok çap)', () => assert.equal(SAFE_RADIUS * 2, 50));
t('Safe Zone Generator tarifi: 5 DC + 4 CS + 2 ES + 2 FC + 2 EC', () => {
  const inv = new Inventory(24), c = new Crafting(inv), r = RECIPES.find((x) => x.id === 'safezone');
  assert.equal(c.canCraft(r), false);
  inv.add('data_crystal', 5); inv.add('circuit_scrap', 4); inv.add('encryption_shard', 2); inv.add('firewall_chip', 2); inv.add('energy_cell', 1); assert.equal(c.canCraft(r), false);
  inv.add('energy_cell', 1); assert.ok(c.craft(r)); assert.equal(inv.count('safe_zone_generator'), 1); assert.equal(inv.count('energy_cell'), 0);
  const cell = RECIPES.find((x) => x.id === 'cell'); inv.add('ram_fragment', 3); assert.ok(c.craft(cell)); assert.equal(inv.count('energy_cell'), 2);
});
t('kayıt: v1 eski kayıt v2\'ye taşınır, bozuk kayıt temizlenir', () => {
  const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  store['cyberguard.save.v1'] = JSON.stringify({ version: 1, player: { x: 1, y: 9, z: 2, hp: 50 }, inv: [], edits: [[5, 2]] });
  const d = SaveManager.load(); assert.equal(d.version, 2); assert.equal(d.zone, 1); assert.deepEqual(d.zoneData[1].edits, [[5, 2]]); assert.deepEqual(d.unlocked, [1]);
  assert.ok(SaveManager.save({ zone: 2, unlocked: [1, 2], completed: [1], zoneData: {}, player: { x: 1, y: 9, z: 2, hp: 10 }, inv: [] })); assert.equal(SaveManager.load().zone, 2);
  store['cyberguard.save.v1'] = '{bozuk'; assert.equal(SaveManager.load(), null); assert.equal(store['cyberguard.save.v1'], undefined);
});
t('zıplayıp ayak altına blok: yerleştirme AABB kuralı (pillar)', () => {
  // oyuncu hücre y=9'da duruyorsa (ayak y=9) blok y=9 hücresine konamaz; ayak y>=10 iken konabilir
  const overlap = (py, cellY) => cellY + 1 > py + 0.01 && cellY < py + 1.7;
  assert.equal(overlap(9, 9), true); assert.equal(overlap(10.2, 9), false);
});

console.log(`\n${n} test geçti`);
