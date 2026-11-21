import * as THREE from 'three';

/**
 * A ring of far mountains out across the sea. They are never reached: they
 * give every view a last, palest layer for the haze to dissolve, so the island
 * sits in a wider world instead of ending at a bare horizon.
 */
export class Backdrop {
  readonly group = new THREE.Group();

  constructor() {
    const rnd = (i: number): number => {
      const v = Math.sin(i * 91.7 + 13.3) * 43758.5453;
      return v - Math.floor(v);
    };
    const rock = new THREE.MeshLambertMaterial({ color: 0x8f9fc0, flatShading: false });
    const green = new THREE.MeshLambertMaterial({ color: 0x7fa88a });
    let n = 0;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rnd(n++) * 0.2;
      const dist = 1500 + rnd(n++) * 900;
      const h = 220 + rnd(n++) * 380;
      const w = h * (1.5 + rnd(n++) * 1.4);
      const geo = new THREE.ConeGeometry(w, h, 9, 5);
      const p = geo.attributes.position;
      for (let v = 0; v < p.count; v++) {
        // push the ribs about so no two peaks share a silhouette, and round the summit off
        const y = p.getY(v);
        const k = 1 + (rnd(n + v * 3.1) - 0.5) * 0.5 * (1 - (y + h / 2) / h);
        p.setXYZ(v, p.getX(v) * k + (rnd(n + v) - 0.5) * w * 0.12, y > h * 0.42 ? h * 0.42 + (y - h * 0.42) * 0.45 : y, p.getZ(v) * k);
      }
      n += 40;
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, rock);
      m.position.set(Math.cos(a) * dist, h * 0.36, Math.sin(a) * dist);
      m.rotation.y = rnd(n++) * 6.3;
      this.group.add(m);
      // a lower, greener shoulder beside each peak
      const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), green);
      foot.scale.set(w * 1.2, h * 0.3, w * 0.9);
      foot.position.set(Math.cos(a + 0.06) * (dist - 60), 0, Math.sin(a + 0.06) * (dist - 60));
      this.group.add(foot);
    }
  }
}
