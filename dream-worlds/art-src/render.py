"""Render Dream Worlds key art: python3 render.py [scene ...]"""
import sys, time, os
from scenes import SCENES
from kit import save

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "art")
os.makedirs(OUT, exist_ok=True)
for name in sys.argv[1:] or SCENES:
    t = time.time()
    img = SCENES[name]()
    save(img, os.path.join(OUT, f"{name}.jpg"), 80)
    print(name, f"{time.time() - t:.1f}s", os.path.getsize(os.path.join(OUT, f"{name}.jpg")) // 1024, "KB", flush=True)
