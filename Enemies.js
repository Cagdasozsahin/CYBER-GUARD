import * as THREE from 'three';
import { stepBody } from './Physics.js';
import { WORLD, B } from './constants.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const M = {
  red: new THREE.MeshStandardMaterial({ color: 0xc92b3f, emissive: 0x5a0010, emissiveIntensity: 1, roughness: 0.6 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x4a1019, roughness: 0.7 }),
  eye: new THREE.MeshBasicMaterial({ color: 0xffe3e8 }),
  purple: new THREE.MeshStandardMaterial({ color: 0x8e3bd6, emissive: 0x3b0870, emissiveIntensity: 1, roughness: 0.6 }),
  pdark: new THREE.MeshStandardMaterial({ color: 0x2a1442, roughness: 0.7 }),
  hpBg: new THREE.MeshBasicMaterial({ color: 0x111a24, depthTest: false, transparent: true }),
  hp: new THREE.MeshBasicMaterial({ color: 0x4dff9a, depthTest: false, transparent: true })
};
const planeGeo = new THREE.PlaneGeometry(1, 0.1);

function healthBar(y) {
  const g = new THREE.Group(); g.position.y = y;
  const bg = new THREE.Mesh(planeGeo, M.hpBg); bg.scale.set(1.04, 1.5, 1); bg.renderOrder = 10;
  const fg = new THREE.Mesh(planeGeo, M.hp); fg.position.z = 0.001; fg.renderOrder = 11;
  g.add(bg, fg); g.userData.fg = fg; return g;
}

function buildTrojan() { // at/Truva atı esinli, özgün kırmızı veri yaratığı
  const g = new THREE.Group();
  const body = box(0.9, 0.55, 0.7, M.red); body.position.y = 0.6; g.add(body);
  const neck = box(0.35, 0.5, 0.35, M.red); neck.position.set(0, 0.95, 0.38); g.add(neck);
  const head = box(0.42, 0.4, 0.55, M.dark); head.position.set(0, 1.2, 0.55); g.add(head);
  for (const s of [-0.12, 0.12]) { const eye = box(0.1, 0.1, 0.05, M.eye); eye.position.set(s, 1.28, 0.84); g.add(eye); const ear = box(0.1, 0.2, 0.1, M.red); ear.position.set(s, 1.5, 0.42); g.add(ear); }
  const legs = [];
  for (const [x, z] of [[-0.3, -0.22], [0.3, -0.22], [-0.3, 0.22], [0.3, 0.22]]) { const l = box(0.2, 0.4, 0.2, M.dark); l.position.set(x, 0.2, z); g.add(l); legs.push(l); }
  return { g, legs };
}
function buildSpam() { // uçan mesaj kutusu
  const g = new THREE.Group();
  const body = box(0.7, 0.5, 0.5, M.purple); body.position.y = 0.4; g.add(body);
  const flap = box(0.7, 0.05, 0.52, M.pdark); flap.position.y = 0.66; g.add(flap);
  for (const s of [-0.18, 0.18]) { const eye = box(0.12, 0.12, 0.05, M.eye); eye.position.set(s, 0.45, 0.27); g.add(eye); }
  const w1 = box(0.4, 0.06, 0.25, M.pdark); w1.position.set(-0.55, 0.5, 0); const w2 = w1.clone(); w2.position.x = 0.55; g.add(w1, w2);
  return { g, legs: [w1, w2] };
}

const TYPES = {
  trojan: { name: 'Trojan', hp: 4, hw: 0.4, h: 1.0, radius: 0.75, build: buildTrojan, bar: 1.9 },
  spam: { name: 'Spam Bot', hp: 3, hw: 0.35, h: 0.8, radius: 0.6, build: buildSpam, bar: 1.35 }
};

export class Enemies {
  constructor(game) { this.game = game; this.list = []; this.group = new THREE.Group(); game.scene.add(this.group); this.spawnT = 12; this.nestT = {}; }

  spawn(type, x, z) {
    const def = TYPES[type], { g, legs } = def.build(), bar = healthBar(def.bar);
    const e = { type, def, pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), hw: def.hw, h: def.h, onGround: false, hitX: false, hitZ: false,
      hp: def.hp, max: def.hp, group: new THREE.Group(), legs, bar, cd: 1, shoot: 2 + Math.random() * 2, t: Math.random() * 6, radius: def.radius, dir: Math.random() < 0.5 ? 1 : -1 };
    e.pos.y = type === 'spam' ? this.game.world.surfaceY(x, z) + 3 : this.game.world.surfaceY(x, z) + 0.5;
    e.group.add(g, bar); e.body = g; this.group.add(e.group); this.list.push(e);
    Object.defineProperty(e, 'center', { get() { return new THREE.Vector3(this.pos.x, this.pos.y + this.h * 0.55, this.pos.z); } });
    return e;
  }

  spawnAround(type, minD = 22, maxD = 32) {
    minD = Math.max(minD, this.game.zone.enemy.minDist);
    const p = this.game.player.pos;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, d = minD + Math.random() * (maxD - minD);
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (x < 2 || z < 2 || x > WORLD.W - 2 || z > WORLD.D - 2) continue;
      if (this.game.world.surfaceY(x, z) > 22 || this.game.inSafe(x, z)) continue;
      return this.spawn(type, x, z);
    }
    return null;
  }

  clear() { for (const e of this.list) this.group.remove(e.group); this.list.length = 0; }

  purge(e) { const i = this.list.indexOf(e); if (i >= 0) { this.list.splice(i, 1); this.group.remove(e.group); } }

  hit(e, dmg) {
    e.hp -= dmg;
    const dir = e.center.sub(this.game.player.pos).setY(0).normalize(); e.vel.x += dir.x * 3; e.vel.z += dir.z * 3;
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    const g = this.game, i = this.list.indexOf(e); if (i < 0) return;
    this.list.splice(i, 1); this.group.remove(e.group);
    const drop = (id, p = 1, n = 1) => { if (Math.random() < p) for (let k = 0; k < n; k++) g.pickups.spawn(id, e.pos.x, e.pos.y + 0.8, e.pos.z, true); };
    if (e.type === 'trojan') { drop('circuit_scrap', 1, 1 + (Math.random() < 0.5 ? 1 : 0)); drop('encryption_shard', 0.3); drop('data_crystal', 0.3); drop('firewall_chip', 0.15); drop('energy_cell', 0.15); if (g.zone.id === 2) drop('ram_fragment', 0.75, 1 + (Math.random() < 0.4 ? 1 : 0)); }
    else { drop('energy_cell', 0.65); drop('firewall_chip', 0.5); drop('circuit_scrap', 0.5); }
    g.stats.kills++; if (g.stats.kills % 4 === 0) { g.stats.level++; g.hud.toast('Seviye ' + g.stats.level + '! Tehditler güçleniyor', 2200); }
    g.hud.toast(e.def.name + ' etkisizleştirildi', 1200); g.hud.refresh(); g.requestSave();
  }

  update(dt) {
    const g = this.game, p = g.player, pc = p.center, lvl = g.stats.level;
    const Z = g.zone.enemy, zt = g.zoneTime;
    this.spawnT -= dt;
    const maxE = Math.min(Z.cap, Z.base + Math.floor(zt / Z.grow) + (lvl - 1) * Z.lvlStep);
    if (this.spawnT <= 0) {
      this.spawnT = Math.max(Z.minInterval, Z.interval - lvl * 0.4);
      if (this.list.length < maxE) this.spawnAround(zt > Z.spamAfter && Math.random() < Z.spamChance ? 'spam' : 'trojan');
    }
    // Trojan Yuvaları: oyuncu yakınsa periyodik Trojan üretir
    if (Z.nestInterval) for (const n of g.nests) {
      const k = n.x + ',' + n.z; this.nestT[k] = (this.nestT[k] ?? 4) - dt;
      if (this.nestT[k] > 0) continue;
      const near = this.list.filter((e) => Math.hypot(e.pos.x - n.x, e.pos.z - n.z) < 16).length;
      if (Math.hypot(p.pos.x - n.x, p.pos.z - n.z) < 46 && near < 3 && this.list.length < Z.cap + 3) {
        this.nestT[k] = Z.nestInterval; this.spawn('trojan', n.x + 0.5 + (Math.random() - 0.5) * 5, n.z + 0.5 + (Math.random() - 0.5) * 5);
      } else this.nestT[k] = 2;
    }
    for (const e of [...this.list]) {
      if (g.inSafe(e.pos.x, e.pos.z)) { this.purge(e); g.hud.toast('Güvenli alan düşmanı temizledi', 1200); continue; }
      e.t += dt; const dx = pc.x - e.pos.x, dz = pc.z - e.pos.z, dist = Math.hypot(dx, dz) || 0.001, nx = dx / dist, nz = dz / dist;
      if (e.type === 'trojan') {
        const speed = Math.min(Z.speed + lvl * 0.12, 3.6);
        const chase = dist < 30 && dist > 1.1;
        e.vel.x += ((chase ? nx * speed : 0) - e.vel.x) * Math.min(1, dt * 8); e.vel.z += ((chase ? nz * speed : 0) - e.vel.z) * Math.min(1, dt * 8);
        e.vel.y = Math.max(-30, e.vel.y - 26 * dt);
        const wasG = e.onGround; stepBody(g.world, e, dt);
        if ((e.hitX || e.hitZ) && wasG && e.onGround) e.vel.y = 8; // takılırsa zıpla
        e.cd -= dt;
        if (dist < 1.45 && Math.abs(pc.y - e.pos.y - 0.9) < 1.6 && e.cd <= 0) { e.cd = 1.1; if (p.damage(Z.dmg + Math.min(lvl - 1, Z.dmgCap))) g.hud.flashDamage(); }
        e.body.rotation.y = Math.atan2(nx, nz);
        e.legs.forEach((l, i) => { l.position.y = 0.2 + (Math.sin(e.t * 9 + i * 1.6) * 0.06) * Math.min(1, Math.hypot(e.vel.x, e.vel.z)); });
      } else { // Spam Bot: mesafeyi korur, uçar, spam küresi atar
        const want = dist < 8 ? -1 : dist > 13 ? 1 : 0;
        const strafe = Math.sin(e.t * 0.7) * e.dir;
        const tx = (nx * want + -nz * strafe * 0.6) * 2.6, tz = (nz * want + nx * strafe * 0.6) * 2.6;
        e.vel.x += (tx - e.vel.x) * Math.min(1, dt * 4); e.vel.z += (tz - e.vel.z) * Math.min(1, dt * 4);
        const ty = Math.max(g.world.surfaceY(e.pos.x, e.pos.z) + 1.5, p.pos.y + 2.6) + Math.sin(e.t * 2) * 0.3;
        e.vel.y = Math.max(-4, Math.min(4, (ty - e.pos.y) * 2));
        stepBody(g.world, e, dt);
        e.body.rotation.y = Math.atan2(nx, nz); e.legs[0].rotation.z = Math.sin(e.t * 10) * 0.4; e.legs[1].rotation.z = -Math.sin(e.t * 10) * 0.4;
        e.shoot -= dt;
        if (e.shoot <= 0 && dist < 26) {
          e.shoot = Math.max(1.6, 3 - lvl * 0.15);
          const from = e.center, to = pc.clone().sub(from), len = to.length();
          const blk = g.world.raycast(from.x, from.y, from.z, to.x / len, to.y / len, to.z / len, len - 0.5);
          if (!blk) g.combat.fire(from, to, true);
        }
      }
      // sağlık çubuğu: kameraya bakar
      e.group.position.copy(e.pos); e.bar.quaternion.copy(g.camera.quaternion).premultiply(e.group.quaternion.clone().invert());
      const r = Math.max(0.001, e.hp / e.max); e.bar.userData.fg.scale.set(r, 1, 1); e.bar.userData.fg.position.x = -(1 - r) * 0.5;
      e.bar.visible = e.hp < e.max || dist < 12;
      if (e.pos.y < -10) e.pos.y = g.world.surfaceY(e.pos.x, e.pos.z) + 2;
    }
  }
}
