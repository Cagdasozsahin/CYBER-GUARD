import * as THREE from 'three';
import { ITEMS, WORLD, SPAWN } from './constants.js';

const geo = new THREE.BoxGeometry(1, 1, 1);
const matCache = {};
const matFor = (id) => matCache[id] ??= new THREE.MeshBasicMaterial({ color: new THREE.Color(ITEMS[id].color) });

// Yerdeki toplanabilir kaynaklar (otomatik toplanır, yaklaşınca oyuncuya çekilir)
export class Pickups {
  constructor(game) { this.game = game; this.list = []; this.group = new THREE.Group(); game.scene.add(this.group); }

  spawn(id, x, y, z, burst = false) {
    const mesh = new THREE.Mesh(geo, matFor(id)); mesh.scale.setScalar(0.38);
    mesh.position.set(x, y, z); mesh.rotation.set(0.4, Math.random() * 6, 0.3);
    this.group.add(mesh);
    this.list.push({ id, mesh, vy: burst ? 4 + Math.random() * 2 : 0, vx: burst ? (Math.random() - 0.5) * 3 : 0, vz: burst ? (Math.random() - 0.5) * 3 : 0, phase: Math.random() * 6, landed: !burst, age: 0 });
  }

  scatter(world, cfg) {
    const place = (id, minD) => {
      for (let t = 0; t < 30; t++) {
        const x = 2 + Math.random() * (WORLD.W - 4), z = 2 + Math.random() * (WORLD.D - 4), d = Math.hypot(x - SPAWN.x, z - SPAWN.z);
        if (d < Math.max(5, minD) || d > (minD ? 22 : 999)) continue;
        const y = world.surfaceY(x, z); if (y > 20) continue;
        this.spawn(id, x, y + 0.6, z); return;
      }
    };
    for (let i = 0; i < cfg.n; i++) place(cfg.types[(Math.random() * cfg.types.length) | 0], 0);
    for (const [id, n] of cfg.extra || []) for (let i = 0; i < n; i++) place(id, 8); // garanti özel kaynaklar (spawn'a yakın)
  }

  clear() { for (const p of this.list) this.group.remove(p.mesh); this.list.length = 0; }

  update(dt, t) {
    const g = this.game, pc = g.player.center;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i], m = p.mesh; p.age += dt;
      m.rotation.y += dt * 1.4;
      if (!p.landed) {
        p.vy -= 20 * dt; m.position.x += p.vx * dt; m.position.z += p.vz * dt; m.position.y += p.vy * dt;
        const ground = g.world.surfaceY(m.position.x, m.position.z) + 0.35;
        if (m.position.y <= ground) { m.position.y = ground; p.landed = true; p.base = ground + 0.25; }
      } else {
        p.base ??= m.position.y; m.position.y = p.base + Math.sin(t * 2 + p.phase) * 0.1;
      }
      const d = m.position.distanceTo(pc);
      if (p.age > 0.5 && d < 2.4 && g.inventory.canAdd(p.id, 1)) {
        m.position.addScaledVector(pc.clone().sub(m.position).normalize(), Math.min(d, 9 * dt)); p.landed = true; p.base = undefined;
        if (d < 0.9) { g.inventory.add(p.id, 1); g.hud.pickupToast(p.id); this.group.remove(m); this.list.splice(i, 1); g.hud.refresh(); }
      }
    }
  }
}
