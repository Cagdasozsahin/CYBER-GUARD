# CYBER GUARD — v0.3 (bölgeler)

Tek oyunculu, Three.js tabanlı bloklu dijital dünya survival oyunu.

## Çalıştırma
```
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ -> GitHub Pages / statik hosting (base './')
npm test           # saf mantık testleri
```

## Kontroller
WASD hareket · Shift koş · Space zıpla · Fare kamera · Sol tık kır / blaster ateşi · Sağ tık yerleştir / Repair Kit
1-8 / tekerlek hotbar · Tab/I/C envanter + üretim · E yakındaki Secure Vault · ESC duraklat

## Yapı
src/main.js · src/styles.css · src/ui/HUD.js
src/game/: Game (döngü, durum, kayıt akışı) · World (voxel, chunk mesh, raycast) · Atlas (prosedürel doku) ·
Player (robot, kamera) · Physics · Input · Inventory · Crafting · Enemies · Combat · Pickups · SaveManager · constants

## Bölgeler
1. File Valley — Safe Zone Generator (5 Data Crystal, 4 Circuit Scrap, 2 Encryption Shard, 2 Firewall Chip, 2 Energy Cell) yerleştir: 50 blok çaplı güvenli alan, bölüm biter.
2. Trojan Forest — 3 Trojan Yuvası'nı yık.
3. Spam Factory · 4. Hacker Network · 5. Veri Madenleri · 6. Ana Sistem — sırayla yapılacak (şimdilik kilitli).
Güvenli alan yarıçapı: src/game/constants.js -> SAFE_RADIUS.

## Bilinen eksikler (sonraki aşamalar)
Defense Turret, Firewall Shield, Trojan Scanner, boss (ZERO), bölgeler/portallar, ses, ayar menüsü, mobil kontroller,
üsse dalga saldırısı/hasar-tamir, GitHub Pages yayın adımları.
Güvenlik: oyun sandbox'tır; gerçek dosya/anahtar/parola ile ilgisi yoktur. Kasa yalnızca kurgusal eşya saklar.
