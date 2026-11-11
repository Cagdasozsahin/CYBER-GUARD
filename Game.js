import * as THREE from 'three';
import { WORLD, B, BLOCKS, ITEMS, PLAYER, SPAWN, SAFE_RADIUS } from './constants.js';
import { ZONES, zoneById } from './Zones.js';
import { makeAtlas, makeMaterials } from './Atlas.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Input } from './Input.js';
import { Inventory } from './Inventory.js';
import { Crafting } from './Crafting.js';
import { Enemies } from './Enemies.js';
import { Combat } from './Combat.js';
import { Pickups } from './Pickups.js';
import { SaveManager } from './SaveManager.js';
import { HUD } from '../ui/HUD.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.1;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x061321); this.scene.fog = new THREE.Fog(0x061321, 30, 90);
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 200);
    this.hemi = new THREE.HemisphereLight(0x9fe8ff, 0x24355a, 2.4); this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xbdf3ff, 1.7); sun.position.set(30, 60, 20); this.scene.add(sun);

    this.world = new World(makeMaterials(makeAtlas())); this.scene.add(this.world.group);
    this.player = new Player(); this.scene.add(this.player.model);
    this.inventory = new Inventory(24); this.vault = new Inventory(12); this.crafting = new Crafting(this.inventory);
    this.zone = ZONES[0]; this.unlocked = [1]; this.completed = []; this.zoneData = {}; this.nests = []; this.safeCenters = []; this.zoneTime = 0;
    this.pickups = new Pickups(this); this.combat = new Combat(this); this.enemies = new Enemies(this);
    this.hud = new HUD(this); this.input = new Input(canvas);

    this.selected = 0; this.stats = { kills: 0, level: 1, time: 0 };
    this.state = 'menu'; this.begun = false; this.sens = 0.0022;
    this.breaking = null; this.placeCool = 0; this.saveQueued = false; this.lastSave = 0; this.autoSave = 0; this.hudT = 0;

    this.outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)), new THREE.LineBasicMaterial({ color: 0xffffff }));
    this.outline.visible = false; this.scene.add(this.outline);
    this.motes = this._makeMotes();
    this.safeGroup = new THREE.Group(); this.scene.add(this.safeGroup);

    this._bindUI(); this._showStartMenu();
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });
    addEventListener('beforeunload', () => { if (this.begun && this.player.hp > 0) this.save(); });
    this.clock = new THREE.Clock(); this._loop = this._loop.bind(this); this._loop();
  }

  _makeMotes() {
    const n = 350, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = Math.random() * WORLD.W; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = Math.random() * WORLD.D; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x54e7ff, size: 0.14, transparent: true, opacity: 0.7, fog: true })); this.scene.add(p); return p;
  }

  // ---------- bölge / güvenli alan ----------
  _atmosphere(z) {
    this.scene.background.setHex(z.sky); this.scene.fog.color.setHex(z.sky); this.scene.fog.near = z.fog[0]; this.scene.fog.far = z.fog[1];
    this.hemi.color.setHex(z.hemi[0]); this.hemi.groundColor.setHex(z.hemi[1]); this.motes.material.color.setHex(z.motes);
  }
  inSafe(x, z) { for (const c of this.safeCenters) if ((x - c.x) ** 2 + (z - c.z) ** 2 <= SAFE_RADIUS * SAFE_RADIUS) return true; return false; }
  refreshWorldState() { // dünyadaki özel blokları tara: yuvalar + güvenli alan jeneratörleri
    this.nests = this.world.findAll(B.NEST);
    this.safeCenters = this.world.findAll(B.GENERATOR).map((g) => ({ x: g.x + 0.5, y: g.y, z: g.z + 0.5 }));
    for (const m of [...this.safeGroup.children]) { this.safeGroup.remove(m); m.geometry.dispose(); }
    const mat = this._safeMat ??= new THREE.MeshBasicMaterial({ color: 0x5dffd6, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, fog: false });
    for (const c of this.safeCenters) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(SAFE_RADIUS, SAFE_RADIUS, 22, 64, 1, true), mat); m.position.set(c.x, c.y + 6, c.z); this.safeGroup.add(m);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(SAFE_RADIUS, 0.12, 6, 96), new THREE.MeshBasicMaterial({ color: 0x5dffd6, fog: false })); ring.rotation.x = Math.PI / 2; ring.position.set(c.x, c.y + 0.3, c.z); this.safeGroup.add(ring);
    }
  }

  _zoneButtons() {
    return ZONES.map((z) => ({ id: z.id, name: z.name, desc: z.desc, done: this.completed.includes(z.id),
      state: z.id === this.zone.id ? 'current' : !this.unlocked.includes(z.id) ? 'locked' : !z.playable ? 'soon' : 'open' }));
  }

  enterZone(id, saved) {
    if (this.begun && this.zone) this.zoneData[this.zone.id] = { edits: [...this.world.edits] };
    const zone = zoneById(id); this.zone = zone; this.zoneTime = 0;
    this.world.generate(zone);
    const zd = this.zoneData[id]; if (zd?.edits) this.world.applyEdits(zd.edits);
    this.world.buildAll(); this._atmosphere(zone);
    this.enemies.clear(); this.enemies.nestT = {}; this.enemies.spawnT = 14; this.combat.clear(); this.pickups.clear();
    if (!this.completed.includes(id) || id === 1) this.pickups.scatter(this.world, zone.pickups);
    this.refreshWorldState();
    const p = this.player; p.slow = 0; p.invuln = 1;
    if (saved) p.teleport(Math.max(1, Math.min(WORLD.W - 1, saved.x)), Math.max(1, Math.min(WORLD.H - 3, saved.y)), Math.max(1, Math.min(WORLD.D - 1, saved.z)), this.world);
    else this.respawnPos();
    for (let i = 0; i < zone.enemy.start; i++) this.enemies.spawnAround('trojan', 24, 32);
    this.hud.refresh();
  }
  gotoZone(id) {
    const z = zoneById(id); if (!z?.playable || !this.unlocked.includes(id) || id === this.zone.id) return;
    this.enterZone(id); this.save(); this.hud.toast(`${id}. Bölge: ${z.name}`, 2600); this.resume();
  }
  completeZone() {
    const z = this.zone; if (this.completed.includes(z.id)) return;
    this.completed.push(z.id); const next = z.id + 1; if (zoneById(next) && !this.unlocked.includes(next)) this.unlocked.push(next);
    this.save(); this.state = 'menu'; this.input.unlock(); this.hud.setBreak(null);
    this.hud.showMenu({ title: 'BÖLÜM TAMAMLANDI', text: `${z.name}: ${z.completeText}`, play: 'BURADA DEVAM ET', hasSave: true, canNew: false, zones: this._zoneButtons() });
  }

  // ---------- menü / durum ----------
  _showStartMenu() {
    const has = SaveManager.exists(); this.state = 'menu';
    this.hud.showMenu({ title: 'CYBER GUARD', ver: 'v0.3 · bölgeler', hasSave: has, canNew: has, play: has ? 'DEVAM ET' : 'OYUNA BAŞLA',
      text: 'Bilgisayarın içindeki bloklu dijital dünyaya hoş geldin. Kaynak topla, Antivirus Blaster üret, Trojan ve Spam Bot saldırılarını durdur, Safe Zone Generator ile güvenli alan kur ve yeni bölgelere geç.' });
  }
  _pauseMenu() {
    this.state = 'menu';
    this.hud.showMenu({ title: 'DURAKLATILDI', text: 'Oyun otomatik kaydedilir.', play: 'DEVAM ET', hasSave: true, canNew: true, zones: this._zoneButtons() });
  }
  _bindUI() {
    const h = this.hud, inp = this.input;
    h.onPlay = () => { if (this.state === 'dead') return this.respawn(); if (!this.begun) this.start(false); this.resume(); };
    h.onNew = () => { this.start(true); this.resume(); };
    h.onDelete = () => { SaveManager.clear(); this.begun = false; this._showStartMenu(); };
    h.onZone = (id) => this.gotoZone(id);
    inp.onLockChange = (locked) => { if (!locked && this.state === 'playing') { this.save(); this._pauseMenu(); } };
    inp.onLockError = () => { if (this.state === 'playing') this._pauseMenu(); };
    inp.onKeyDown = (code) => this._onKey(code);
  }
  resume() { this.state = 'playing'; this.hud.hideMenu(); this.hud.refresh(); this.input.lock(); }

  _onKey(code) {
    if (this.state === 'panel') {
      if (code === 'Escape') { this.hud.closePanel(); this._pauseMenu(); }
      else if (code === 'Tab' || code === 'KeyI' || code === 'KeyC' || (code === 'KeyE' && this.hud.mode === 'vault')) { this.hud.closePanel(); this.resume(); }
      return;
    }
    if (this.state !== 'playing') return;
    if (code.startsWith('Digit')) { const n = +code.slice(5); if (n >= 1 && n <= 8) { this.selected = n - 1; this.hud.refresh(); } }
    else if (code === 'Tab' || code === 'KeyI' || code === 'KeyC') this._openPanel('inv');
    else if (code === 'KeyE') {
      const p = this.player.pos, v = this.world.findVault(p.x, p.y, p.z, 4);
      if (v) this._openPanel('vault'); else this.hud.toast('Yakında Secure Vault yok');
    }
  }
  _openPanel(mode) { this.state = 'panel'; this.input.unlock(); this.hud.setBreak(null); this.breaking = null; this.hud.openPanel(mode); }

  // ---------- yeni oyun / yükleme ----------
  start(fresh) {
    const save = fresh ? null : SaveManager.load();
    if (fresh) SaveManager.clear();
    this.begun = false; // enterZone eski bölgeyi kaydetmesin
    this.unlocked = save?.unlocked?.length ? save.unlocked : [1]; this.completed = save?.completed ?? []; this.zoneData = save?.zoneData ?? {};
    this.inventory.fromJSON(save?.inv); this.vault.fromJSON(save?.vault);
    this.selected = Number.isInteger(save?.selected) ? Math.max(0, Math.min(7, save.selected)) : 0;
    this.stats = { kills: save?.stats?.kills | 0, level: Math.max(1, save?.stats?.level | 0 || 1), time: Number(save?.stats?.time) || 0 };
    const p = this.player; p.hp = save ? Math.max(1, Math.min(PLAYER.HP, save.player.hp)) : PLAYER.HP;
    const zid = zoneById(save?.zone)?.playable ? save.zone : 1;
    this.enterZone(zid, save && zid === save.zone ? save.player : null);
    this.begun = true; this.hud.refresh();
    if (!save) this.save();
  }
  respawnPos() { const x = SPAWN.x + 0.5, z = SPAWN.z + 0.5; this.player.teleport(x, this.world.surfaceY(x, z), z, this.world); }

  die() {
    this.state = 'dead'; this.input.unlock(); this.hud.setBreak(null);
    this.hud.showMenu({ title: 'SİSTEM ÇÖKTÜ', text: 'Güvenlik robotun devre dışı kaldı. Envanterin korundu; bölgenin başlangıç noktasında yeniden doğabilirsin.', play: 'YENİDEN DOĞ', hasSave: false, canNew: false });
  }
  respawn() {
    const p = this.player; p.hp = p.maxHp; p.slow = 0; p.invuln = 2; this.respawnPos();
    this.enemies.clear(); this.combat.clear(); this.enemies.spawnT = 12;
    this.hud.toast('Yeniden doğdun.', 2200); this.resume(); this.save();
  }

  // ---------- kayıt ----------
  requestSave() { this.saveQueued = true; }
  save() {
    if (!this.begun || this.player.hp <= 0) return false;
    this.lastSave = performance.now(); this.saveQueued = false;
    this.zoneData[this.zone.id] = { edits: [...this.world.edits] };
    const p = this.player.pos;
    return SaveManager.save({ zone: this.zone.id, unlocked: this.unlocked, completed: this.completed, zoneData: this.zoneData,
      player: { x: p.x, y: p.y, z: p.z, hp: this.player.hp }, inv: this.inventory.toJSON(), vault: this.vault.toJSON(), selected: this.selected, stats: this.stats });
  }

  // ---------- oynanış ----------
  _target() {
    const c = this.camera.position, d = this.player.camDir;
    const hit = this.world.raycast(c.x, c.y, c.z, d.x, d.y, d.z, 5.2 + PLAYER.REACH);
    if (!hit || hit.dist < 0.3) return null;
    const pt = new THREE.Vector3(c.x + d.x * hit.dist, c.y + d.y * hit.dist, c.z + d.z * hit.dist);
    return pt.distanceTo(this.player.center) <= PLAYER.REACH ? hit : null;
  }

  _mine(t) {
    const def = BLOCKS[t.id]; if (!def?.drop) return;
    if (t.id === B.VAULT && !this.vault.isEmpty()) { this.hud.toast('Kasa dolu: önce eşyaları çıkar'); this.breaking = null; this.hud.setBreak(null); return; }
    this.world.setBlock(t.x, t.y, t.z, B.AIR, true);
    const n = (def.dropMin ?? 1) + Math.floor(Math.random() * ((def.dropMax ?? 1) - (def.dropMin ?? 1) + 1));
    const left = this.inventory.add(def.drop, n);
    for (let i = 0; i < left; i++) this.pickups.spawn(def.drop, t.x + 0.5, t.y + 0.6, t.z + 0.5, true);
    if (!left) this.hud.pickupToast(def.drop);
    if (t.id === B.NEST || t.id === B.GENERATOR) {
      this.refreshWorldState();
      if (t.id === B.NEST) { this.hud.toast(this.nests.length ? `Trojan Yuvası yıkıldı! Kalan: ${this.nests.length}` : 'Son Trojan Yuvası yıkıldı!', 2400); if (this.zone.goal === 'nests' && !this.nests.length) { this.hud.refresh(); this.requestSave(); return this.completeZone(); } }
    }
    this.hud.refresh(); this.requestSave();
  }

  _place(t) { // başarıyla işlem yaptıysa true
    const s = this.inventory.slots[this.selected]; if (!s) return false;
    const it = ITEMS[s.id];
    if (s.id === 'repair_kit') { if (this.player.hp < this.player.maxHp) { this.player.heal(35); this.inventory.takeFromSlot(this.selected); this.hud.toast('Sistem onarıldı: +35 can'); this.hud.refresh(); return true; } return false; }
    if (!it.block || !t) return false;
    const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz;
    if (!this.world.inBounds(x, y, z) || this.world.get(x, y, z) !== B.AIR) return false;
    const p = this.player.pos, hw = this.player.hw;
    // oyuncunun içine konmaz; ama zıplayıp ayağın bloğun üstündeyse (Minecraft "pillar") konabilir
    if (x + 1 > p.x - hw && x < p.x + hw && z + 1 > p.z - hw && z < p.z + hw && y + 1 > p.y + 0.01 && y < p.y + this.player.h) return false;
    this.world.setBlock(x, y, z, it.block, true); this.inventory.takeFromSlot(this.selected);
    if (it.block === B.GENERATOR) {
      this.refreshWorldState(); this.hud.toast('Safe Zone Generator aktif: 50 blokluk güvenli alan!', 3000);
      this.hud.refresh(); this.save();
      if (this.zone.goal === 'safezone') this.completeZone();
      return true;
    }
    this.hud.refresh(); this.requestSave(); return true;
  }

  _tick(dt) {
    const inp = this.input, p = this.player; this.stats.time += dt; this.zoneTime += dt;
    const look = inp.consumeLook(); p.look(look.dx, look.dy, this.sens);
    const w = inp.consumeWheel(); if (w) { this.selected = (this.selected + w + 8) % 8; this.hud.refresh(); }
    const sel = this.inventory.slots[this.selected];
    p.update(dt, inp, this.world, { active: true, hasBlaster: sel?.id === 'blaster' });
    p.updateCamera(this.camera, this.world);

    const t = this._target();
    this.outline.visible = !!t; if (t) this.outline.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5);
    if (inp.left) {
      if (sel?.id === 'blaster') { this.combat.shootPlayer(); this.breaking = null; this.hud.setBreak(null); }
      else if (t && BLOCKS[t.id]?.hard < Infinity) {
        const key = t.x + ',' + t.y + ',' + t.z;
        if (this.breaking?.key !== key) this.breaking = { key, t: 0 };
        this.breaking.t += dt; const prog = this.breaking.t / BLOCKS[t.id].hard; this.hud.setBreak(prog);
        if (prog >= 1) { this.breaking = null; this.hud.setBreak(null); this._mine(t); }
      } else { this.breaking = null; this.hud.setBreak(null); }
    } else if (this.breaking) { this.breaking = null; this.hud.setBreak(null); }
    this.placeCool = Math.max(0, this.placeCool - dt);
    if (inp.right && this.placeCool <= 0) {
      const kit = sel?.id === 'repair_kit';
      if (!kit || inp.wasPressed('Mouse2')) this.placeCool = this._place(t) ? 0.18 : 0.04; // başarısızsa her karede yeniden dene (zıplama penceresi)
    }

    this.enemies.update(dt); this.combat.update(dt); this.pickups.update(dt, this.stats.time);
    if (this.safeCenters.length && this.inSafe(p.pos.x, p.pos.z) && p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + 3 * dt); }
    if (p.hp <= 0) { this.hud.refresh(); this.die(); return; }
    this.hudT += dt; if (this.hudT > 0.5) { this.hudT = 0; this.hud.refresh(); }
    this.autoSave += dt; if (this.autoSave > 20) { this.autoSave = 0; this.save(); }
  }

  _loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.state === 'playing') this._tick(dt);
    if (this.begun && this.saveQueued && performance.now() - this.lastSave > 1500) this.save();
    this.world.flush();
    const mp = this.motes.geometry.attributes.position;
    for (let i = 0; i < mp.count; i++) { let y = mp.getY(i) + dt * 0.6; if (y > 30) y = 0; mp.setY(i, y); } mp.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}
