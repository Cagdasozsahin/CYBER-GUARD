const KEY = 'cyberguard.save.v1'; // anahtar sabit; içindeki version alanı 1 veya 2 olabilir

export const SaveManager = {
  exists() { return this.load() !== null; }, // bozuksa temizler ve false döner
  clear() { try { localStorage.removeItem(KEY); } catch { /* yoksay */ } },
  save(data) { try { localStorage.setItem(KEY, JSON.stringify({ ...data, version: 2 })); return true; } catch { return false; } },
  load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return null;
      const d = JSON.parse(raw), p = d?.player;
      if (![1, 2].includes(d?.version) || !p || ![p.x, p.y, p.z, p.hp].every(Number.isFinite) || !Array.isArray(d.inv)) throw new Error('bad save');
      if (d.version === 1) { // eski kayıt => File Valley
        d.zone = 1; d.unlocked = [1]; d.completed = []; d.zoneData = { 1: { edits: Array.isArray(d.edits) ? d.edits : [] } }; d.version = 2;
      }
      if (!Number.isInteger(d.zone) || !Array.isArray(d.unlocked) || !Array.isArray(d.completed) || typeof d.zoneData !== 'object' || !d.zoneData) throw new Error('bad zone data');
      return d;
    } catch { this.clear(); return null; }
  }
};
