import { RECIPES, ITEMS } from './constants.js';

export class Crafting {
  constructor(inventory) { this.inv = inventory; this.recipes = RECIPES.filter((r) => ITEMS[r.out] && Object.keys(r.cost).every((k) => ITEMS[k])); }
  canCraft(r) { return this.inv.has(r.cost) && this.inv.canAdd(r.out, r.n) && !(r.out === 'blaster' && this.inv.count('blaster') > 0); }
  reason(r) {
    if (r.out === 'blaster' && this.inv.count('blaster') > 0) return 'Zaten var';
    if (!this.inv.has(r.cost)) return 'Malzeme yetersiz';
    if (!this.inv.canAdd(r.out, r.n)) return 'Envanter dolu';
    return '';
  }
  craft(r) {
    if (!this.canCraft(r)) return false;
    for (const [id, n] of Object.entries(r.cost)) this.inv.remove(id, n);
    this.inv.add(r.out, r.n);
    return true;
  }
}
