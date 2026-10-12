"""D25 발화 조각 합 대조 고정물: 세 저장소가 같은 바이트 합을 내는지 보는 작은 묶음."""
import hashlib, io, json, zipfile
files = {
    "speech/neutral-head.png": b"N" * 1001,
    "speech/atlas.bin": b"A" * 20003,
    "speech/atlas-index.json": b"I" * 3005,
    "speech/validation-report.json": b"V" * 407,
    "speech/quality-report.json": b"Q" * 509,
}
roles = ["neutral_head", "speech_atlas", "speech_atlas_index", "validation_report", "quality_report"]
assets = [{"role": r, "path": p, "sha256": hashlib.sha256(b).hexdigest(), "bytes": len(b)} for r, (p, b) in zip(roles, files.items())]
receipt = json.dumps({"version": "1", "job_id": "job_speechtotalfixture", "assets": assets}, indent=2).encode()
manifest = json.dumps({"format": "nva", "speech_motion": {
    "version": "1", "representation": "whole-head-layer",
    "neutral_head": "speech/neutral-head.png", "atlas": "speech/atlas.bin", "atlas_index": "speech/atlas-index.json",
    "validation_report": "speech/validation-report.json", "quality_report": "speech/quality-report.json",
    "provenance": "speech/generation-result.json"}}, indent=2).encode()
out = io.BytesIO()
with zipfile.ZipFile(out, "w", zipfile.ZIP_STORED) as z:
    def w(n, b):
        zi = zipfile.ZipInfo(n, date_time=(2026, 10, 11, 0, 0, 0)); z.writestr(zi, b)
    w("manifest.json", manifest)
    for p, b in files.items(): w(p, b)
    w("speech/generation-result.json", receipt)
    w("speech/natural-eu.json", b"E" * 7001)  # 부속 파일: 세지 않음
data = out.getvalue()
open("speech-asset-total.nva", "wb").write(data)
golden = {"fixture": "speech-asset-total.nva", "sha256": hashlib.sha256(data).hexdigest(),
          "expected_speech_asset_total_bytes": sum(len(b) for b in files.values()),
          "speech_dir_all_bytes": sum(len(b) for b in files.values()) + len(receipt) + 7001,
          "definition": "alpha-adk D25: manifest.speech_motion 이 가리키는 발화 조각 다섯 파일(neutral_head·atlas·atlas_index·validation_report·quality_report)의 바이트 합, 영수증·natural-eu 부속 제외"}
open("speech-asset-total.golden.json", "w").write(json.dumps(golden, ensure_ascii=False, indent=2) + "\n")
print(golden)
