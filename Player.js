import * as THREE from 'three';
import { PLAYER } from './constants.js';
import { stepBody, unstick } from './Physics.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

// Özgün bloklu güvenlik robotu: grafit zırh, cyan çekirdek, anten
function buildRobot() {
  const armor = new THREE.MeshStandardMaterial({ color: 0x7088a4, emissive: 0x0b1a2c, roughness: 0.45, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a4658, emissive: 0x08111c, roughness: 0.6, metalness: 0.25 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x54e7ff });
  const g = new THREE.Group();
  const torso = box(0.62, 0.7, 0.36, armor); torso.position.y = 0.95; g.add(torso);
  const belt = box(0.66, 0.1, 0.4, dark); belt.position.y = 0.66; g.add(belt);
  const core = box(0.22, 0.22, 0.06, glow); core.position.set(0, 1.0, 0.19); g.add(core);
  const pack = box(0.4, 0.45, 0.14, dark); pack.position.set(0, 1.0, -0.25); g.add(pack);
  const packGlow = box(0.28, 0.06, 0.16, glow); packGlow.position.set(0, 1.05, -0.25); g.add(packGlow);
  const head = box(0.5, 0.42, 0.44, armor); head.position.y = 1.5; g.add(head);
  const visor = box(0.38, 0.12, 0.05, glow); visor.position.set(0, 1.52, 0.23); g.add(visor);
  const ant = box(0.04, 0.26, 0.04, dark); ant.position.set(0.14, 1.85, 0); g.add(ant);
  const tip = box(0.09, 0.09, 0.09, glow); tip.position.set(0.14, 2.0, 0); g.add(tip);
  const mkLimb = (x, y, w, h, mat) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = box(w, h, w, mat); m.position.y = -h / 2; p.add(m); g.add(p); return p; };
  const legL = mkLimb(-0.15, 0.62, 0.24, 0.62, dark), legR = mkLimb(0.15, 0.62, 0.24, 0.62, dark);
  const armL = mkLimb(-0.43, 1.25, 0.17, 0.6, armor), armR = mkLimb(0.43, 1.25, 0.17, 0.6, armor);
  const band = box(0.19, 0.06, 0.19, glow); band.position.y = -0.5; armL.add(band); armR.add(band.clone());
  const gun = box(0.12, 0.14, 0.5, dark); gun.position.set(0, -0.55, 0.22); const gunTip = box(0.08, 0.08, 0.06, glow); gunTip.position.set(0, 0, 0.28); gun.add(gunTip);
  armR.add(gun); gun.visible = false;
  return { group: g, legL, legR, armL, armR, gun };
}

export class Player {
  constructor() {
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.hw = 0.3; this.h = 1.7; this.onGround = false; this.hitX = false; this.hitZ = false;
    this.hp = PLAYER.HP; this.maxHp = PLAYER.HP;
    this.yaw = 0; this.pitch = 0.15; this.modelYaw = 0;
    this.slow = 0; this.invuln = 0; this.phase = 0; this.faceTimer = 0;
    this.robot = buildRobot(); this.model = this.robot.group;
    this.moving = false;
  }
  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + 0.9, this.pos.z); }

  teleport(x, y, z, world) { this.pos.set(x, y, z); this.vel.set(0, 0, 0); if (world) unstick(world, this.pos, this.hw, this.h); this.model.position.copy(this.pos); }

  damage(n) {
    if (this.invuln > 0 || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - n); this.invuln = 0.45; return true;
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  look(dx, dy, sens) {
    this.yaw -= dx * sens; this.pitch -= dy * sens;
    this.pitch = Math.max(-1.5, Math.min(1.2, this.pitch)); // neredeyse dik aşağı bakabilir
  }

  update(dt, input, world, { active, hasBlaster }) {
    this.slow = Math.max(0, this.slow - dt); this.invuln = Math.max(0, this.invuln - dt); this.faceTimer = Math.max(0, this.faceTimer - dt);
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const fx = -s, fz = -c, rx = c, rz = -s;
    let mx = 0, mz = 0;
    if (active) {
      if (input.down('KeyW')) { mx += fx; mz += fz; } if (input.down('KeyS')) { mx -= fx; mz -= fz; }
      if (input.down('KeyD')) { mx += rx; mz += rz; } if (input.down('KeyA')) { mx -= rx; mz -= rz; }
    }
    const len = Math.hypot(mx, mz); this.moving = len > 0;
    if (len > 0) { mx /= len; mz /= len; }
    const sprint = active && (input.down('ShiftLeft') || input.down('ShiftRight'));
    const speed = (sprint ? PLAYER.SPRINT : PLAYER.WALK) * (this.slow > 0 ? 0.5 : 1);
    const k = Math.min(1, dt * (this.onGround ? 16 : 5));
    this.vel.x += (mx * speed - this.vel.x) * k; this.vel.z += (mz * speed - this.vel.z) * k;
    this.vel.y = Math.max(-30, this.vel.y - PLAYER.GRAVITY * dt);
    const wasGround = this.onGround;
    if (active && input.wasPressed('Space') && this.onGround) { this.vel.y = PLAYER.JUMP; this.onGround = false; }
    stepBody(world, this, dt);
    if ((this.hitX || this.hitZ) && wasGround && this.moving && this.vel.y <= 0 && this.onGround) this.vel.y = 8.0; // otomatik zıplama (1 blok basamak)

    // model yönü + animasyon
    const r = this.robot;
    if (this.moving || this.faceTimer > 0) {
      const target = this.faceTimer > 0 ? Math.atan2(fx, fz) : Math.atan2(mx, mz);
      let d = target - this.modelYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.modelYaw += d * Math.min(1, dt * 14);
    }
    const hv = Math.hypot(this.vel.x, this.vel.z);
    this.phase += hv * dt * 1.7;
    const sw = this.onGround ? Math.sin(this.phase) * Math.min(1, hv / 4) * 0.8 : 0.5;
    r.legL.rotation.x = sw; r.legR.rotation.x = -sw;
    r.gun.visible = hasBlaster;
    r.armL.rotation.x = -sw * 0.8;
    r.armR.rotation.x = hasBlaster ? -1.45 : sw * 0.8;
    this.model.position.copy(this.pos); this.model.rotation.y = this.modelYaw;
    this.model.position.y += this.onGround && hv > 1 ? Math.abs(Math.sin(this.phase)) * 0.04 : 0;
  }

  // Omuz üstü 3. şahıs kamera; duvarın içine girmez.
  updateCamera(camera, world) {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dx = -Math.sin(this.yaw) * cp, dy = sp, dz = -Math.cos(this.yaw) * cp;
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const hx = this.pos.x, hy = this.pos.y + 1.55, hz = this.pos.z;
    // aşağı bakarken omuz kayması azalır: kamera tam başın üstüne gelir, ayak altındaki blok hedeflenebilir
    let side = 0.85 * Math.min(1, Math.max(0, (this.pitch + 1.45) / 0.85));
    const sh = world.raycast(hx, hy, hz, rx, 0, rz, side + 0.2);
    if (sh) side = Math.min(side, Math.max(0, sh.dist - 0.25));
    const px = hx + rx * side, py = hy, pz = hz + rz * side;
    let dist = 5.2;
    const hit = world.raycast(px, py, pz, -dx, -dy, -dz, dist + 0.3);
    if (hit) dist = Math.max(0.6, hit.dist - 0.3);
    camera.position.set(px - dx * dist, py - dy * dist, pz - dz * dist);
    camera.rotation.order = 'YXZ'; camera.rotation.set(this.pitch, this.yaw, 0);
    this.camDir = new THREE.Vector3(dx, dy, dz);
  }

  get muzzle() {
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw), fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    return new THREE.Vector3(this.pos.x + rx * 0.4 + fx * 0.55, this.pos.y + 1.1, this.pos.z + rz * 0.4 + fz * 0.55);
  }
}
