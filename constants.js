// Tüm oyun verisi (bloklar, eşyalar, tarifler) tek yerde.
export const WORLD = { W: 64, D: 64, H: 32, CHUNK: 16 };

export const B = {
  AIR: 0, CIRCUIT: 1, DATA: 2, FIREWALL: 3, GLASS: 4, ENERGY: 5,
  VAULT: 6, ORE_CRYSTAL: 7, ORE_SCRAP: 8, ORE_SHARD: 9, BEDROCK: 10, NEST: 11, GENERATOR: 12
};
export const MAX_BLOCK_ID = 12;

// layer: solid (ışıklı Lambert), glow (kendi ışığı olan), glass (yarı saydam)
export const BLOCKS = {
  [B.CIRCUIT]:     { name: 'Circuit Block',      tile: 0, hard: 0.6, layer: 'solid', drop: 'circuit_block' },
  [B.DATA]:        { name: 'Data Block',         tile: 1, hard: 0.7, layer: 'solid', drop: 'data_block' },
  [B.FIREWALL]:    { name: 'Firewall Block',     tile: 2, hard: 1.2, layer: 'solid', drop: 'firewall_block' },
  [B.GLASS]:       { name: 'Glass Data Block',   tile: 3, hard: 0.3, layer: 'glass', drop: 'glass_block' },
  [B.ENERGY]:      { name: 'Energy Block',       tile: 4, hard: 0.6, layer: 'glow',  drop: 'energy_block' },
  [B.VAULT]:       { name: 'Secure Vault Block', tile: 5, hard: 1.5, layer: 'glow',  drop: 'vault_block' },
  [B.ORE_CRYSTAL]: { name: 'Data Crystal Ore',   tile: 6, hard: 0.9, layer: 'glow',  drop: 'data_crystal', dropMin: 1, dropMax: 2 },
  [B.ORE_SCRAP]:   { name: 'Circuit Scrap Ore',  tile: 7, hard: 0.9, layer: 'solid', drop: 'circuit_scrap', dropMin: 1, dropMax: 2 },
  [B.ORE_SHARD]:   { name: 'Encryption Shard Ore', tile: 8, hard: 1.1, layer: 'glow', drop: 'encryption_shard', dropMin: 1, dropMax: 1 },
  [B.BEDROCK]:     { name: 'Bedrock',            tile: 9, hard: Infinity, layer: 'solid', drop: null },
  [B.NEST]:        { name: 'Trojan Yuvası',      tile: 10, hard: 3.0, layer: 'glow', drop: 'encryption_shard', dropMin: 2, dropMax: 3 },
  [B.GENERATOR]:   { name: 'Safe Zone Generator', tile: 11, hard: 2.5, layer: 'glow', drop: 'safe_zone_generator' }
};
export const TILE_COUNT = 12;

export function isTransparent(id) { return id === B.AIR || BLOCKS[id]?.layer === 'glass'; }
export function isSolid(id) { return id !== B.AIR; }

export const STACK = 64;
export const ITEMS = {
  circuit_block:    { name: 'Circuit Block',      color: '#1f8a99', short: 'CB', block: B.CIRCUIT },
  data_block:       { name: 'Data Block',         color: '#1b6fa8', short: 'DB', block: B.DATA },
  firewall_block:   { name: 'Firewall Block',     color: '#e0622a', short: 'FW', block: B.FIREWALL },
  glass_block:      { name: 'Glass Data Block',   color: '#7fe9ff', short: 'GL', block: B.GLASS },
  energy_block:     { name: 'Energy Block',       color: '#e6ff4d', short: 'EN', block: B.ENERGY },
  vault_block:      { name: 'Secure Vault',       color: '#8a5cff', short: 'SV', block: B.VAULT },
  data_crystal:     { name: 'Data Crystal',       color: '#44e8ff', short: '◆' },
  circuit_scrap:    { name: 'Circuit Scrap',      color: '#9bff7a', short: '▦' },
  encryption_shard: { name: 'Encryption Shard',   color: '#c18bff', short: '✦' },
  firewall_chip:    { name: 'Firewall Chip',      color: '#ff8a3c', short: '▣' },
  energy_cell:      { name: 'Energy Cell',        color: '#f6ff5a', short: '⚡' },
  blaster:          { name: 'Antivirus Blaster',  color: '#54e7ff', short: 'AB', max: 1, tool: true },
  repair_kit:       { name: 'Repair Kit',         color: '#4dff9a', short: '✚', max: 16 },
  ram_fragment:     { name: 'RAM Fragment',       color: '#ff7a9a', short: '▤' },
  safe_zone_generator: { name: 'Safe Zone Generator', color: '#5dffd6', short: 'SZ', block: B.GENERATOR, max: 4 },
  test_data:        { name: 'Test Verisi (sahte)', color: '#9fb4c4', short: 'TD' }
};
export const maxStack = (id) => ITEMS[id]?.max ?? STACK;

export const RECIPES = [
  { id: 'blaster',  out: 'blaster',        n: 1, cost: { data_crystal: 3, circuit_scrap: 2 } },
  { id: 'vault',    out: 'vault_block',    n: 1, cost: { data_crystal: 5, circuit_scrap: 3 } },
  { id: 'repair',   out: 'repair_kit',     n: 1, cost: { data_crystal: 2 } },
  { id: 'firewall', out: 'firewall_block', n: 4, cost: { firewall_chip: 1, circuit_scrap: 2 } },
  { id: 'data',     out: 'data_block',     n: 4, cost: { data_crystal: 2 } },
  { id: 'glass',    out: 'glass_block',    n: 4, cost: { data_crystal: 1, circuit_scrap: 1 } },
  { id: 'energy',   out: 'energy_block',   n: 2, cost: { energy_cell: 1, data_crystal: 1 } },
  { id: 'cell',     out: 'energy_cell',    n: 2, cost: { ram_fragment: 3 } },
  { id: 'safezone', out: 'safe_zone_generator', n: 1, cost: { data_crystal: 5, circuit_scrap: 4, encryption_shard: 2, firewall_chip: 2, energy_cell: 2 } }
];

export const SAFE_RADIUS = 25; // 50 blok çapında güvenli alan

export const PLAYER = { HP: 100, REACH: 6.5, WALK: 5.5, SPRINT: 9, JUMP: 8.6, GRAVITY: 26 };
export const SPAWN = { x: 32, z: 32 };
