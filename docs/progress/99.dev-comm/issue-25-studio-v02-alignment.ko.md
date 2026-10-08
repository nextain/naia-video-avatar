# Issue 25 — 오픈소스 Player·형식 문서를 Studio v0.2 배포 파일에 맞춤

[English](./issue-25-studio-v02-alignment.md) | 한국어

- GitHub: https://github.com/nextain/naia-video-avatar/issues/25

## 범위

오픈소스 Player, 검증 코어, 번들 로더 및 패키징 도구를 Studio v0.2 배포 패키지 규격에 맞춘다. 소품 동작(prop action) 복합 순서 재생 지원, 액션 메뉴에서 보조 클립 숨김, 중복 액션 라벨 구분 표기, 번들 크기 제한(아카이브 200 MiB, 해제 자산 400 MiB) 확장을 포함한다.

## 공개 계약

- **정본 포맷**: 신규 패키지 및 공개 스키마는 NVA v0.3 `completed-media`를 정본으로 유지하되, Studio v0.2 배포 파일의 읽기 및 재생을 공식 지원한다.
- **소품 동작 순서 재생**: `prop_sequence` 메타데이터가 있는 애니메이션은 UI 액션 목록에 단일 복합 동작으로 노출되며, `enter`(1회, 있을 때) → 본 동작(2회, `loop: false`) → `exit`(1회, 있을 때) → 대기 자동 복귀 순서로 실행된다.
- **보조 클립 필터링**: `prop_enter`, `prop_exit` 역할을 가지거나 `prop_sequence`가 참조하는 보조 클립은 액션 드롭다운 메뉴 및 대기/말하기 파생 후보에서 제외된다.
- **중복 라벨 구분 표기**: 노출되는 액션 중 동일한 `label`을 가진 항목이 둘 이상이면 `${label} (${key})` 형식으로 구분 표기한다.
- **패키지 상한 조정**: 아카이브 크기 상한은 200 MiB(`200 * 1024 * 1024` 바이트), 해제 자산 합계 상한은 400 MiB(`400 * 1024 * 1024` 바이트)로 분리 적용한다.
- **확장 필드 관용 처리**: 저작 메타데이터(`meta`, `expressions`, `thumbnail`, `speech_set`, `loop_crossfade_frames`, `face_bbox`)는 재생 중단 없이 안전하게 수용하거나 무시한다.

## 명시적 제외

- Studio 저작용 에디터, 캔버스 타임라인 및 클립 생성 파이프라인.
- `loop_crossfade_frames`에 따른 클라이언트 측 실시간 크로스페이드(클립 생성 시 사전 반영 처리).
- 음성 합성(TTS) 및 인공신경망 립싱크 모션 생성.
- 소품 순서 저작 파라미터의 공개 표준 v0.3 스키마 편입.

## 검증

REQ-029, NFR-011, NFR-015, UC-021, SPEC-025, TEST-S-025, TEST-F-026에 걸친 V모델 추적성을 확보한다. Node 단위 시험 스위트(`src/test/*.test.mjs`), Python 도구 시험(`final-nva.test.py`, `local-sample-prep.test.py`), 실제 Chromium 브라우저에서 소품 복합 재생을 구동하는 Playwright E2E 시험을 통해 검증한다.
