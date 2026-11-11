// Bölge (bölüm) tanımları. playable:false => şimdilik kilitli/yakında.
export const ZONES = [
  {
    id: 1, name: 'File Valley', playable: true, goal: 'safezone',
    desc: 'Başlangıç vadisi. Kaynak topla, Blaster üret ve Safe Zone Generator ile 50 blokluk güvenli alan kur.',
    completeText: 'Güvenli alan aktif! File Valley artık korumada. Trojan Forest portalı açıldı.',
    sky: 0x061321, fog: [30, 90], tint: [1, 1, 1], hemi: [0x9fe8ff, 0x24355a], motes: 0x54e7ff,
    gen: { seed: 0, towers: 7, crystals: 16, poles: 18, trees: 0, nests: 0, oreMul: 1 },
    pickups: { n: 40, types: ['data_crystal', 'data_crystal', 'circuit_scrap', 'circuit_scrap', 'encryption_shard'], extra: [['energy_cell', 3], ['firewall_chip', 3]] },
    enemy: { start: 1, base: 2, grow: 150, cap: 4, lvlStep: 0, interval: 16, minInterval: 12, minDist: 26, spamAfter: 90, spamChance: 0.25, dmg: 5, dmgCap: 2, speed: 2.2 }
  },
  {
    id: 2, name: 'Trojan Forest', playable: true, goal: 'nests',
    desc: 'Karanlık veri ormanı: yoğun Trojan, daha çok devre parçası ve RAM Fragment. Trojan Yuvalarını yık.',
    completeText: 'Tüm Trojan Yuvaları yıkıldı! Orman temizlendi. Spam Factory portalı açıldı.',
    sky: 0x14070d, fog: [20, 68], tint: [1.15, 0.55, 0.7], hemi: [0xffb0b8, 0x3a1a2a], motes: 0xff6a7a,
    gen: { seed: 100, towers: 2, crystals: 8, poles: 8, trees: 70, nests: 3, oreMul: 1.8 },
    pickups: { n: 36, types: ['circuit_scrap', 'circuit_scrap', 'circuit_scrap', 'data_crystal', 'encryption_shard', 'ram_fragment'], extra: [['energy_cell', 2]] },
    enemy: { start: 3, base: 4, grow: 90, cap: 9, lvlStep: 0, interval: 9, minInterval: 6, minDist: 20, spamAfter: 9999, spamChance: 0, dmg: 7, dmgCap: 5, speed: 2.6, nestInterval: 9 }
  },
  { id: 3, name: 'Spam Factory', playable: false, desc: 'Sürekli sahte e-postalar ve reklam mesajları üreten devasa bir fabrika. Oyuncu üretim merkezini yok ederek spam akışını durdurur.' },
  { id: 4, name: 'Hacker Network', playable: false, desc: 'En tehlikeli bölgelerden biri. Şifre kırıcılar, bot orduları ve güvenlik duvarlarını aşmaya çalışan düşmanlar bulunur.' },
  { id: 5, name: 'Veri Madenleri', playable: false, desc: 'Nadir materyallerin bulunduğu yer. Şifreleme kristalleri, işlemci parçaları ve güvenlik çipleri çıkarılır.' },
  { id: 6, name: 'Ana Sistem (Core System)', playable: false, desc: 'Oyunun son bölgesi. Burada ana bilgisayarın kontrolünü ele geçirmek isteyen büyük bir yapay zekâ tehdidi bulunur.' }
];
export const zoneById = (id) => ZONES.find((z) => z.id === id);
