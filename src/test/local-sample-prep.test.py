"""Tests for the source-private local sample preparation command."""

from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts/prepare-local-samples.py"


class LocalSamplePrepTest(unittest.TestCase):
    def fixture(self, root: Path, name: str) -> Path:
        source = root / name
        (source / "clips").mkdir(parents=True)
        (source / "clips/idle.webm").write_bytes(b"fixture-video")
        manifest = {
            "nva_version": "0.2", "meta": {"name": name},
            "canvas": {"width": 1, "height": 1},
            "animations": {"idle": {"clip": "clips/idle.webm", "loop": True, "can_talk": False}},
        }
        (source / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        return source

    def run_tool(self, output: Path, *samples: tuple[str, Path], check: bool = True):
        command = ["python3", str(SCRIPT), "--output", str(output)]
        for label, path in samples:
            command.extend(["--sample", f"{label}={path}"])
        return subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=check)

    def test_directory_and_file_inputs_are_private_and_deterministic(self):
        with tempfile.TemporaryDirectory(prefix="nva-prep-test-") as temporary:
            root = Path(temporary)
            directory = self.fixture(root, "private-source-name")
            existing = root / "existing-secret-name.nva"
            with zipfile.ZipFile(existing, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for path in sorted(directory.rglob("*")):
                    if path.is_file():
                        archive.write(path, path.relative_to(directory).as_posix())
            output = root / "out"
            self.run_tool(output, ("Jina", directory), ("Alpha", existing))
            catalog_text = (output / "catalog.json").read_text(encoding="utf-8")
            catalog = json.loads(catalog_text)
            urls = [item["url"] for item in catalog["samples"]]
            self.assertRegex(urls[0], r"^sample-01-[0-9a-f]{12}\.nva$")
            self.assertRegex(urls[1], r"^sample-02-[0-9a-f]{12}\.nva$")
            first = hashlib.sha256((output / urls[0]).read_bytes()).hexdigest()
            self.assertNotIn(str(root), catalog_text)
            self.assertNotIn("private-source-name", catalog_text)
            self.assertNotIn("existing-secret-name", catalog_text)
            self.run_tool(output, ("Jina", directory), ("Alpha", existing))
            rerun = json.loads((output / "catalog.json").read_text(encoding="utf-8"))
            rerun_url = rerun["samples"][0]["url"]
            self.assertEqual(urls[0], rerun_url)
            self.assertEqual(first, hashlib.sha256((output / rerun_url).read_bytes()).hexdigest())

    def test_failed_input_preserves_previous_catalog(self):
        with tempfile.TemporaryDirectory(prefix="nva-prep-test-") as temporary:
            root = Path(temporary)
            good = self.fixture(root, "good")
            output = root / "out"
            self.run_tool(output, ("Good", good))
            previous = (output / "catalog.json").read_bytes()
            bad = self.fixture(root, "bad")
            (bad / "clips/idle.webm").unlink()
            result = self.run_tool(output, ("Bad", bad), check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(previous, (output / "catalog.json").read_bytes())


if __name__ == "__main__":
    unittest.main()
