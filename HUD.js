import { ITEMS, maxStack } from '../game/constants.js';

const $ = (id) => document.getElementById(id);
const RES = ['data_crystal', 'circuit_scrap', 'encryption_shard', 'firewall_chip', 'energy_cell'];

export class HUD {
  constructor(game) {
    this.game = game; this.cursor = null; this.mode = null; this.toastT = 0; this.last = '';
    this.el = { res: $('res'), stats: $('stats'), obj: $('objective'), hot: $('hotbar'), toast: $('toast'), dmg: $('dmg'), brk: $('breakbar'), wrap: $('panelWrap'), box: $('panelBox'), cur: $('cursorItem'), overlay: $('overlay') };
    this.el.wrap.addEventListener('mousemove', (e) => { this.el.cur.style.left = e.clientX + 'px'; this.el.cur.style.top = e.clientY + 'px'; });
    this.el.wrap.addEventListener('contextmenu', (e) => e.preventDefault());
    $('btnPlay').onclick = () => this.onPlay?.(); $('btnNew').onclick = () => this.onNew?.(); $('btnDelete').onclick = () => this.onDelete?.();
    this.onZone = null;
  }

  icon(id) { const it = ITEMS[id]; return `<div class="icon" style="background:${it.color}">${it.short}</div>`; }
  slotHTML(s, extra = '') { return s ? `${this.icon(s.id)}${s.count > 1 ? `<span class="n">${s.count}</span>` : ''}${extra}` : extra; }

  // ---------- oyun içi HUD ----------
  refresh() {
    const g = this.game, inv = g.inventory, p = g.player;
    this.el.res.innerHTML = '<b style="color:var(--cyan);letter-spacing:1px;font-size:11px">KAYNAKLAR</b>' + RES.map((id) => `<div class="row"><span>${ITEMS[id].name}</span><span class="val">${inv.count(id)}</span></div>`).join('');
    const st = p.hp > 65 ? ['STABLE', '#68ffb0'] : p.hp > 30 ? ['WARNING', '#ffd166'] : ['CRITICAL', '#ff6477'];
    this.el.stats.innerHTML = `<div class="row"><span>BÖLGE</span><span class="val">${g.zone.id}. ${g.zone.name}</span></div><div class="row"><span>GÜVENLİK</span><span class="val" style="color:${st[1]}">${st[0]}</span></div><div class="row"><span>CAN</span><span class="val">${Math.ceil(p.hp)} / ${p.maxHp}</span></div><div class="bar"><div style="width:${Math.max(0, p.hp)}%"></div></div><div class="row"><span>ETKİSİZLEŞTİRİLEN</span><span class="val">${g.stats.kills}</span></div><div class="row"><span>SEVİYE</span><span class="val">${g.stats.level}</span></div>`;
    this.el.hot.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const d = document.createElement('div'); d.className = 'slot' + (i === g.selected ? ' sel' : '');
      d.innerHTML = this.slotHTML(inv.slots[i], `<span class="k">${i + 1}</span>`); d.title = inv.slots[i] ? ITEMS[inv.slots[i].id].name : '';
      d.onclick = () => { g.selected = i; this.refresh(); }; this.el.hot.append(d);
    }
    const hasB = inv.count('blaster') > 0, canB = inv.has({ data_crystal: 3, circuit_scrap: 2 });
    const SZ = { data_crystal: 5, circuit_scrap: 4, encryption_shard: 2, firewall_chip: 2, energy_cell: 2 };
    const done = g.completed.includes(g.zone.id);
    let goal;
    if (done) goal = 'Bölge tamamlandı! <b>ESC</b> menüsünden sonraki bölgeye geçebilirsin.';
    else if (g.zone.goal === 'nests') goal = `Trojan Yuvalarını yık (kalan: ${g.nests.length}). Yuvalar kırmızı gözlü bloklardır; Blaster ile etraftaki Trojan'ları temizle, sonra yuvayı kır.`;
    else if (!hasB) goal = canB ? 'Blaster üretebilirsin! <b>Tab</b> ile üretim panelini aç.' : 'Cevherleri sol tıkla kır, parlayan kaynakları topla (3 Data Crystal + 2 Circuit Scrap → Blaster).';
    else if (inv.count('safe_zone_generator') > 0) goal = 'Safe Zone Generator\'ı hotbar\'da seç ve sağ tıkla yerleştir: 50 blokluk güvenli alan!';
    else goal = 'Safe Zone Generator için topla: ' + Object.entries(SZ).map(([id, n]) => `${ITEMS[id].name} ${Math.min(inv.count(id), n)}/${n}`).join(', ') + '. Firewall Chip ve Energy Cell için Trojan/Spam Bot yen veya parlak kaynakları topla.';
    this.el.obj.innerHTML = `<b>HEDEF</b><br>${goal}`;
  }

  toast(t, ms = 1900) { const e = this.el.toast; e.textContent = t; e.style.opacity = 1; clearTimeout(this.toastT); this.toastT = setTimeout(() => (e.style.opacity = 0), ms); }
  pickupToast(id) { this.toast('+1 ' + ITEMS[id].name, 900); }
  flashDamage() { this.el.dmg.style.transition = 'none'; this.el.dmg.style.opacity = 1; requestAnimationFrame(() => { this.el.dmg.style.transition = 'opacity .35s'; this.el.dmg.style.opacity = 0; }); this.refresh(); }
  setBreak(p) { if (p == null) { this.el.brk.style.opacity = 0; return; } this.el.brk.style.opacity = 1; this.el.brk.firstElementChild.style.width = Math.min(100, p * 100) + '%'; }

  // ---------- menü ----------
  showMenu({ title, text, play, hasSave, canNew = true, ver, zones }) {
    this.renderZones(zones);
    $('menuTitle').textContent = title; $('menuText').textContent = text; $('btnPlay').textContent = play;
    $('btnDelete').style.display = hasSave ? '' : 'none'; $('btnNew').style.display = canNew ? '' : 'none';
    if (ver) $('menuVer').textContent = ver;
    this.el.overlay.classList.remove('hidden');
  }
  renderZones(zones) {
    const box = $('zoneList'); box.innerHTML = '';
    for (const z of zones || []) {
      const b = document.createElement('button'); const label = { current: 'Buradasın', open: 'Geç', locked: 'Kilitli', soon: 'Yakında' }[z.state];
      b.className = (z.state === 'current' ? 'cur ' : '') + (z.done ? 'done' : ''); b.disabled = z.state === 'locked' || z.state === 'soon' || z.state === 'current';
      b.innerHTML = `<span>${z.id}. ${z.name}</span><small>${label}</small>`; b.title = z.desc;
      b.onclick = () => this.onZone?.(z.id); box.append(b);
    }
  }
  hideMenu() { this.el.overlay.classList.add('hidden'); }
  get menuOpen() { return !this.el.overlay.classList.contains('hidden'); }

  // ---------- envanter / üretim / kasa paneli ----------
  get panelOpen() { return !this.el.wrap.classList.contains('hidden'); }
  openPanel(mode) { this.mode = mode; this.el.wrap.classList.remove('hidden'); this.renderPanel(); }
  closePanel() {
    const c = this.cursor, g = this.game;
    if (c) { const left = g.inventory.add(c.id, c.count); if (left) g.pickups.spawn(c.id, g.player.pos.x, g.player.pos.y + 1, g.player.pos.z, true); this.cursor = null; }
    this.mode = null; this.el.wrap.classList.add('hidden'); this.renderCursor(); this.refresh();
  }

  renderCursor() { this.el.cur.innerHTML = this.cursor ? `<div class="slot">${this.slotHTML(this.cursor)}</div>` : ''; }

  grid(inv, cls = '') {
    const d = document.createElement('div'); d.className = 'grid ' + cls;
    inv.slots.forEach((s, i) => {
      const e = document.createElement('div'); e.className = 'slot'; e.innerHTML = this.slotHTML(s); e.title = s ? ITEMS[s.id].name : '';
      if (inv === this.game.inventory && i < 8) e.style.borderColor = '#3aa9c9';
      e.onmousedown = (ev) => { ev.preventDefault(); this.clickSlot(inv, i, ev); };
      d.append(e);
    });
    return d;
  }

  clickSlot(inv, i, e) {
    const g = this.game, s = inv.slots[i], c = this.cursor;
    if (e.shiftKey && s && this.mode === 'vault') {
      const other = inv === g.inventory ? g.vault : g.inventory; const left = other.add(s.id, s.count);
      if (left === 0) inv.slots[i] = null; else s.count = left;
    } else if (e.button === 0) {
      if (!c) { this.cursor = s; inv.slots[i] = null; }
      else if (!s) { inv.slots[i] = c; this.cursor = null; }
      else if (s.id === c.id && maxStack(s.id) > 1) { const t = Math.min(maxStack(s.id) - s.count, c.count); s.count += t; c.count -= t; if (!c.count) this.cursor = null; }
      else { inv.slots[i] = c; this.cursor = s; }
    } else if (e.button === 2) {
      if (!c && s) { const h = Math.ceil(s.count / 2); this.cursor = { id: s.id, count: h }; s.count -= h; if (!s.count) inv.slots[i] = null; }
      else if (c) {
        if (!s) { inv.slots[i] = { id: c.id, count: 1 }; c.count--; }
        else if (s.id === c.id && s.count < maxStack(s.id)) { s.count++; c.count--; }
        if (c.count <= 0) this.cursor = null;
      }
    }
    this.renderPanel(); g.requestSave();
  }

  renderPanel() {
    const g = this.game, box = this.el.box; box.innerHTML = ''; this.renderCursor();
    const sec = (title, node) => { const d = document.createElement('div'); d.innerHTML = `<h3>${title}</h3>`; d.append(node); return d; };
    if (this.mode === 'vault') {
      const wrap = document.createElement('div');
      wrap.append(this.grid(g.vault, 'six'));
      const b = document.createElement('button'); b.textContent = 'Test verisi üret ve şifrele'; b.style.marginTop = '8px';
      b.onclick = () => { if (g.vault.add('test_data', 1)) this.toast('Kasa dolu'); else this.toast('Sahte test verisi şifrelenerek kasaya eklendi'); this.renderPanel(); g.requestSave(); };
      const note = document.createElement('div'); note.className = 'small'; note.textContent = 'Shift+tık: envanter ↔ kasa. Kasada yalnızca oyun içi eşyalar/sahte veri saklanır. Dolu kasa kırılamaz.';
      wrap.append(b, note);
      const col = document.createElement('div'); col.append(sec('SECURE VAULT', wrap), sec('ENVANTER', this.grid(g.inventory)));
      box.append(col); return;
    }
    box.append(sec('ENVANTER (alt sıra = hotbar)', this.grid(g.inventory)));
    const list = document.createElement('div');
    for (const r of g.crafting.recipes) {
      const ok = g.crafting.canCraft(r), why = g.crafting.reason(r), row = document.createElement('div'); row.className = 'recipe';
      const cost = Object.entries(r.cost).map(([id, n]) => `<span class="${g.inventory.count(id) >= n ? 'ok' : 'no'}">${n} ${ITEMS[id].name}</span>`).join(' + ');
      row.innerHTML = `${this.icon(r.out)}<div class="info"><b>${ITEMS[r.out].name}${r.n > 1 ? ' ×' + r.n : ''}</b><div class="cost">${cost}${why ? ' · ' + why : ''}</div></div>`;
      const btn = document.createElement('button'); btn.textContent = 'Üret'; btn.disabled = !ok;
      btn.onclick = () => { if (g.crafting.craft(r)) { if (r.out === 'blaster') { const bi = g.inventory.slots.findIndex((x) => x?.id === 'blaster'); if (bi >= 0 && bi < 8) g.selected = bi; } this.toast(ITEMS[r.out].name + ' üretildi'); this.renderPanel(); this.refresh(); g.requestSave(); } };
      row.append(btn); list.append(row);
    }
    box.append(sec('ÜRETİM', list));
  }
}
