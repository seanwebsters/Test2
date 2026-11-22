import * as THREE from 'three';
import { clamp, smoothstep } from '../core/math';
import { SKY_HORIZON, SKY_TOP } from './Sky';
import { SUN_DIR, globalUniforms, setFogSky } from './shared';

interface Key {
  h: number;
  top: number;
  horizon: number;
  sun: number;
  sunI: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  /** how bright self-lit things (water, clouds, mist) should be */
  light: number;
  stars: number;
}

const NIGHT = { top: 0x070d2e, horizon: 0x1b2f6e, sun: 0x9db8ff, sunI: 0.75, hemiSky: 0x4a64b8, hemiGround: 0x25405a, hemiI: 0.55, light: 0.34, stars: 1 };
const DAY = { top: 0x2f86ea, horizon: 0xbfe6ff, sun: 0xffe0b0, sunI: 3.15, hemiSky: 0xc2dcff, hemiGround: 0x9cc76a, hemiI: 1.85, light: 1, stars: 0 };
const KEYS: Key[] = [
  { h: 0, ...NIGHT },
  { h: 5, ...NIGHT },
  { h: 6.5, top: 0x4f86d8, horizon: 0xffc8a0, sun: 0xffb27a, sunI: 2.2, hemiSky: 0xd8dcff, hemiGround: 0xa8a878, hemiI: 1.35, light: 0.88, stars: 0 },
  { h: 8.5, ...DAY },
  { h: 14.5, ...DAY },
  // the long golden afternoon: low warm sun, peach along the horizon, cooler lilac in the shade
  { h: 16.6, top: 0x2f80e6, horizon: 0xd6e6fa, sun: 0xffc98a, sunI: 3.3, hemiSky: 0xcdd6ff, hemiGround: 0xb9b070, hemiI: 1.75, light: 0.98, stars: 0 },
  { h: 18.6, top: 0x3a4fa0, horizon: 0xff9c6e, sun: 0xff8a50, sunI: 2.1, hemiSky: 0xdcc4ee, hemiGround: 0x9a8a66, hemiI: 1.25, light: 0.82, stars: 0.1 },
  { h: 20, ...NIGHT },
  { h: 24, ...NIGHT },
];

const a = new THREE.Color();
const b = new THREE.Color();
const mix = (out: THREE.Color, x: number, y: number, t: number): THREE.Color => out.copy(a.set(x)).lerp(b.set(y), t);

/** A whole day passes in twenty minutes: sunrise, noon, sunset, moonlit night. */
export class DayCycle {
  /** 0–24 */
  hour = 15.4;
  /** game hours per real second */
  rate = 24 / (20 * 60);
  /** 0 by day, 1 in the middle of the night */
  night = 0;

  update(dt: number, sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight, fog: THREE.FogExp2, rain = 0): void {
    this.hour = (this.hour + dt * this.rate) % 24;
    const h = this.hour;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
    const k0 = KEYS[i];
    const k1 = KEYS[i + 1];
    const t = smoothstep(0, 1, clamp((h - k0.h) / (k1.h - k0.h)));
    const num = (x: number, y: number): number => x + (y - x) * t;

    mix(SKY_TOP, k0.top, k1.top, t);
    mix(SKY_HORIZON, k0.horizon, k1.horizon, t);
    fog.color.copy(SKY_HORIZON);
    mix(sun.color, k0.sun, k1.sun, t);
    mix(hemi.color, k0.hemiSky, k1.hemiSky, t);
    mix(hemi.groundColor, k0.hemiGround, k1.hemiGround, t);
    hemi.intensity = num(k0.hemiI, k1.hemiI);
    globalUniforms.uDayLight.value = num(k0.light, k1.light);
    this.night = num(k0.stars, k1.stars);

    // the sun crosses from east to west by day; the moon takes the same road by night
    const day = h >= 5.6 && h < 19.2;
    const u = day ? (h - 5.6) / 13.6 : ((h - 19.2 + 24) % 24) / 10.4;
    SUN_DIR.set(Math.cos(Math.PI * u) * 0.85, Math.sin(Math.PI * u) * 0.95, 0.42).normalize();
    // fade the light out near the horizon so the hand-over from sun to moon is invisible
    sun.intensity = num(k0.sunI, k1.sunI) * smoothstep(0.0, 0.16, SUN_DIR.y) * (1 - 0.65 * rain);
    // a shower greys the sky, thickens the haze and softens everything
    if (rain > 0.001) {
      const dim = 0.35 + 0.65 * globalUniforms.uDayLight.value;
      SKY_TOP.lerp(a.set(0x7f93aa).multiplyScalar(dim), rain * 0.75);
      SKY_HORIZON.lerp(a.set(0xc3ccd6).multiplyScalar(dim), rain * 0.75);
      fog.color.copy(SKY_HORIZON);
      hemi.intensity *= 1 - 0.12 * rain;
      globalUniforms.uDayLight.value *= 1 - 0.22 * rain;
    }
    fog.density = 0.00105 + 0.0016 * rain;
    setFogSky(SKY_HORIZON, SKY_TOP, globalUniforms.uTime.value, day ? smoothstep(0.05, 0.3, SUN_DIR.y) * (1 - 0.8 * rain) : 0.25 * smoothstep(0.05, 0.3, SUN_DIR.y));
  }

  get label(): string {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
