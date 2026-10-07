"""Dream Worlds key art — one painterly matte painting per world."""
import numpy as np
from PIL import Image, ImageDraw
from kit import *  # noqa


def clouds(img, y0, y1, lit, dark, amount, seed, light_xy=None, scale=520):
    h, w, _ = img.shape
    n = fbm(w, h, scale, 6, seed, 0.55)
    y = np.arange(h, dtype=np.float32)[:, None]
    band = smooth(y0, y0 + (y1 - y0) * 0.35, y) * (1 - smooth(y1 - (y1 - y0) * 0.3, y1, y))
    dens = smooth(0.48, 0.72, n) * band
    # light the cloud tops: compare with density shifted toward the light
    shade = np.clip(dens - np.roll(dens, -6, 0), 0, 1)
    col = mix(hexc(dark), hexc(lit), np.clip(shade * 6 + 0.15, 0, 1)[..., None])
    if light_xy is not None:
        col = col + hexc(lit) * glow_falloff(*light_xy, 420)[..., None] * 0.9
    return layer(img, col, dens * amount)


def sea():
    img = vgrad([(0, "#03061a"), (0.35, "#0b1636"), (0.62, "#1e3459"), (0.66, "#2b4366"), (1, "#020611")])
    hz = 830
    mx, my, mr = 1330, 330, 120
    img = add(img, hexc("#f2c98a"), glow_falloff(mx, my + 160, 1000) * 0.28)
    img = stars(img, 1700, hz, seed=3)
    img = clouds(img, 140, 620, "#e9d2ad", "#0c1430", 0.8, 21, (mx, my), scale=700)
    img, _ = moon(img, mx, my, mr)
    img = clouds(img, 460, 780, "#c7b49a", "#0a1229", 0.6, 33, (mx, my), scale=480)
    # distant headlands, hazy with distance
    for x0, x1, top, seed, haze in [(-200, 640, 720, 5, 0.35), (1460, 2200, 745, 6, 0.45), (960, 1180, 808, 7, 0.6)]:
        xs = np.arange(W, dtype=np.float32)
        prof = np.clip(1 - ((xs - (x0 + x1) / 2) / ((x1 - x0) / 2)) ** 2, 0, 1)
        rough = fbm(W, 3, 50, 5, seed, 0.6)[1]
        rid = hz - prof ** 0.7 * (hz - top) * (0.7 + 0.5 * rough)
        m = fill_below(rid, feather=1.2) * (np.arange(H)[:, None] < hz + 1)
        img = layer(img, mix(hexc("#0b1530"), hexc("#3b4f7a"), haze), m)
    lan = canvas()
    for x, y in [(170, 768), (240, 760), (310, 774), (1620, 790), (1720, 784), (1050, 812)]:
        lan[y, x] = hexc("#ffc87a") * 90
    img += blur(lan, 1.5) + blur(lan, 8) * 0.5
    # sea
    img[hz:] = vgrad([(0, "#132842"), (1, "#01040b")], W, H - hz)
    img = reflect(img, hz, strength=0.55)
    yy, xx = np.mgrid[hz:H, 0:W].astype(np.float32)
    depth = (yy - hz) / (H - hz)
    width = 50 + depth * 420
    col = np.exp(-((xx - mx) / width) ** 2)
    # long horizontal glints, finer near the horizon
    glint = fbm(W, H - hz, 14, 4, 12, 0.5, stretch=9)
    glint = smooth(0.6, 0.78, glint) * (0.6 + 0.4 * noise(W, H - hz, 400, 13))
    img[hz:] += hexc("#ffdca0")[None, None] * (col * glint * (1.1 - depth * 0.3))[..., None] * 1.5
    swell = fbm(W, H - hz, 26, 3, 14, 0.5, stretch=8)
    img[hz:] *= (0.86 + 0.22 * smooth(0.4, 0.7, swell))[..., None]
    img = fog(img, hz - 50, hz + 30, "#7b8fb5", 0.3, seed=15)

    bx, by = 520, 905
    def hull(d, s):
        S = lambda pts: [(x * s, y * s) for x, y in pts]
        h_ = bezier([(bx - 40, by - 95), (bx + 120, by - 80), (bx + 520, by - 78), (bx + 600, by - 120)], 12)
        h_ += [(bx + 560, by - 40), (bx + 470, by), (bx + 60, by), (bx - 10, by - 50)]
        d.polygon(S(h_), fill=255)
        d.polygon(S([(bx + 440, by - 120), (bx + 600, by - 125), (bx + 590, by - 95), (bx + 440, by - 90)]), fill=255)
        d.line(S([(bx - 30, by - 100), (bx - 180, by - 135)]), fill=255, width=int(6 * s))
        for mxp, top in [(bx + 110, by - 610), (bx + 290, by - 700), (bx + 450, by - 560)]:
            d.rectangle(S([(mxp - 4, top), (mxp + 4, by - 80)]), fill=255)
            for k in range(3):
                d.line(S([(mxp - 120 + k * 8, top + 40 + k * 150), (mxp + 120 - k * 8, top + 40 + k * 150)]), fill=255, width=int(4 * s))

    def rigging(d, s):
        S = lambda pts: [(x * s, y * s) for x, y in pts]
        d.line(S([(bx - 180, by - 135), (bx + 110, by - 610)]), fill=255, width=int(2 * s))
        for mxp, top in [(bx + 110, by - 610), (bx + 290, by - 700), (bx + 450, by - 560)]:
            for dx in (-150, -90, 90, 150):
                d.line(S([(mxp, top + 20), (mxp + dx, by - 88)]), fill=255, width=max(1, int(1.2 * s)))
        d.polygon(S([(bx + 290, by - 700), (bx + 345, by - 690), (bx + 290, by - 680)]), fill=255)

    def sails(d, s):
        S = lambda pts: [(x * s, y * s) for x, y in pts]
        for mxp, top, n in [(bx + 110, by - 610, 3), (bx + 290, by - 700, 3), (bx + 450, by - 560, 2)]:
            for k in range(n):
                y0 = top + 42 + k * 150
                wdt = 118 - k * 6
                up = bezier([(mxp - wdt, y0), (mxp, y0 + 10), (mxp + wdt, y0)], 10)
                low = bezier([(mxp + wdt - 14, y0 + 128), (mxp + 10, y0 + 150), (mxp - wdt + 10, y0 + 128)], 10)
                d.polygon(S(up + low), fill=255)
        d.polygon(S([(bx + 105, by - 560), (bx - 160, by - 140), (bx + 100, by - 130)]), fill=255)  # jib

    hm, rm, sm = mask_from(hull), mask_from(rigging), mask_from(sails)
    # moonlit canvas: lit on the moon side, falling into shadow, with cloth folds
    xs = np.arange(W, dtype=np.float32)[None, :]
    folds = 0.75 + 0.25 * fbm(W, H, 70, 3, 16, 0.5, stretch=0.25)
    lit = smooth(bx - 200, bx + 700, xs) * folds
    sail_col = mix(hexc("#151b38"), hexc("#c9bca3"), (lit ** 1.4 * 0.62)[..., None])
    img = layer(img, hexc("#05080f"), rm * 0.85)
    img = layer(img, sail_col, sm * 0.97)
    img = add(img, hexc("#ffe6b8"), rim(sm, 1, 0, 2) * 0.5)
    img = layer(img, hexc("#05080f"), hm)
    img = add(img, hexc("#ffd9a0"), rim(hm, 1, -1, 2) * 0.35)
    lan = canvas()
    for x, y in [(560, 845), (720, 848), (880, 846), (1040, 838), (1110, 788)]:
        lan[y, x] = hexc("#ffb85c") * 120
    img += blur(lan, 2) + blur(lan, 12) * 0.7
    # ship reflection
    m_all = np.maximum(np.maximum(hm, sm * 0.6), rm * 0.5)
    refl = np.zeros_like(m_all)
    n = H - by
    refl[by:] = m_all[by - n : by][::-1]
    refl = blur(refl, 5) * 0.5 * (1 - smooth(by, by + 300, np.arange(H)[:, None]))
    img = layer(img, hexc("#02050c"), refl)
    img = bloom(img, 0.8, 30, 0.45)
    return finish(img, "#08102a")


def space():
    img = vgrad([(0, "#02030b"), (0.5, "#070b24"), (1, "#0c0f2e")])
    # nebula: two coloured fbm clouds
    n1 = fbm(W, H, 700, 7, 41, 0.55)
    n2 = fbm(W, H, 500, 7, 42, 0.55)
    neb = smooth(0.45, 0.85, n1) * radial(700, 420, 1100, power=1.2)
    img = add(img, hexc("#6d4fd0"), neb * 0.55)
    img = add(img, hexc("#3b7bf0"), smooth(0.5, 0.9, n2) * radial(1300, 300, 900, power=1.4) * 0.45)
    img = add(img, hexc("#f2a6c8"), smooth(0.62, 0.95, n1 * n2 * 1.8) * radial(800, 380, 700) * 0.35)
    dust = smooth(0.55, 0.75, fbm(W, H, 220, 6, 43))
    img = layer(img, hexc("#05060f"), dust * 0.35 * radial(900, 450, 1200, power=0.8))
    img = stars(img, 5200, H, seed=44, big=0.03)
    # ringed planet
    px, py, pr = 1380, 470, 300
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt((x - px) ** 2 + (y - py) ** 2) / pr
    disc = smooth(1.0, 0.99, d)
    lx, ly = (x - px) / pr, (y - py) / pr
    light = np.clip(-0.65 * lx - 0.55 * ly + 0.55 * np.sqrt(np.clip(1 - d**2, 0, 1)), 0, 1)
    bands = 0.5 + 0.5 * np.sin((ly + 0.25 * fbm(W, H, 160, 4, 45)) * 13)
    pc = mix(hexc("#2a2470"), hexc("#d9c7ff"), bands[..., None] * 0.16 + 0.3) * (0.08 + 1.1 * light[..., None] ** 1.3)
    # ring behind/front split
    def ring_mask(front):
        t = np.radians(-14)
        rx = (x - px) * np.cos(t) - (y - py) * np.sin(t)
        ry = (x - px) * np.sin(t) + (y - py) * np.cos(t)
        e = np.sqrt((rx / (pr * 1.9)) ** 2 + (ry / (pr * 0.38)) ** 2)
        band = smooth(0.78, 0.82, e) * (1 - smooth(0.97, 1.0, e)) * (0.6 + 0.4 * np.sin(e * 90) ** 2)
        side = (ry > 0) if front else (ry <= 0)
        return band * side
    rb = ring_mask(False)
    img = layer(img, hexc("#b9a6ee") * 0.9, rb * 0.55 * (1 - disc))
    img = add(img, hexc("#7f6cf0"), glow_falloff(px, py, pr * 1.5) * 0.25)
    img = layer(img, pc, disc)
    img = add(img, hexc("#bfd4ff"), rim(disc, -0.8, -0.6, 4) * 1.4)
    rf = ring_mask(True)
    img = layer(img, hexc("#d8ccff") * 0.95, rf * 0.75)
    # small moon
    img, _ = moon(img, 420, 230, 46, "#dfe6ff", "#9fb8ff", seed=46, halo_amt=0.6)
    # planet horizon in foreground
    hz = mask_from(lambda dr, s: dr.ellipse([(-1200 * s, 1010 * s), (3200 * s, 3400 * s)], fill=255), feather=1.5)
    img = layer(img, mix(hexc("#060818"), hexc("#141a40"), 0.3), hz)
    edge = rim(hz, 0, -1, 4)
    img = add(img, hexc("#7fb2ff"), edge * 1.8 + blur(edge, 18) * 1.5)
    atm = blur(edge, 40)
    img = add(img, hexc("#4b7bf0"), atm * 2.5)
    # starship silhouette with engine glow
    def ship(d, s):
        S = lambda pts: [(px_ * s, py_ * s) for px_, py_ in pts]
        body = bezier([(330, 748), (520, 724), (900, 716), (1140, 726), (1230, 738)], 10) + bezier([(1230, 741), (1100, 752), (760, 762), (430, 768), (330, 760)], 10)
        d.polygon(S(body), fill=255)
        d.polygon(S([(470, 728), (560, 690), (700, 690), (760, 722)]), fill=255)
        d.polygon(S([(420, 764), (470, 792), (620, 794), (660, 764)]), fill=255)
    sm = mask_from(ship)
    img = layer(img, hexc("#0b0f22"), sm)
    img = add(img, hexc("#c9d8ff"), rim(sm, 0.6, -0.8, 3) * 1.3)
    lights = canvas()
    for i in range(16):
        lights[742, 480 + i * 44] = hexc("#bfe0ff") * 30
    eng = canvas()
    eng[754, 332] = hexc("#8fd0ff") * 700
    img += blur(lights, 1.5) + blur(eng, 6) + blur(eng, 30) * 0.8 + blur(eng, 90) * 0.4
    trail = mask_from(lambda dr, s: dr.polygon([(0, 750 * s), (330 * s, 755 * s), (330 * s, 770 * s), (0, 790 * s)], fill=255), feather=10)
    img = add(img, hexc("#6fb4ff"), trail * smooth(0, 330, np.arange(W)[None, :]) * 0.6)
    img = bloom(img, 0.65, 34, 0.6)
    return finish(img, "#070a24")


def academy():
    img = vgrad([(0, "#04031a"), (0.5, "#16123e"), (0.68, "#3a2f6e"), (1, "#05040f")])
    m1x, m1y = 1420, 260
    img = add(img, hexc("#c8b8ff"), glow_falloff(m1x, m1y + 200, 900) * 0.35)
    img = stars(img, 2400, 700, seed=51)
    img = clouds(img, 180, 560, "#d8ccf5", "#120f30", 0.6, 52, (m1x, m1y))
    img, _ = moon(img, m1x, m1y, 120, "#f4ecff", "#c9b8ff", seed=53)
    img, _ = moon(img, 1650, 420, 34, "#ffe9c4", "#ffcf8a", seed=54, halo_amt=0.5)
    hz = 860
    # far mountains with atmospheric perspective
    for base, amp, scale, seed, c, a in [(700, 260, 500, 55, "#2c265e", 0.85), (790, 200, 350, 56, "#1b1844", 0.95)]:
        r = ridge(W, base, amp, scale, seed)
        img = layer(img, hexc(c), fill_below(r, feather=1.5) * a)
    img = fog(img, 640, 790, "#6a5ca8", 0.35, seed=57)
    # castle on cliff
    def castle(d, s):
        S = lambda pts: [(x * s, y * s) for x, y in pts]
        cliff = bezier([(380, 900), (470, 760), (600, 700), (900, 690), (1150, 720), (1260, 820), (1300, 900)], 10)
        d.polygon(S(cliff), fill=255)
        towers = [(560, 520, 60, 130), (650, 380, 70, 190), (760, 250, 86, 240), (880, 400, 64, 170), (980, 470, 74, 150), (1080, 560, 56, 110)]
        for x, top, wdt, roof in towers:
            d.rectangle(S([(x - wdt / 2, top), (x + wdt / 2, 760)]), fill=255)
            d.polygon(S([(x - wdt / 2 - 10, top), (x, top - roof), (x + wdt / 2 + 10, top)]), fill=255)
        d.rectangle(S([(560, 560), (1090, 740)]), fill=255)
        d.polygon(S([(600, 560), (690, 470), (820, 470), (900, 560)]), fill=255)
    cm = mask_from(castle)
    img = layer(img, hexc("#0b0920"), cm)
    img = add(img, hexc("#cbbcff"), rim(cm, 1, -0.6, 3) * 1.3)
    win = canvas()
    r = np.random.default_rng(58)
    for _ in range(70):
        x, y = int(r.uniform(570, 1080)), int(r.uniform(300, 730))
        if cm[y, x] > 0.9 and cm[y - 8, x] > 0.9:
            win[y : y + 9, x : x + 4] = hexc("#ffcf80") * r.uniform(1.2, 2.6)
    img += win + blur(win, 6) * 1.2
    # lake + reflection
    img[hz:] = vgrad([(0, "#191545"), (1, "#020208")], W, H - hz)
    img = reflect(img, hz, 0.7)
    yy, xx = np.mgrid[hz:H, 0:W].astype(np.float32)
    col = np.exp(-((xx - m1x) / (60 + (yy - hz) * 0.8)) ** 2)
    img[hz:] += hexc("#d9ccff") * (col * smooth(0.6, 0.78, fbm(W, H - hz, 14, 4, 59, 0.5, stretch=9)))[..., None] * 0.9
    img = fog(img, hz - 40, hz + 40, "#8a7fd0", 0.3, seed=60)
    # foreground pines
    pines = mask_from(lambda d, s: [d.polygon([((x) * s, 1250 * s), ((x + 40) * s, (1250 - h_) * s), ((x + 80) * s, 1250 * s)], fill=255) for x, h_ in [(-20, 420), (40, 520), (110, 380), (1800, 460), (1880, 560), (1950, 400)]])
    img = layer(img, hexc("#03030a"), pines)
    img = bloom(img, 0.7, 30, 0.55)
    return finish(img, "#0a0824")


def kingdom():
    img = vgrad([(0, "#020a0b"), (0.45, "#06221f"), (0.7, "#0f3e36"), (1, "#020807")])
    img = stars(img, 1800, 700, seed=61, tint=None)
    aur = fbm(W, H, 600, 5, 62)
    img = add(img, hexc("#5fe0a8"), smooth(0.55, 0.85, aur) * radial(1000, 200, 1300, power=1.5) * 0.35)
    img, _ = moon(img, 380, 230, 70, "#f6f1dc", "#bff0d4", seed=63, halo_amt=0.7)
    hz = 900
    for base, amp, scale, seed, c in [(760, 180, 500, 64, "#123c35"), (840, 120, 300, 65, "#0a2a25")]:
        img = layer(img, hexc(c), fill_below(ridge(W, base, amp, scale, seed), feather=1.5))
    # glowing glass spires
    r = np.random.default_rng(66)
    spires = canvas()
    smask = np.zeros((H, W), np.float32)
    for i in range(15):
        cx = 900 + i * 52 + r.uniform(-14, 14)
        hgt = 160 + np.sin(i / 14 * np.pi) * 430 + r.uniform(0, 60)
        wdt = r.uniform(26, 44)
        top = 820 - hgt
        m = mask_from(lambda d, s: d.polygon([((cx - wdt / 2) * s, 830 * s), ((cx - wdt / 2) * s, top * s), (cx * s, (top - 90 - r.uniform(0, 40)) * s), ((cx + wdt / 2) * s, top * s), ((cx + wdt / 2) * s, 830 * s)], fill=255))
        shade = 0.5 + 0.5 * np.clip((np.arange(W)[None, :] - cx) / wdt, -1, 1)
        g = mix(hexc("#1f8a66"), hexc("#9ff0c8"), (1 - shade[..., None]) * 0.8) * (0.35 + 0.4 * smooth(830, top, np.arange(H)[:, None])[..., None])
        spires = spires * (1 - m[..., None]) + g * m[..., None]
        smask = np.maximum(smask, m)
    img = layer(img, spires, smask * 0.95)
    img += blur(spires * smask[..., None], 22) * 0.35 + blur(spires * smask[..., None], 80) * 0.3
    win = canvas()
    for _ in range(140):
        x, y = int(r.uniform(880, 1700)), int(r.uniform(300, 820))
        if smask[y, x] > 0.95:
            win[y : y + 6, x : x + 3] = hexc("#fff0b8") * r.uniform(1.5, 3)
    img += win + blur(win, 5)
    img = fog(img, 760, 880, "#6fd6a8", 0.35, seed=67)
    # meadow
    meadow = fill_below(ridge(W, 930, 50, 400, 68), feather=2)
    img = layer(img, mix(hexc("#071a15"), hexc("#0d2b22"), 0.5), meadow)
    road = mask_from(lambda d, s: d.line([(xx * s, yy * s) for xx, yy in bezier([(300, 1250), (600, 1080), (850, 960), (1040, 870)], 20)], fill=255, width=int(16 * s)), feather=6)
    img = add(img, hexc("#ffe7a8"), road * 0.9)
    fl = canvas()
    for _ in range(260):
        x, y = int(r.uniform(0, W)), int(r.uniform(950, H - 5))
        fl[y, x] = (hexc("#ffd27a") if r.random() < 0.4 else hexc("#9fffd0")) * r.uniform(2, 7)
    img += blur(fl, 1.5) + blur(fl, 6) * 0.5
    img = bloom(img, 0.65, 32, 0.6)
    return finish(img, "#04130f")


def blocks():
    img = vgrad([(0, "#03101a"), (0.55, "#0b2a33"), (1, "#081a1c")])
    img = stars(img, 1800, 800, seed=71)
    img = clouds(img, 500, 1100, "#9fd8c8", "#0b2228", 0.5, 72, (1500, 220))
    img, _ = moon(img, 1500, 220, 80, "#fff3d0", "#ffe0a0", seed=73, halo_amt=0.7, craters=False)

    def cube_faces(cx, cy, s):
        top = [(cx, cy - s / 2), (cx + s, cy), (cx, cy + s / 2), (cx - s, cy)]
        left = [(cx - s, cy), (cx, cy + s / 2), (cx, cy + s * 1.5), (cx - s, cy + s)]
        right = [(cx + s, cy), (cx, cy + s / 2), (cx, cy + s * 1.5), (cx + s, cy + s)]
        return top, left, right

    def island(img, ox, oy, s, n, depth, seed, houses=()):
        """Draw a floating voxel island in painter's order onto one supersampled layer."""
        r = np.random.default_rng(seed)
        SS = 2
        lay = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        c8 = lambda c, k=1.0: tuple(int(min(255, v * 255 * k)) for v in c) + (255,)
        cols = {"top": hexc("#4fbf9f"), "left": hexc("#2b6b5c"), "right": hexc("#173d36"), "dl": hexc("#5a4632"), "dr": hexc("#3a2c20")}
        order = []
        for row in range(n):
            for col in range(n):
                order.append((0, row + col, ox + (col - row) * s, oy + (col + row) * s / 2))
        for k in range(1, depth + 1):
            for row in range(n - k):
                for col in range(n - k):
                    if r.random() < 0.85:
                        order.append((-k, row + col, ox + (col - row) * s + k * s * 0.0, oy + (col + row) * s / 2 + k * s * 1.9))
        order.sort(key=lambda t: (t[0], t[1]))
        P = lambda poly: [(x * SS, y * SS) for x, y in poly]
        for k, _, cx, cy in order:
            t, l, rr = cube_faces(cx, cy, s)
            v = 0.9 + 0.2 * r.random()
            d.polygon(P(t), fill=c8(cols["top"], v * (1.0 if k == 0 else 0.6)))
            d.polygon(P(l), fill=c8(cols["left"] if k == 0 else cols["dl"], v))
            d.polygon(P(rr), fill=c8(cols["right"] if k == 0 else cols["dr"], v))
        for hx, hy in houses:
            for poly, c in zip(cube_faces(hx, hy, s * 0.9), ["#c98f62", "#8a5a3c", "#5b3a28"]):
                d.polygon(P(poly), fill=c8(hexc(c)))
        lay = lay.resize((W, H), Image.LANCZOS)
        arr = np.asarray(lay, np.float32) / 255
        img = layer(img, arr[..., :3], arr[..., 3])
        for hx, hy in houses:
            win = canvas()
            win[int(hy + s * 0.55) : int(hy + s * 0.85), int(hx + s * 0.3) : int(hx + s * 0.5)] = hexc("#ffcf7a") * 2.5
            img += win + blur(win, 10) * 1.5
        return img

    img = island(img, 430, 640, 30, 4, 3, 74)
    img = island(img, 1050, 360, 52, 7, 5, 75, houses=[(990, 430), (1110, 480), (1050, 560)])
    img = island(img, 1660, 700, 34, 4, 3, 76, houses=[(1660, 740)])
    # lighthouse
    lh = mask_from(lambda d, s: d.rectangle([(1238 * s, 300 * s), (1258 * s, 470 * s)], fill=255))
    img = layer(img, hexc("#d8e8e0"), lh)
    beam = canvas()
    beam[292, 1248] = hexc("#ffe2a0") * 600
    img += blur(beam, 6) + blur(beam, 40) * 0.8
    cone = mask_from(lambda d, s: d.polygon([(1248 * s, 292 * s), (2000 * s, 170 * s), (2000 * s, 390 * s)], fill=255), feather=25)
    img = add(img, hexc("#ffe2a0"), cone * 0.12)
    wf = mask_from(lambda d, s: d.rectangle([(1150 * s, 600 * s), (1164 * s, 1250 * s)], fill=255), feather=3)
    img = add(img, hexc("#8fe6ff"), wf * smooth(1250, 600, np.arange(H)[:, None]) * 0.6)
    img = fog(img, 900, 1150, "#4f9f8f", 0.4, seed=77)
    fire = canvas()
    r = np.random.default_rng(78)
    for _ in range(80):
        fire[int(r.uniform(150, 1100)), int(r.uniform(0, W))] = hexc("#f5d27a") * r.uniform(5, 20)
    img += blur(fire, 2) + blur(fire, 8) * 0.4
    img = bloom(img, 0.7, 28, 0.55)
    return finish(img, "#041016")


def stadium():
    img = vgrad([(0, "#02050c"), (0.5, "#07142a"), (1, "#040a14")])
    img = stars(img, 900, 400, seed=81)
    # mist
    img = add(img, hexc("#3a5a8a"), smooth(0.4, 0.8, fbm(W, H, 600, 5, 82)) * 0.25)
    # stands bowl
    bowl = mask_from(lambda d, s: d.polygon([(x * s, y * s) for x, y in bezier([(-50, 640), (500, 540), (1000, 510), (1500, 540), (2050, 640)], 20)] + [(2050 * s, 900 * s), (-50 * s, 900 * s)], fill=255))
    img = layer(img, hexc("#0a1428"), bowl)
    r = np.random.default_rng(83)
    seats = canvas()
    for _ in range(9000):
        x, y = int(r.uniform(0, W)), int(r.uniform(560, 860))
        if bowl[y, x] > 0.9:
            seats[y, x] = mix(hexc("#3f7cd6"), hexc("#e9e2c9"), r.random()) * r.uniform(0.2, 0.9)
    img += blur(seats, 0.8)
    # pitch
    pitch = mask_from(lambda d, s: d.polygon([(-300 * s, 1250 * s), (420 * s, 820 * s), (1580 * s, 820 * s), (2300 * s, 1250 * s)], fill=255))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    stripes = (np.floor(((xx - 1000) / (yy - 600 + 1e-3)) * 6) % 2)
    grass = mix(hexc("#0f3a26"), hexc("#16502f"), stripes[..., None] * 0.6)
    img = layer(img, grass, pitch)
    lines = mask_from(lambda d, s: (d.line([(1000 * s, 820 * s), (1000 * s, 1250 * s)], fill=255, width=int(4 * s)), d.ellipse([(800 * s, 900 * s), (1200 * s, 1010 * s)], outline=255, width=int(4 * s))), feather=0.8)
    img = add(img, hexc("#ffffff"), lines * pitch * 0.35)
    # floodlights + volumetric beams
    for fx in (220, 1780):
        tower = mask_from(lambda d, s: (d.rectangle([((fx - 6) * s, 250 * s), ((fx + 6) * s, 700 * s)], fill=255), d.rectangle([((fx - 70) * s, 205 * s), ((fx + 70) * s, 260 * s)], fill=255)))
        img = layer(img, hexc("#05080f"), tower)
        lamps = canvas()
        for j in range(10):
            lamps[215 + (j // 5) * 26, fx - 56 + (j % 5) * 28] = hexc("#fff4dc") * 260
        img += blur(lamps, 3) + blur(lamps, 30) * 0.9 + blur(lamps, 120) * 0.7
        tx = 1000
        beam = mask_from(lambda d, s: d.polygon([((fx - 60) * s, 230 * s), ((fx + 60) * s, 240 * s), ((tx + (fx - 1000) * 0.15 + 350) * s, 1100 * s), ((tx + (fx - 1000) * 0.15 - 350) * s, 1100 * s)], fill=255), feather=40)
        img = add(img, hexc("#dfe8ff"), beam * smooth(0.3, 0.7, fbm(W, H, 300, 4, fx)) * 0.22)
    img = fog(img, 780, 900, "#9fb6e0", 0.3, seed=84)
    img = bloom(img, 0.7, 30, 0.55)
    return finish(img, "#050b18")


def train():
    img = vgrad([(0, "#010509"), (0.5, "#05141c"), (1, "#0a1a22")])
    img = stars(img, 2600, 900, seed=91)
    # aurora curtains
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    for k, (c, amp, base, seed) in enumerate([("#6dffc0", 120, 300, 92), ("#b58cff", 90, 200, 93)]):
        curve = base + np.sin(x[0] / 260 + k) * amp + (fbm(W, 3, 300, 4, seed)[1] - 0.5) * 200
        dy = y - curve[None, :]
        streaks = 0.35 + 0.65 * fbm(W, H, 14, 3, seed + 1, 0.5, stretch=0.06)
        body = np.exp(-np.clip(dy, 0, None) / 200) * smooth(-220, 30, dy) ** 2 * streaks
        body *= 0.6 + 0.4 * fbm(W, H, 500, 3, seed + 2)
        img = add(img, hexc(c), body * (0.42 if k == 0 else 0.28))
    for base, amp, scale, seed, c in [(760, 360, 420, 94, "#0f2833"), (840, 220, 300, 95, "#0a1c24")]:
        rr = ridge(W, base, amp, scale, seed, rough=0.55)
        m = fill_below(rr, feather=1.5)
        img = layer(img, hexc(c), m)
        snow = m * smooth(60, 0, y - rr[None, :]) * smooth(0.4, 0.7, fbm(W, H, 50, 4, seed + 3))
        img = add(img, hexc("#bfe8f0"), snow * 0.45)
    ground = fill_below(np.full(W, 930.0), feather=2)
    img = layer(img, hexc("#1c3540"), ground)
    img = add(img, hexc("#9fe8d8"), ground * smooth(1250, 930, y) * 0.12)
    # train
    def tr(d, s):
        for i in range(8):
            x0 = 180 + i * 182
            d.rounded_rectangle([(x0 * s, 860 * s), ((x0 + 172) * s, 928 * s)], radius=int(10 * s), fill=255)
        d.polygon([(1636 * s, 860 * s), (1720 * s, 860 * s), (1780 * s, 900 * s), (1780 * s, 928 * s), (1636 * s, 928 * s)], fill=255)
        d.rectangle([(0, 930 * s), (2000 * s, 938 * s)], fill=255)
    tm = mask_from(tr)
    img = layer(img, hexc("#05090e"), tm)
    img = add(img, hexc("#9fe8d8"), rim(tm, 0, -1, 2) * 0.8)
    win = canvas()
    r = np.random.default_rng(96)
    for i in range(8):
        for j in range(6):
            x0 = 180 + i * 182 + 16 + j * 26
            win[874:894, x0 : x0 + 16] = hexc("#ffd28c") * r.uniform(1.0, 2.2)
    img += win + blur(win, 10) * 1.2 + blur(win, 40) * 0.4
    head = canvas()
    head[905, 1775] = hexc("#fff4d8") * 500
    img += blur(head, 5) + blur(head, 40)
    cone = mask_from(lambda d, s: d.polygon([(1775 * s, 905 * s), (2000 * s, 840 * s), (2000 * s, 980 * s)], fill=255), feather=20)
    img = add(img, hexc("#fff4d8"), cone * 0.25)
    # falling snow
    sn = canvas()
    for _ in range(1400):
        sn[int(r.uniform(0, H)), int(r.uniform(0, W))] = hexc("#ffffff") * r.uniform(0.6, 2.5)
    img += blur(sn, 1.2)
    img = bloom(img, 0.6, 30, 0.6)
    return finish(img, "#03101a")


def garden():
    img = vgrad([(0, "#02080a"), (0.6, "#0a1f1b"), (1, "#030a08")])
    img = stars(img, 1500, 600, seed=101)
    img, _ = moon(img, 1650, 190, 60, "#fbf3dc", "#e0d2ff", seed=102, halo_amt=0.6)
    cx, base = 1000, 960
    dome = mask_from(lambda d, s: d.polygon([(x * s, y * s) for x, y in [(cx - 560, base), (cx - 560, base - 300)] + bezier([(cx - 560, base - 300), (cx - 420, base - 560), (cx, base - 660), (cx + 420, base - 560), (cx + 560, base - 300)], 20) + [(cx + 560, base)]], fill=255))
    inner = smooth(0.0, 1.0, radial(cx, base - 250, 700, power=1.0))
    img = add(img, hexc("#f0d9a0"), dome * inner * 0.42)
    img = add(img, hexc("#b7a6ff"), dome * radial(cx + 200, base - 400, 600, power=1.5) * 0.3)
    # lush foliage inside the glasshouse, silhouetted against the warm glow
    r = np.random.default_rng(103)
    leaves = fbm(W, H, 46, 4, 105, 0.55)
    yy = np.arange(H, dtype=np.float32)[:, None]
    canopy = ridge(W, base - 120, 260, 260, 106, rough=0.6)
    foliage = smooth(-30, 30, yy - canopy[None, :] + (leaves - 0.5) * 140) * dome
    img = layer(img, mix(hexc("#071510"), hexc("#12301f"), (leaves * 0.6)[..., None]), foliage * 0.94)
    img = add(img, hexc("#f0d9a0"), rim(foliage, 0, -1, 3) * dome * 0.35)
    # lattice
    lat = mask_from(lambda d, s: [d.line([((cx - 560 + i * 70) * s, base * s), ((cx - 560 + i * 70) * s, (base - 300 - 330 * np.sin(np.pi * i / 16)) * s)], fill=255, width=int(2 * s)) for i in range(17)] + [d.line([((cx - 560) * s, (base - 60 * k) * s), ((cx + 560) * s, (base - 60 * k) * s)], fill=255, width=int(2 * s)) for k in range(1, 6)], feather=0.6) * dome
    img = add(img, hexc("#fff0c8"), lat * 0.35)
    edge = rim(dome, 0, -1, 3)
    img = add(img, hexc("#fff0c8"), edge * 1.2)
    img += blur(img * dome[..., None], 50) * 0.12
    # pond
    img[base:] = vgrad([(0, "#0d241e"), (1, "#010403")], W, H - base)
    img = reflect(img, base, 0.6)
    for _ in range(14):
        lx, ly = r.uniform(100, 1900), r.uniform(base + 40, H - 40)
        pad = mask_from(lambda d, s: d.ellipse([((lx - 50) * s, (ly - 10) * s), ((lx + 50) * s, (ly + 10) * s)], fill=255))
        img = layer(img, hexc("#1d4a38"), pad * 0.9)
        bud = canvas()
        bud[int(ly - 6), int(lx)] = hexc("#ffe6b0") * 300
        img += blur(bud, 3) + blur(bud, 14) * 0.6
    ff = canvas()
    for _ in range(120):
        ff[int(r.uniform(250, 1150)), int(r.uniform(0, W))] = hexc("#f6e2a0") * r.uniform(20, 70)
    img += blur(ff, 2) + blur(ff, 10) * 0.6
    img = fog(img, base - 60, base + 40, "#9fc8b0", 0.3, seed=104)
    img = bloom(img, 0.65, 30, 0.6)
    return finish(img, "#030c0a")


SCENES = {"sea": sea, "space": space, "academy": academy, "kingdom": kingdom, "blocks": blocks, "stadium": stadium, "train": train, "garden": garden}
