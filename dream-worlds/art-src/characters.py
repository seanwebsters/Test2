"""
Character portraits: each character is seen from behind, looking into their
world — rim-lit, with the world art soft-focused beyond them. No faces, no
likenesses; the silhouette, headwear and light carry the character.
"""
import json, os, re, sys, zlib
import numpy as np
from PIL import Image
from kit import hexc, mix, blur, smooth, layer, add, rim, bezier, fbm, radial, glow_falloff, finish, save, canvas
import kit

PW, PH = 640, 800
ROOT = os.path.join(os.path.dirname(__file__), "..")
ART = os.path.join(ROOT, "src", "assets", "art")
OUT = os.path.join(ART, "characters")
os.makedirs(OUT, exist_ok=True)

SCENE = {"starlight-armada": "space", "moonlit-academy": "academy", "endless-seas": "sea", "emerald-kingdom": "kingdom", "blocklands": "blocks", "stadium-nights": "stadium", "aurora-line": "train", "glasshouse-gardens": "garden"}
FOCUS = {"space": 0.62, "academy": 0.55, "sea": 0.6, "kingdom": 0.68, "blocks": 0.52, "stadium": 0.5, "train": 0.5, "garden": 0.5}
# where the key light sits in each world (x direction of the rim light)
LIGHT = {"space": 1, "academy": 1, "sea": 1, "kingdom": -1, "blocks": 1, "stadium": 1, "train": 1, "garden": 1}

# per-character styling beyond the data file's silhouette
STYLE = {
    "sea-captain": dict(hat="tricorn", hair="queue", coat=True),
    "old-barnaby": dict(hat="beanie", hair="short", build=1.12),
    "ilo-navigator": dict(hat=None, hair="long", scarf=True),
    "marisol-reyes": dict(hat=None, hair="bun", scarf=True),
    "star-admiral": dict(hat="peaked", hair="short", epaulettes=True, collar=True),
    "kestrel-vane": dict(hat=None, hair="short", scarf=True),
    "archive": dict(hat="hood", hair=None, halo=True),
    "tomas-ri": dict(hat="wide", hair="short"),
    "professor-quill": dict(hat=None, hair="tousled", collar=True, build=1.05),
    "wren-ashby": dict(hat=None, hair="long", scarf=True),
    "the-librarian": dict(hat="hood", hair=None),
    "felix-marsh": dict(hat=None, hair="tousled"),
    "sorrel-greenwitch": dict(hat="witch", hair="long"),
    "queen-alder": dict(hat="crown", hair="long", collar=True),
    "tin-sentinel": dict(hat="helm", hair=None, epaulettes=True, build=1.15),
    "pip-builder": dict(hat="cap", hair="short", pack=True),
    "bramble-golem": dict(creature="golem"),
    "nell-cartographer": dict(hat="wide", hair="bun"),
    "the-gaffer": dict(hat="flatcap", hair="short", coat=True, collar=True),
    "number-nine": dict(hat=None, hair="short", number="9"),
    "groundskeeper-ada": dict(hat="beanie", hair="long"),
    "booth-voice": dict(hat=None, hair="short", headphones=True, collar=True),
    "conductor-ferro": dict(hat="conductor", hair="short", coat=True, epaulettes=True),
    "ines-snowfield": dict(hat="beret", hair="long", scarf=True),
    "moss-gardener": dict(hat="wide", hair="short"),
    "lumen-moth": dict(creature="moth"),
}


def load_characters():
    src = open(os.path.join(ROOT, "src", "lib", "data", "characters.ts")).read()
    out = []
    for m in re.finditer(r'id: "([^"]+)", worldId: "([^"]+)".*?portrait: \{ silhouette: "([^"]+)", hue: "([^"]+)", accent: "([^"]+)"', src, re.S):
        out.append(dict(id=m[1], world=m[2], silhouette=m[3], hue=m[4], accent=m[5]))
    return out


def figure_mask(st, ss=3):
    from PIL import ImageDraw
    im = Image.new("L", (PW * ss, PH * ss), 0)
    d = ImageDraw.Draw(im)
    S = lambda pts: [(x * ss, y * ss) for x, y in pts]
    cx = PW / 2
    b = st.get("build", 1.0)

    if st.get("creature") == "golem":
        body = bezier([(60, 800), (80, 560), (200, 430), (320, 400), (440, 430), (560, 560), (580, 800)], 16)
        d.polygon(S(body), fill=255)
        d.ellipse(S([(220, 300), (420, 470)]), fill=255)
        for x, y, r in [(200, 470, 50), (450, 490, 60), (330, 300, 40)]:
            d.ellipse(S([(x - r, y - r), (x + r, y + r)]), fill=255)
        return im
    if st.get("creature") == "moth":
        for sgn in (-1, 1):
            wing = bezier([(cx, 470), (cx + sgn * 120, 300), (cx + sgn * 260, 260), (cx + sgn * 280, 420), (cx + sgn * 150, 520), (cx, 520)], 14)
            d.polygon(S(wing), fill=255)
            low = bezier([(cx, 520), (cx + sgn * 170, 560), (cx + sgn * 190, 680), (cx + sgn * 60, 660), (cx, 560)], 12)
            d.polygon(S(low), fill=255)
        d.ellipse(S([(cx - 26, 420), (cx + 26, 700)]), fill=255)
        d.line(S([(cx - 8, 425), (cx - 60, 350)]), fill=255, width=4 * ss)
        d.line(S([(cx + 8, 425), (cx + 60, 350)]), fill=255, width=4 * ss)
        return im

    # shoulders / torso (back view)
    sh = 205 * b
    # trapezius slopes from the neck into the shoulders, so the head sits naturally
    torso = bezier([(cx - sh - 80, 820), (cx - sh - 34, 690), (cx - sh + 30, 612), (cx - 110, 572), (cx - 62, 540), (cx - 50, 480)], 12)
    torso += bezier([(cx + 50, 480), (cx + 62, 540), (cx + 110, 572), (cx + sh - 30, 612), (cx + sh + 34, 690), (cx + sh + 80, 820)], 12)
    d.polygon(S(torso), fill=255)
    hy = 410
    d.ellipse(S([(cx - 76, hy - 92), (cx + 76, hy + 92)]), fill=255)  # head
    for sgn in (-1, 1):
        d.ellipse(S([(cx + sgn * 76 - 13, hy + 2), (cx + sgn * 76 + 13, hy + 50)]), fill=255)  # ears

    hair = st.get("hair")
    if hair in ("short", "tousled", "queue", "bun", "long"):
        d.ellipse(S([(cx - 84, hy - 102), (cx + 84, hy + 40)]), fill=255)
    if hair == "long":
        d.polygon(S(bezier([(cx - 80, hy - 20), (cx - 96, hy + 90), (cx - 84, 600), (cx, 625), (cx + 84, 600), (cx + 96, hy + 90), (cx + 80, hy - 20)], 12)), fill=255)
    elif hair == "bun":
        d.ellipse(S([(cx - 40, hy - 150), (cx + 40, hy - 74)]), fill=255)
    elif hair == "queue":
        d.polygon(S([(cx - 14, hy + 60), (cx + 14, hy + 60), (cx + 8, hy + 190), (cx - 8, hy + 190)]), fill=255)
    elif hair == "tousled":
        for a in np.linspace(-2.6, -0.5, 7):
            x, y = cx + np.cos(a) * 82, hy - 8 + np.sin(a) * 92
            d.ellipse(S([(x - 26, y - 22), (x + 26, y + 22)]), fill=255)

    hat = st.get("hat")
    if hat == "tricorn":
        d.ellipse(S([(cx - 84, hy - 150), (cx + 84, hy - 50)]), fill=255)  # crown
        brim = bezier([(cx - 165, hy - 118), (cx - 120, hy - 70), (cx, hy - 52), (cx + 120, hy - 70), (cx + 165, hy - 118)], 12)
        brim += bezier([(cx + 150, hy - 96), (cx + 60, hy - 88), (cx, hy - 104), (cx - 60, hy - 88), (cx - 150, hy - 96)], 12)
        d.polygon(S(brim), fill=255)
    elif hat == "peaked":
        d.ellipse(S([(cx - 90, hy - 140), (cx + 90, hy - 62)]), fill=255)
        d.rectangle(S([(cx - 82, hy - 102), (cx + 82, hy - 62)]), fill=255)
    elif hat == "witch":
        d.ellipse(S([(cx - 175, hy - 92), (cx + 175, hy - 46)]), fill=255)
        d.polygon(S(bezier([(cx - 82, hy - 74), (cx - 40, hy - 190), (cx + 30, hy - 300), (cx + 120, hy - 340)], 10) + bezier([(cx + 120, hy - 340), (cx + 50, hy - 240), (cx + 70, hy - 150), (cx + 82, hy - 74)], 10)), fill=255)
    elif hat == "wide":
        d.ellipse(S([(cx - 190, hy - 86), (cx + 190, hy - 40)]), fill=255)
        d.ellipse(S([(cx - 82, hy - 150), (cx + 82, hy - 60)]), fill=255)
    elif hat == "hood":
        d.polygon(S(bezier([(cx - sh + 10, 640), (cx - 130, 470), (cx - 110, hy - 70), (cx, hy - 130), (cx + 110, hy - 70), (cx + 130, 470), (cx + sh - 10, 640)], 14)), fill=255)
    elif hat == "crown":
        pts = [(cx - 86, hy - 66)]
        for i in range(7):
            x = cx - 86 + i * 172 / 6
            pts += [(x, hy - (130 if i % 2 == 0 else 100))]
        pts += [(cx + 86, hy - 66)]
        d.polygon(S(pts), fill=255)
    elif hat == "helm":
        d.ellipse(S([(cx - 96, hy - 120), (cx + 96, hy + 100)]), fill=255)
        d.polygon(S(bezier([(cx - 6, hy - 112), (cx + 30, hy - 210), (cx + 140, hy - 240), (cx + 200, hy - 180)], 10) + bezier([(cx + 200, hy - 180), (cx + 110, hy - 190), (cx + 40, hy - 120)], 8)), fill=255)
    elif hat in ("cap", "flatcap", "conductor", "beanie", "beret"):
        if hat == "beanie":
            d.ellipse(S([(cx - 86, hy - 120), (cx + 86, hy + 10)]), fill=255)
        elif hat == "beret":
            d.ellipse(S([(cx - 110, hy - 120), (cx + 70, hy - 50)]), fill=255)
        elif hat == "conductor":
            d.rectangle(S([(cx - 84, hy - 140), (cx + 84, hy - 70)]), fill=255)
            d.ellipse(S([(cx - 90, hy - 160), (cx + 90, hy - 120)]), fill=255)
        else:
            d.ellipse(S([(cx - 88, hy - 128), (cx + 88, hy - 40)]), fill=255)
            d.polygon(S([(cx - 96, hy - 70), (cx + 96, hy - 70), (cx + 88, hy - 52), (cx - 88, hy - 52)]), fill=255)

    if st.get("collar"):
        d.polygon(S([(cx - 110, 590), (cx - 64, 500), (cx, 560), (cx + 64, 500), (cx + 110, 590)]), fill=255)
    if st.get("epaulettes"):
        for sgn in (-1, 1):
            d.ellipse(S([(cx + sgn * (sh - 40) - 60, 590), (cx + sgn * (sh - 40) + 60, 640)]), fill=255)
    if st.get("scarf"):
        d.polygon(S(bezier([(cx - 90, 560), (cx, 590), (cx + 90, 560)], 8) + [(cx + 70, 600), (cx + 130, 760), (cx + 90, 770), (cx + 30, 610), (cx - 90, 600)]), fill=255)
    if st.get("pack"):
        d.rounded_rectangle(S([(cx - 110, 610), (cx + 110, 800)]), radius=30 * ss, fill=255)
    if st.get("headphones"):
        d.arc(S([(cx - 96, hy - 110), (cx + 96, hy + 70)]), 190, 350, fill=255, width=14 * ss)
    return im


def render(ch):
    st = STYLE.get(ch["id"], {})
    scene = SCENE[ch["world"]]
    hue, acc = hexc(ch["hue"]), hexc(ch["accent"])
    # soft-focus world beyond the figure
    world = Image.open(os.path.join(ART, f"{scene}.jpg"))
    cw = int(1250 * PW / PH)
    fx = int(FOCUS[scene] * 2000 - cw / 2)
    fx = max(0, min(2000 - cw, fx + (zlib.crc32(ch["id"].encode()) % 160 - 80)))
    bg = world.crop((fx, 0, fx + cw, 1250)).resize((PW, PH), Image.LANCZOS)
    img = np.asarray(bg, np.float32) / 255
    img = blur(img, 5) * 0.62
    img = img ** 1.1
    lx = LIGHT[scene]
    # character-coloured backlight behind the head
    img = add(img, hue, glow_falloff(PW / 2 + lx * 30, 360, 230, PW, PH) * 0.65)
    img = add(img, acc, radial(PW / 2 + lx * 160, 260, 380, PW, PH, 2.0) * 0.18)

    m = figure_mask(st).resize((PW, PH), Image.LANCZOS)
    m = np.asarray(m, np.float32) / 255
    # body: near-black, faintly tinted, a touch of fabric texture
    tex = 0.85 + 0.15 * fbm(PW, PH, 30, 3, abs(zlib.crc32(ch["id"].encode())) % 999)
    body = mix(hexc("#04050c"), hue * 0.22, 0.25) * tex[..., None]
    img = layer(img, body, m)
    # rim light: strongest on the key-light side and the top edges
    r1 = rim(m, lx, -0.6, 3, PW, PH)
    r2 = rim(m, 0, -1, 2, PW, PH)
    img = add(img, mix(hue, hexc("#fff4e0"), 0.5), r1 * 1.5 + r2 * 0.5)
    img = add(img, hue, blur(r1, 6) * 0.9)
    if st.get("number"):
        from PIL import ImageDraw, ImageFont
        t = Image.new("L", (PW, PH), 0)
        try:
            f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 150)
        except Exception:
            f = ImageFont.load_default()
        ImageDraw.Draw(t).text((PW / 2, 700), st["number"], fill=255, font=f, anchor="mm")
        img = add(img, hue * 0.5, np.asarray(t, np.float32) / 255 * m * 0.22)
    if st.get("halo") or ch["id"] == "lumen-moth":
        img = add(img, acc if ch["id"] != "lumen-moth" else hexc("#ffe7a8"), glow_falloff(PW / 2, 330 if ch["id"] != "lumen-moth" else 560, 90, PW, PH) * 0.9)
    if ch["id"] == "bramble-golem":
        eyes = np.zeros((PH, PW, 3), np.float32)
        for ex in (290, 350):
            eyes[380, ex] = hexc("#ffd27a") * 200
        img = img + blur(eyes, 2) + blur(eyes, 10) * 0.8
    # ground haze
    yy = np.arange(PH, dtype=np.float32)[:, None]
    img = layer(img, hue * 0.15 + hexc("#05070f") * 0.85, smooth(620, 800, yy) * 0.55 * np.ones((1, PW)))
    img = kit.bloom(img, 0.75, 14, 0.4)
    img = finish(img, "#070a1e", grain=0.03, vignette=0.45, seed=abs(zlib.crc32(ch["id"].encode())) % 9999)
    save(img, os.path.join(OUT, f"{ch['id']}.jpg"), 82)


if __name__ == "__main__":
    chars = load_characters()
    only = set(sys.argv[1:])
    for ch in chars:
        if only and ch["id"] not in only:
            continue
        render(ch)
        print(ch["id"], flush=True)
    print(len(chars), "characters")
