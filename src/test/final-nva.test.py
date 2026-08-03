"""Tests for deterministic NVA v0.3 completed-media packaging."""

from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts/build-final-nva.py"


class FinalNvaTest(unittest.TestCase):
    def make_base(self, root: Path) -> Path:
        base = root / "base"
        (base / "clips").mkdir(parents=True)
        (base / "private").mkdir()
        (base / "clips/idle.webm").write_bytes(b"idle")
        (base / "clips/talk.webm").write_bytes(b"private-talk")
        (base / "private/head.png").write_bytes(b"private-head")
        manifest = {
            "nva_version": "0.2",
            "meta": {"name": "Fixture", "generation": {"method": "private"}, "provider_job": "secret"},
            "generation_receipt": {"provider": "private"},
            "canvas": {"width": 64, "height": 64, "fps": 25},
            "background": {"type": "transparent"},
            "animations": {
                "idle": {"clip": "clips/idle.webm", "loop": True, "can_talk": False, "private_hint": "secret"},
                "talk": {
                    "clip": "clips/talk.webm", "loop": True, "can_talk": True,
                    "head_image": "private/head.png", "face_bbox": [0, 0, 1, 1],
                },
            },
        }
        (base / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        return base

    def make_speech(self, root: Path, with_audio: bool = True) -> Path:
        target = root / "speech.mp4"
        command = [
            "ffmpeg", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "color=c=black:s=64x64:r=25:d=0.4",
        ]
        if with_audio:
            command += ["-f", "lavfi", "-i", "sine=frequency=440:duration=0.4", "-shortest"]
        command += ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
        if with_audio:
            command += ["-c:a", "aac"]
        command.append(str(target))
        subprocess.run(command, check=True)
        return target

    def run_tool(self, base: Path, speech: Path, output: Path, check: bool = True):
        return subprocess.run([
            "python3", str(SCRIPT), "--base", str(base),
            "--speech", f"hello|ko-KR|인사|{speech}", "--output", str(output),
        ], cwd=ROOT, text=True, capture_output=True, check=check)

    def test_build_is_deterministic_and_excludes_private_generation_assets(self):
        with tempfile.TemporaryDirectory(prefix="nva-final-test-") as temporary:
            root = Path(temporary)
            base = self.make_base(root)
            speech = self.make_speech(root)
            first, second = root / "first.nva", root / "second.nva"
            self.run_tool(base, speech, first)
            self.run_tool(base, speech, second)
            self.assertEqual(hashlib.sha256(first.read_bytes()).digest(), hashlib.sha256(second.read_bytes()).digest())
            with zipfile.ZipFile(first) as archive:
                self.assertEqual(set(archive.namelist()), {"manifest.json", "clips/idle.webm", "speech/hello.mp4"})
                manifest = json.loads(archive.read("manifest.json"))
            self.assertEqual(manifest["nva_version"], "0.3")
            self.assertEqual(manifest["profile"], "completed-media")
            self.assertFalse(manifest["meta"]["delivery"]["realtime"])
            self.assertNotIn("generation", manifest["meta"])
            self.assertNotIn("provider_job", manifest["meta"])
            self.assertNotIn("generation_receipt", manifest)
            self.assertEqual(set(manifest["animations"]), {"idle"})
            self.assertEqual(set(manifest["animations"]["idle"]), {"clip", "loop"})
            self.assertEqual(manifest["speech_clips"]["hello"]["audio"], "embedded")

    def test_speech_without_embedded_audio_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix="nva-final-test-") as temporary:
            root = Path(temporary)
            result = self.run_tool(self.make_base(root), self.make_speech(root, False), root / "bad.nva", check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("video and embedded audio", result.stderr)

    def test_oversized_base_archive_is_rejected_before_extraction(self):
        with tempfile.TemporaryDirectory(prefix="nva-final-test-") as temporary:
            root = Path(temporary)
            oversized = root / "oversized.nva"
            with oversized.open("wb") as handle:
                handle.seek(100 * 1024 * 1024)
                handle.write(b"x")
            result = self.run_tool(oversized, self.make_speech(root), root / "bad.nva", check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("too large", result.stderr)


if __name__ == "__main__":
    unittest.main()
