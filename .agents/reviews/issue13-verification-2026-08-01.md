# Issue 13 구현·통합 검증 — 2026-08-01

## 판정

- 구현 기반 및 공개/비공개 통합 경로: `PASS`
- 제품 타당성 H1(Jina B-F/C-F, 4개 언어, 전체 문장 자연스러움): `INCONCLUSIVE`
- 제품 보존 게이트: `REVIEW_ONLY` — 서명된 기준 버전 보존 계약이 없어 release/merge 자격을 주장하지 않는다.

## V-모델 검증 증거

| 검증 | 명령/증거 | 결과 |
|---|---|---|
| 공개 단위·계약 회귀 | `node --test src/test/*.test.mjs` | 74/74 PASS |
| 공개 구문 검사 | `node --check src/main/*.js` | PASS |
| 비공개 생성 서비스 | `PYTHONPATH=. pytest -q output_cascade/tests/test_generation_service.py output_cascade/tests/test_generation_subprocess.py output_cascade/tests/test_generation_app.py` | 17/17 PASS |
| 비공개 구문 검사 | `python -m py_compile output_cascade/generation_{service,subprocess,launcher,app}.py` | PASS |
| 브라우저 통합 | `with_server.py` + `.agents/work/issue13-browser-smoke.py` | Chromium에서 Studio 생성/가져오기/내보내기, VP9 alpha 0/128/255, HTTP Range 100회, Viewer Jina body+neutral head+두 alpha decoder+WAV/SpeechPlan 재생 PASS |
| 계약 일치 | 공개 `SPEECH_UNITS`와 비공개 `INVENTORY` JSON 바이트 비교 | 13/13 이름·순서 PASS |
| 압축/공백 | 양 저장소 `git diff --check` | PASS |
| 충돌 표식 | 변경 범위 `rg '^(<<<<<<<|=======|>>>>>>>)'` | 0건 |

브라우저 검증 중 `requestAnimationFrame`을 잘못된 객체 호출 문맥으로 실행해 `Illegal invocation`이 나는 결함을 실제로 재현했다. 전역 호출 문맥을 보존하는 래퍼와 회귀 테스트를 추가한 뒤 동일 통합 검사를 다시 통과했다. Studio의 생성 서버 bearer token은 세션 전용 비밀번호 입력으로만 전달되고 NVA/URL/body에 저장하지 않는다. 원본 NVA와 생성 ZIP은 JSZip 압축 해제 전에 1 byte..100 MiB를 검사하며 중앙 디렉터리의 파일 수·비압축 크기도 별도로 제한한다.

## 적용한 verify 절차

- `verify-build`: package build 진입점이 없어 공개 JS 구문 검사와 비공개 Python compile로 대체, PASS.
- `verify-conflict-markers`: PASS.
- `verify-contract-conformance`: 공개/비공개 고정 13단위와 GenerationResult/SpeechPlan/NVA 결박 테스트 PASS.
- `verify-product-preservation`: 기존 Studio 로드·편집·내보내기와 기존 manifest 무확장 호환 테스트는 PASS. 다만 strict 서명 보존 계약 부재로 `REVIEW_ONLY`.
- `verify-i18n`, `verify-hardcoded-strings`: 적용 대상인 naia-agent/naia-os 변경이 아니므로 N/A. 새 Studio 문자열은 한국어/영어 쌍을 함께 추가했다.
- `manage-skills`: 새 독립 검증 영역이 아니라 현재 Node/Python/브라우저/추적표가 결정론적으로 소유하므로 프로젝트 verify skill 추가는 N/A.

## 남은 타당성 차단 항목

이 검증은 가짜 생성 서버와 합성된 alpha fixture로 계약·재생 경로를 확인한 것이다. 실제 Ditto로 고정 Jina 자산에서 B-F/C-F atlas를 생성하고, 고정 80개 전체 문장을 whole-utterance Ditto 기준과 비교한 자동 지표·블라인드 사람 평가, VoxCPM2→MFA SpeechPlan 실연결, CPU 성능/번들 크기 문턱은 아직 실행하지 않았다. 따라서 VRAM 없는 재생의 기술 기반은 확인됐지만 자연스러운 다국어 제품성은 PASS가 아니다.
