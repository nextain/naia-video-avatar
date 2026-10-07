# Issue 16 — NVA v0.3 public service player

- GitHub: https://github.com/nextain/naia-video-avatar/issues/16
- Branch: `feat/16-service-player-v03`
- Base: `origin/main` (`199a664`)
- Push: 사용자 로컬 검토 승인 전 보류

## 범위

naia.land NVA Studio의 완성 예제 소비 경험을 독립 공개 플레이어로 옮긴다. 공개 사용자는 완성된 `.nva`를 열어 대기, 내장 음성 발화, 동작을 재생하고 배경을 바꿔 서비스 배치를 확인한다.

## 공개 계약

- 신규 정본: NVA v0.3 `completed-media`
- 호환: 기존 NVA v0.2 읽기만 지원
- 배포: 정적 웹, 계정·키·GPU·서버 API 불필요
- 포함: 규격, 검증기, ZIP 로더, 재생기, 단순 서비스 UI, 안전한 공개 예제

## 명시적 제외

- NVA create 및 제작 파이프라인
- 편집기, 노드 그래프, 제작 타임라인
- 브라우저 TTS 및 실시간 음성·영상 생성
- Cascade와 그 어댑터·문서·설정
- 비공개 얼굴·음성·프롬프트·모델·운영 경로

## 검증

P01~P03 추적 항목을 먼저 확정하고, 계약 테스트를 RED로 추가한 뒤 구현한다. Node 전체 테스트, 구조·추적 검사, 실제 정적 서버 기반 Playwright E2E, 비공개 기능 문자열·네트워크 요청 검사를 통과해야 로컬 검토 URL을 제공한다.
