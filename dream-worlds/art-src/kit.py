"""
Painterly raster toolkit for Dream Worlds key art.

Everything is float32 linear-ish RGB in [0, 1+] (values above 1 bloom),
rendered with numpy + Pillow only, so the art is reproducible offline.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 2000, 1250
rng = np.random.default_rng(7)


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def mix(a, b, t):
    return a + (b - a) * t


def canvas(w=W, h=H):
    return np.zeros((h, w, 3), np.float32)


def vgrad(stops, w=W, h=H):
    """stops: list of (pos 0..1, hex)"""
    y = np.linspace(0, 1, h)[:, None]
    out = np.zeros((h, 1, 3), np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        t = np.clip((y - p0) / max(1e-6, p1 - p0), 0, 1)[..., None]
        seg = ((y >= p0) & (y <= p1))[..., None]
        out = np.where(seg, mix(hexc(c0), hexc(c1), t), out)
    return np.repeat(out, w, axis=1)


def noise(w, h, scale, seed, sy=None):
    """smooth value noise; pass sy for anisotropic (stretched) noise"""
    r = np.random.default_rng(seed)
    sy = sy or scale
    gw, gh = max(2, int(w / scale) + 3), max(2, int(h / sy) + 3)
    g = r.random((gh, gw)).astype(np.float32)
    im = Image.fromarray(g, "F").resize((w, h), Image.BILINEAR)
    # blur away the bilinear grid so thresholds never show cell edges
    n = blur(np.asarray(im, np.float32), max(1.0, min(scale, sy) * 0.45))
    # restore the contrast the blur removed (target std of uniform noise)
    n = 0.5 + (n - n.mean()) * (0.26 / (n.std() + 1e-6))
    return np.clip(n, 0, 1)


def fbm(w=W, h=H, scale=400, octaves=6, seed=0, gain=0.5, stretch=1.0):
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        sc = max(1.5, scale / (2**o))
        out += noise(w, h, sc * stretch, seed + o * 101, sy=sc) * amp
        tot += amp
        amp *= gain
    return out / tot


def _box(a, r, axis):
    """box blur of radius r along axis using cumulative sums (edge-padded)"""
    if r < 1:
        return a
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    p = np.pad(a, pad, mode="edge")
    c = np.cumsum(p, axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur(a, r):
    """Gaussian-ish blur (3 box passes) for float arrays HxW or HxWxC."""
    if r <= 0:
        return a
    # box radius giving roughly the requested sigma over three passes
    b = max(1, int(round(np.sqrt(12 * r * r / 3 + 1) / 2)))
    if r < 1.0:
        k = np.array([r * 0.5, 1 - r, r * 0.5], np.float32)
        k = k / k.sum()
        out = a
        for ax in (0, 1):
            out = np.apply_along_axis(lambda v: np.convolve(np.pad(v, 1, mode="edge"), k, "valid"), ax, out) if False else (
                k[0] * np.roll(out, 1, ax) + k[1] * out + k[2] * np.roll(out, -1, ax))
        return out.astype(np.float32)
    out = a.astype(np.float32)
    for _ in range(3):
        out = _box(out, b, 0)
        out = _box(out, b, 1)
    return out


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def layer(base, color, alpha):
    """alpha: HxW in 0..1, color: rgb or HxWx3"""
    a = alpha[..., None]
    return base * (1 - a) + np.asarray(color, np.float32) * a


def add(base, color, amount):
    return base + np.asarray(color, np.float32) * amount[..., None]


def mask_from(draw_fn, w=W, h=H, ss=2, feather=0):
    im = Image.new("L", (w * ss, h * ss), 0)
    d = ImageDraw.Draw(im)
    draw_fn(d, ss)
    im = im.resize((w, h), Image.LANCZOS)
    m = np.asarray(im, np.float32) / 255
    return blur(m, feather) if feather else m


def radial(cx, cy, r, w=W, h=H, power=2.0):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
    return np.clip(1 - d, 0, 1) ** power


def glow_falloff(cx, cy, r, w=W, h=H):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r)
    return 1 / (1 + d2 * 6)


def stars(img, count, region_h, seed=1, big=0.02, tint=None, mask=None):
    r = np.random.default_rng(seed)
    h, w, _ = img.shape
    pts = canvas(w, h)
    halo = canvas(w, h)
    xs = r.integers(0, w, count)
    ys = (r.random(count) ** 1.4 * region_h).astype(int)
    for x, y in zip(xs, ys):
        b = r.random() ** 3
        temp = r.random()
        c = mix(hexc("#ffd9b0"), hexc("#bcd2ff"), temp) if tint is None else tint
        pts[y, x] += c * (0.35 + 1.6 * b)
        if r.random() < big:
            halo[y, x] += c * 40
    pts = blur(pts, 1.0) * 2.4
    halo = blur(halo, 6) + blur(halo, 1.5) * 0.4
    if mask is not None:
        pts *= mask[..., None]
        halo *= mask[..., None]
    return img + pts + halo


def moon(img, cx, cy, r, color="#fff1d6", halo="#ffe2a8", seed=3, halo_amt=0.9, craters=True):
    h, w, _ = img.shape
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
    disc = smooth(1.0, 0.985, d)
    limb = np.clip(1 - d**2, 0, 1) ** 0.35
    tex = 1.0
    if craters:
        tex = 0.9 + 0.1 * fbm(w, h, r * 0.35, 5, seed)
        maria = smooth(0.55, 0.75, fbm(w, h, r * 0.7, 4, seed + 9))
        tex = tex * (1 - 0.14 * maria)
    col = hexc(color) * (0.62 + 0.3 * limb[..., None]) * np.asarray(tex)[..., None] * 0.95
    out = layer(img, col, disc)
    out = add(out, hexc(halo), glow_falloff(cx, cy, r * 2.2) * halo_amt * (1 - disc) * 0.55)
    out = add(out, hexc(halo), radial(cx, cy, r * 6, power=2.5) * 0.18 * halo_amt)
    return out, disc


def ridge(w, baseline, amp, scale, seed, octaves=5, rough=0.5):
    """returns y-coordinates (len w) of a mountain/hill skyline"""
    line = fbm(w, 3, scale, octaves, seed, rough)[1]
    line = (line - line.min()) / (line.max() - line.min() + 1e-6)
    return baseline - line * amp


def fill_below(ys, w=W, h=H, feather=0.8):
    y = np.arange(h, dtype=np.float32)[:, None]
    return np.clip((y - ys[None, :]) / max(feather, 1e-3) + 0.5, 0, 1)


def rim(mask, dx, dy, width=3, w=W, h=H):
    """bright edge on the side facing (dx, dy) — light comes from that direction"""
    shifted = np.roll(np.roll(mask, int(-dy * width), 0), int(-dx * width), 1)
    edge = np.clip(mask - shifted, 0, 1)
    return blur(edge, 1.2)


def reflect(img, horizon, strength=0.55, ripple=0.012, seed=4):
    h, w, _ = img.shape
    out = img.copy()
    rows = h - horizon
    src = img[max(0, horizon - rows) : horizon][::-1]
    if src.shape[0] < rows:
        pad = np.repeat(src[-1:], rows - src.shape[0], 0)
        src = np.concatenate([src, pad], 0)
    n = fbm(w, rows, 60, 3, seed)
    yy = np.arange(rows)[:, None]
    depth = (yy / rows)
    shift = ((np.sin(yy * 0.9 + n * 12) * (2 + depth * 40)) * ripple * 60).astype(int)
    xs = (np.arange(w)[None, :] + shift) % w
    refl = src[np.arange(rows)[:, None], xs]
    refl = blur(refl, 1.5)
    out[horizon:] = mix(out[horizon:], refl, strength * (1 - depth[..., None] * 0.35))
    return out


def fog(img, y0, y1, color, amount, seed=11, scale=500):
    h, w, _ = img.shape
    y = np.arange(h, dtype=np.float32)[:, None]
    band = smooth(y0 - (y1 - y0) * 0.6, y0, y) * (1 - smooth(y1, y1 + (y1 - y0) * 0.8, y))
    n = fbm(w, h, scale, 5, seed)
    a = band * smooth(0.35, 0.8, n) * amount
    return layer(img, hexc(color), a)


def bloom(img, thresh=0.75, radius=28, amount=0.55):
    lum = img.mean(-1)
    bright = img * smooth(thresh, thresh + 0.4, lum)[..., None]
    return img + blur(bright, radius) * amount + blur(bright, radius / 4) * amount * 0.5


def finish(img, shadows="#070b1e", grain=0.035, vignette=0.55, seed=99):
    h, w, _ = img.shape
    # filmic shoulder
    img = 1 - np.exp(-img * 1.15)
    img = img / (1 - np.exp(-1.15))
    # lift shadows toward a coloured night
    img = img + hexc(shadows) * (1 - img) * 0.35
    # vignette
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x - w / 2) / (w * 0.62)) ** 2 + ((y - h * 0.45) / (h * 0.7)) ** 2)
    img = img * (1 - vignette * smooth(0.55, 1.25, d))[..., None]
    # grain
    g = np.random.default_rng(seed).normal(0, 1, (h, w)).astype(np.float32)
    img = img + blur(g, 0.6)[..., None] * grain
    return np.clip(img, 0, 1)


def save(img, path, quality=80):
    Image.fromarray((img * 255).astype(np.uint8), "RGB").save(path, "JPEG", quality=quality, optimize=True, progressive=True, subsampling=0)


def bezier(pts, n=24):
    """Catmull-Rom through points -> smooth polyline"""
    pts = np.asarray(pts, np.float32)
    out = []
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[min(i + 2, len(pts) - 1)]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return [tuple(p) for p in out]
