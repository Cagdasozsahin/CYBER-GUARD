// Eksen eksen çarpışma çözümü. body: {pos:Vector3, vel:Vector3, hw, h, onGround, hitX, hitZ}
export function stepBody(world, b, dt) {
  b.hitX = false; b.hitZ = false; b.onGround = false;
  const nx = b.pos.x + b.vel.x * dt;
  if (world.collideBox(nx, b.pos.y, b.pos.z, b.hw, b.h)) { b.hitX = true; b.vel.x = 0; } else b.pos.x = nx;
  const nz = b.pos.z + b.vel.z * dt;
  if (world.collideBox(b.pos.x, b.pos.y, nz, b.hw, b.h)) { b.hitZ = true; b.vel.z = 0; } else b.pos.z = nz;
  let ny = b.pos.y + b.vel.y * dt;
  if (world.collideBox(b.pos.x, ny, b.pos.z, b.hw, b.h)) {
    if (b.vel.y < 0) { b.onGround = true; ny = Math.floor(ny) + 1; }
    else if (b.vel.y > 0) ny = Math.floor(ny + b.h) - b.h - 1e-3;
    b.vel.y = 0;
    if (world.collideBox(b.pos.x, ny, b.pos.z, b.hw, b.h)) ny = b.pos.y; // güvenlik
  }
  b.pos.y = ny;
}

// Gömülü kaldıysa yukarı taşı
export function unstick(world, pos, hw, h) {
  let guard = 0;
  while (world.collideBox(pos.x, pos.y, pos.z, hw, h) && guard++ < 40) pos.y += 1;
}
