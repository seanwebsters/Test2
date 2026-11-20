import * as THREE from 'three';
import type { Island } from './islandMap';

/** What each keepsake is and how it is earned, in the order they sit around the nook. */
export const KEEPSAKES: { id: string; name: string }[] = [
  { id: 'lantern', name: 'A seed lantern' },
  { id: 'bloom', name: 'A flower from your garden' },
  { id: 'stones', name: 'A little stone stack' },
  { id: 'kite', name: 'Your kite' },
  { id: 'skimmer', name: 'A perfect skimming stone' },
  { id: 'shell', name: 'A shell from the bay' },
  { id: 'feather', name: 'A feather from the summit' },
  { id: 'garland', name: 'A friendship garland' },
  { id: 'bowl', name: 'A bowl of lake water' },
  { id: 'picture', name: 'A picture you took' },
];

/**
 * Your own nook near the garden: a ring of mossy stones under one great leaf.
 * It starts bare and fills with keepsakes from the things you do.
 */
export class Home {
  readonly group = new THREE.Group();
  readonly x: number;
  readonly z: number;
  private items = new Map<string, THREE.Object3D>();

  constructor(island: Island) {
    this.x = 27;
    this.z = 25;
    const y = island.heightAt(this.x, this.z);
    this.group.position.set(this.x, y, this.z);
    const L = (color: number, extra: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color, ...extra });
    const add = (m: THREE.Object3D, parent: THREE.Object3D = this.group): void => {
      m.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      parent.add(m);
    };
    const mat = new THREE.Mesh(new THREE.CircleGeometry(2.5, 28).rotateX(-Math.PI / 2), L(0x5f9f3c));
    mat.position.y = 0.04;
    mat.receiveShadow = true;
    this.group.add(mat);
    const stone = new THREE.SphereGeometry(1, 12, 9);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const s = new THREE.Mesh(stone, L([0x8d8a86, 0xa39d94, 0x7f8a76][i % 3]));
      s.scale.set(0.42 + (i % 3) * 0.06, 0.22, 0.34);
      s.position.set(Math.cos(a) * 2.7, 0.12, Math.sin(a) * 2.7);
      s.rotation.y = -a;
      add(s);
    }
    // one great leaf on a bent stalk for a roof
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 3.4, 8).translate(0, 1.7, 0), L(0x4f9a3a));
    stalk.position.set(-2.2, 0, -1.2);
    stalk.rotation.z = -0.3;
    add(stalk);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12).scale(2.6, 0.16, 1.9), L(0x57b043));
    leaf.position.set(-0.6, 3.25, -0.9);
    leaf.rotation.set(0.12, 0.3, -0.16);
    add(leaf);

    // keepsakes, each hidden until earned
    const at = (i: number, r = 1.75): [number, number] => [Math.cos((i / 10) * Math.PI * 2 + 0.3) * r, Math.sin((i / 10) * Math.PI * 2 + 0.3) * r];
    const place = (id: string, i: number, obj: THREE.Object3D, yOff = 0): void => {
      const [px, pz] = at(i);
      obj.position.set(px, yOff, pz);
      obj.visible = false;
      add(obj);
      this.items.set(id, obj);
    };
    place('lantern', 0, new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 1), new THREE.MeshBasicMaterial({ color: 0xeaffa0 })), 0.4);
    const pot = new THREE.Group();
    pot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.2, 10).translate(0, 0.1, 0), L(0xb5683a)));
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), L(0xff7ab0));
    flower.position.y = 0.46;
    pot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 5).translate(0, 0.32, 0), L(0x4f9a3a)), flower);
    place('bloom', 1, pot);
    const stack = new THREE.Group();
    [0.2, 0.15, 0.11].forEach((r, k) => {
      const m = new THREE.Mesh(stone, L([0x8d8a86, 0xb8b0a2, 0x77736e][k]));
      m.scale.set(r, r * 0.45, r * 0.85);
      m.position.y = 0.09 + k * 0.14;
      stack.add(m);
    });
    place('stones', 2, stack);
    const kiteGeo = new THREE.BufferGeometry();
    kiteGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, 0, -0.3, 0.1, 0, 0.3, 0.1, 0, 0, -0.4, 0], 3));
    kiteGeo.setIndex([0, 1, 2, 1, 3, 2]);
    kiteGeo.computeVertexNormals();
    const kite = new THREE.Mesh(kiteGeo, new THREE.MeshBasicMaterial({ color: 0xff8a6a, side: THREE.DoubleSide }));
    kite.rotation.x = -0.5;
    place('kite', 3, kite, 0.5);
    const skim = new THREE.Mesh(stone, L(0x6f7f8a));
    skim.scale.set(0.2, 0.045, 0.16);
    place('skimmer', 4, skim, 0.07);
    const shell = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 10), L(0xffd9e0));
    shell.rotation.z = 1.2;
    place('shell', 5, shell, 0.12);
    const feather = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(0.07, 0.36, 0.015), L(0xffffff));
    feather.rotation.z = 0.5;
    place('feather', 6, feather, 0.36);
    const garland = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), L([0xff7a8a, 0xffd23c, 0x7fc8ff, 0x9fe07a, 0xd7b6ff][k % 5]));
      b.position.set((k - 3) * 0.2, 1.2 - Math.sin((k / 6) * Math.PI) * 0.25, 0);
      garland.add(b);
    }
    place('garland', 7, garland);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), L(0x6fb8e6, { side: THREE.DoubleSide }));
    place('bowl', 8, bowl, 0.2);
    const frame = new THREE.Group();
    frame.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.04), L(0xb5863a)));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), new THREE.MeshBasicMaterial({ color: 0x9fd6ff }));
    pic.position.z = 0.025;
    frame.add(pic);
    frame.rotation.x = -0.25;
    place('picture', 9, frame, 0.24);
    for (const [, o] of this.items) o.lookAt(0, o.position.y, 0);
  }

  near(p: THREE.Vector3): boolean {
    return Math.hypot(this.x - p.x, this.z - p.z) < 3.2;
  }

  show(earned: Set<string>): void {
    for (const [id, o] of this.items) o.visible = earned.has(id);
  }
}
