"""
Renders narrated MP3s for every written script with Kokoro TTS (open-weights, runs offline).

  pip install kokoro-onnx soundfile
  # model files from https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
  KOKORO_MODEL=kokoro-v1.0.int8.onnx KOKORO_VOICES=voices-v1.0.bin python3 scripts/render_audio.py

Reads scripts/.render/jobs.json (npm run content:export) and writes:
  content-audio/<episode>.mp3            full episode (served through the entitlement-checked API)
  content-audio/previews/<episode>.mp3   the hook only, for free Discover previews
  src/content/audio-manifest.json        durations + sentence-level transcript timings

Each sentence is synthesised separately, so caption timings are exact rather than estimated.
Re-running only re-renders episodes whose text changed.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

import numpy as np
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS = os.path.join(ROOT, "scripts/.render/jobs.json")
OUT = os.path.join(ROOT, "content-audio")
MANIFEST = os.path.join(ROOT, "src/content/audio-manifest.json")
SR = 24000
SENTENCE_GAP = 0.28
SEGMENT_GAP = 0.6
LEAD_IN = 0.35
SPEED = float(os.environ.get("KOKORO_SPEED", "1.05"))


def sentences(text):
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])", text.strip())
    return [p.strip() for p in parts if p.strip()]


def encode(samples, path):
    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
         "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "1", "-b:a", "40k", path],
        input=pcm, check=True,
    )


def main():
    model = os.environ.get("KOKORO_MODEL", "kokoro-v1.0.int8.onnx")
    voices = os.environ.get("KOKORO_VOICES", "voices-v1.0.bin")
    kokoro = Kokoro(model, voices)
    jobs = json.load(open(JOBS))
    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    only = set(sys.argv[1:])

    for i, job in enumerate(jobs):
        if only and job["id"] not in only:
            continue
        digest = hashlib.sha1(json.dumps([job["voice"], SPEED, job["segments"]]).encode()).hexdigest()[:12]
        full_path = os.path.join(OUT, f"{job['id']}.mp3")
        if manifest.get(job["id"], {}).get("hash") == digest and os.path.exists(full_path):
            continue
        lang = "en-gb" if job["voice"].startswith("b") else "en-us"
        chunks = [np.zeros(int(LEAD_IN * SR), dtype=np.float32)]
        t = LEAD_IN
        lines = []
        hook_end = None
        for si, seg in enumerate(job["segments"]):
            if si > 0:
                chunks.append(np.zeros(int(SEGMENT_GAP * SR), dtype=np.float32))
                t += SEGMENT_GAP
            for k, sentence in enumerate(sentences(seg["text"])):
                if k > 0:
                    chunks.append(np.zeros(int(SENTENCE_GAP * SR), dtype=np.float32))
                    t += SENTENCE_GAP
                audio, sr = kokoro.create(sentence, voice=job["voice"], speed=SPEED, lang=lang)
                assert sr == SR
                audio = audio.astype(np.float32)
                chunks.append(audio)
                dur = len(audio) / SR
                lines.append({"t0": round(t, 2), "t1": round(t + dur, 2), "text": sentence, "kind": seg["kind"]})
                t += dur
            if seg["kind"] == "hook":
                hook_end = t
        full = np.concatenate(chunks)
        encode(full, full_path)

        preview_lines = [l for l in lines if l["kind"] == "hook"]
        end = int(((hook_end or t) + 0.5) * SR)
        preview = full[:end].copy()
        fade = int(0.4 * SR)
        preview[-fade:] *= np.linspace(1, 0, fade)
        encode(preview, os.path.join(OUT, "previews", f"{job['id']}.mp3"))

        manifest[job["id"]] = {
            "hash": digest,
            "voice": job["voice"],
            "duration": round(len(full) / SR, 2),
            "lines": lines,
            "preview": {"duration": round(len(preview) / SR, 2), "lines": preview_lines},
        }
        with open(MANIFEST, "w") as f:
            json.dump(manifest, f, indent=1, sort_keys=True)
        print(f"[{i + 1}/{len(jobs)}] {job['id']}  {len(full) / SR:.0f}s", flush=True)


if __name__ == "__main__":
    main()
