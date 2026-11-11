import { maxStack } from './constants.js';

// Slot tabanlı envanter. Oyuncu: 24 slot (ilk 8'i hotbar). Vault: 12 slot.
export class Inventory {
  constructor(size) { this.size = size; this.slots = new Array(size).fill(null); }

  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.count; return n; }
  has(cost) { return Object.entries(cost).every(([id, n]) => this.count(id) >= n); }
  isEmpty() { return this.slots.every((s) => !s); }

  // kalan (sığmayan) miktarı döndürür
  add(id, n = 1) {
    const max = maxStack(id);
    for (const s of this.slots) if (n > 0 && s && s.id === id && s.count < max) { const t = Math.min(max - s.count, n); s.count += t; n -= t; }
    for (let i = 0; i < this.size && n > 0; i++) if (!this.slots[i]) { const t = Math.min(max, n); this.slots[i] = { id, count: t }; n -= t; }
    return n;
  }
  canAdd(id, n = 1) {
    const max = maxStack(id); let room = 0;
    for (const s of this.slots) room += !s ? max : (s.id === id ? max - s.count : 0);
    return room >= n;
  }
  remove(id, n = 1) {
    if (this.count(id) < n) return false;
    for (let i = this.size - 1; i >= 0 && n > 0; i--) { const s = this.slots[i]; if (s && s.id === id) { const t = Math.min(s.count, n); s.count -= t; n -= t; if (!s.count) this.slots[i] = null; } }
    return true;
  }
  takeFromSlot(i, n = 1) { const s = this.slots[i]; if (!s) return false; s.count -= n; if (s.count <= 0) this.slots[i] = null; return true; }

  toJSON() { return this.slots.map((s) => (s ? [s.id, s.count] : null)); }
  fromJSON(arr) {
    this.slots.fill(null);
    if (!Array.isArray(arr)) return;
    arr.slice(0, this.size).forEach((s, i) => { if (Array.isArray(s) && typeof s[0] === 'string' && Number.isInteger(s[1]) && s[1] > 0) this.slots[i] = { id: s[0], count: Math.min(s[1], maxStack(s[0])) }; });
  }
}
