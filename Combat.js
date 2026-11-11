import * as THREE from 'three';

const geo = new THREE.SphereGeometry(0.14, 8, 8);
const matP = new THREE.MeshBasicMaterial({ color: 0x8fffff });
const matE = new THREE.MeshBasicMaterial({ color: 0xff5ad8 });

// Antivirus Blaster mermileri + Spam Bot küreleri
export class Combat {
  constructor(game) { this.game = game; this.shots = []; this.cool = 0; this.group = new THREE.Group(); game.scene.add(this.group); }

  fire(from, dir, enemyOrb) {
    const mesh = new THREE.Mesh(geo, enemyOrb ? matE : matP); if (enemyOrb) mesh.scale.setScalar(1.6);
    mesh.position.copy(from); this.group.add(mesh);
    this.shots.push({ mesh, dir: dir.clone().normalize(), speed: enemyOrb ? 11 : 42, life: enemyOrb ? 4 : 1.6, enemy: !!enemyOrb });
  }

  // Oyuncu ateşi: nişangahın baktığı noktaya doğru
  shootPlayer() {
    if (this.cool > 0) return false;
    const g = this.game, p = g.player, cam = g.camera;
    const d = p.camDir; const hit = g.world.raycast(cam.position.x, cam.position.y, cam.position.z, d.x, d.y, d.z, 60);
    let dist = hit ? hit.dist : 60;
    // nişan ışını bir düşmana değiyorsa en yakınına nişan al (zemine değil)
    for (const e of g.enemies.list) {
      const oc = e.center.sub(cam.position), tc = oc.dot(d); if (tc < 1 || tc > dist) continue;
      const r = e.radius + 0.2; if (oc.lengthSq() - tc * tc <= r * r) dist = tc;
    }
    const aim = cam.position.clone().addScaledVector(d, Math.max(dist, 6));
    const m = p.muzzle; this.fire(m, aim.sub(m));
    this.cool = 0.24; p.faceTimer = 0.5; return true;
  }

  clear() { for (const s of this.shots) this.group.remove(s.mesh); this.shots.length = 0; }

  update(dt) {
    this.cool = Math.max(0, this.cool - dt);
    const g = this.game, pc = g.player.center;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]; let dead = false; s.life -= dt;
      const total = s.speed * dt, steps = Math.max(1, Math.ceil(total / 0.35)), step = total / steps;
      for (let k = 0; k < steps && !dead; k++) {
        s.mesh.position.addScaledVector(s.dir, step);
        const p = s.mesh.position;
        if (g.world.get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) !== 0) { dead = true; break; }
        if (s.enemy) {
          if (g.inSafe(p.x, p.z)) { dead = true; break; }
          if (p.distanceTo(pc) < 0.75) { if (g.player.damage(4)) g.hud.flashDamage(); g.player.slow = 2.5; g.hud.toast('Spam paketi! Yavaşladın', 1200); dead = true; }
        } else {
          for (const e of g.enemies.list) if (p.distanceTo(e.center) < e.radius + 0.15) { g.enemies.hit(e, 1); dead = true; break; }
        }
      }
      if (dead || s.life <= 0) { this.group.remove(s.mesh); this.shots.splice(i, 1); }
    }
  }
}
