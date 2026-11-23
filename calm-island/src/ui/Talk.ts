import * as THREE from 'three';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

/** A head-and-shoulders picture of a sculpted Calmling, for the speech bubble. Call before the model is rigged. */
let studio: THREE.WebGLRenderer | null = null;

/** Put away the little renderer the portraits are drawn with, once they have all been taken. */
export function donePortraits(): void {
  studio?.dispose();
  studio?.forceContextLoss();
  studio = null;
}

export function renderPortrait(model: THREE.Object3D, size = 220): string {
  if (!studio) {
    studio = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    studio.setPixelRatio(1);
    studio.setSize(size, size, false);
    studio.outputColorSpace = THREE.SRGBColorSpace;
    studio.toneMapping = THREE.NeutralToneMapping;
  }
  const renderer = studio;
  {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8b0, 2.4));
    const key = new THREE.DirectionalLight(0xfff2dc, 2.4);
    key.position.set(2, 3, 4);
    scene.add(key);
    const copy = model.clone(true);
    scene.add(copy);
    const box = new THREE.Box3().setFromObject(copy);
    const dim = box.getSize(new THREE.Vector3());
    const mid = box.getCenter(new THREE.Vector3());
    const half = Math.max(dim.x, dim.y) * 0.5;
    const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 50);
    cam.position.set(mid.x + dim.x * 0.25, mid.y + dim.y * 0.12, mid.z + 10);
    cam.lookAt(mid.x, mid.y + dim.y * 0.04, mid.z);
    renderer.render(scene, cam);
    return renderer.domElement.toDataURL('image/png');
  }
}

/**
 * Someone speaking to you: a speech bubble with their portrait and name.
 * The words write themselves out; a tap finishes the line, the next tap moves on.
 */
export class Talk {
  private lines: string[] = [];
  private at = 0;
  private shown = 0;
  private timer = 0;
  private done: (() => void) | null = null;
  /** called as each line begins, for a voice */
  onLine: (() => void) | null = null;

  constructor() {
    $('talk').addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'talk-skip') return;
      this.next();
    });
    $('talk-skip').addEventListener('click', () => this.finish());
    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') this.next();
      else if (e.code === 'Escape') this.finish();
      e.stopImmediatePropagation();
    }, true);
  }

  get open(): boolean {
    return !$('talk').classList.contains('hidden');
  }

  /** `badge` is a line shown beneath, such as "New friend · 3 of 18". */
  say(name: string, portrait: string, lines: string[], done: () => void, badge = ''): void {
    $('talk-badge').textContent = badge;
    $('talk-badge').classList.toggle('hidden', !badge);
    this.lines = lines;
    this.at = 0;
    this.done = done;
    $('talk-name').textContent = name;
    ($('talk-face') as HTMLImageElement).src = portrait;
    $('talk').classList.remove('hidden');
    this.write();
  }

  private write(): void {
    window.clearInterval(this.timer);
    this.shown = 0;
    this.onLine?.();
    const text = this.lines[this.at];
    const out = $('talk-text');
    out.textContent = '';
    $('talk-more').classList.add('hidden');
    this.timer = window.setInterval(() => {
      this.shown = Math.min(text.length, this.shown + 2);
      out.textContent = text.slice(0, this.shown);
      if (this.shown >= text.length) this.settle();
    }, 34);
  }

  private settle(): void {
    window.clearInterval(this.timer);
    this.shown = this.lines[this.at].length;
    $('talk-text').textContent = this.lines[this.at];
    $('talk-more').classList.remove('hidden');
  }

  private next(): void {
    if (this.shown < this.lines[this.at].length) return void this.settle();
    if (++this.at >= this.lines.length) return void this.finish();
    this.write();
  }

  private finish(): void {
    window.clearInterval(this.timer);
    $('talk').classList.add('hidden');
    const d = this.done;
    this.done = null;
    d?.();
  }
}
