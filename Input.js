// Klavye / fare girişi + Pointer Lock. Mobil dokunmatik için aynı arayüz sonradan beslenebilir.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {}; this.pressed = new Set();
    this.left = false; this.right = false;
    this.dx = 0; this.dy = 0; this.wheel = 0;
    this.locked = false;
    this.onKeyDown = null; this.onLockChange = null; this.onLockError = null;

    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.pressed.add(e.code); this.onKeyDown?.(e.code, e); }
      this.keys[e.code] = true;
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.left = this.right = false; });
    document.addEventListener('mousemove', (e) => { if (this.locked) { this.dx += e.movementX; this.dy += e.movementY; } });
    document.addEventListener('mousedown', (e) => { if (!this.locked) return; if (e.button === 0) this.left = true; if (e.button === 2) { this.right = true; this.pressed.add('Mouse2'); } });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) this.left = false; if (e.button === 2) this.right = false; });
    document.addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) { this.left = this.right = false; }
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('pointerlockerror', () => this.onLockError?.());
  }
  lock() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => this.onLockError?.()); } catch { this.onLockError?.(); } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  down(code) { return !!this.keys[code]; }
  wasPressed(code) { return this.pressed.has(code); }
  consumeLook() { const r = { dx: this.dx, dy: this.dy }; this.dx = this.dy = 0; return r; }
  consumeWheel() { const w = this.wheel; this.wheel = 0; return w; }
  endFrame() { this.pressed.clear(); }
}
