/** Circular obstacles (tree trunks, boulders) in a spatial hash. */
export class Colliders {
  private cells = new Map<number, number[]>();
  private data: number[] = []; // x, z, r triples
  private static readonly SIZE = 8;

  private key(cx: number, cz: number): number {
    return (cx + 512) * 4096 + (cz + 512);
  }

  add(x: number, z: number, r: number): void {
    const id = this.data.length / 3;
    this.data.push(x, z, r);
    const S = Colliders.SIZE;
    for (let cx = Math.floor((x - r) / S); cx <= Math.floor((x + r) / S); cx++) {
      for (let cz = Math.floor((z - r) / S); cz <= Math.floor((z + r) / S); cz++) {
        const k = this.key(cx, cz);
        let list = this.cells.get(k);
        if (!list) this.cells.set(k, (list = []));
        list.push(id);
      }
    }
  }

  /** Push a circle of radius `r` out of any obstacle. Mutates and returns pos. */
  resolve(pos: { x: number; z: number }, r: number): boolean {
    const S = Colliders.SIZE;
    let hit = false;
    const list = this.cells.get(this.key(Math.floor(pos.x / S), Math.floor(pos.z / S)));
    if (!list) return false;
    for (const id of list) {
      const ox = this.data[id * 3];
      const oz = this.data[id * 3 + 1];
      const min = this.data[id * 3 + 2] + r;
      const dx = pos.x - ox;
      const dz = pos.z - oz;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = ox + (dx / d) * min;
        pos.z = oz + (dz / d) * min;
        hit = true;
      }
    }
    return hit;
  }

  get count(): number {
    return this.data.length / 3;
  }
}
