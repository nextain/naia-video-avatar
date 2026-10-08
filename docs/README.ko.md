# 문서 색인 (docs)

[English](./README.md) | 한국어

이 디렉터리의 진입점(허브). 모든 큐레이트 문서는 여기서 도달 가능해야 한다
(문서 고립 방지 — `scripts/check-doc-graph.mjs` 가 강제). 루트 `AGENTS.md`(=CLAUDE/GEMINI/OPENCODE/CODEX)
가 프로젝트 진입점이고, 이 파일은 `docs/` 내부 색인이다.

## 표준·구조

- [프로젝트 구조 표준](./project-structure.ko.md) — F12/F13 루트 화이트리스트, 디렉터리 규약
- [위협 모델](./threat-model.ko.md) — 보안 경계, 시크릿 격리(T3), 추적 금지 경로
- [LLM 역할 분담](./llm-roles.ko.md) — 작은(라이트) 모델 ↔ 큰 모델 분담, 단일 CLI 어댑터, 검출 계층
- [합격 기준](./acceptance-criteria.ko.md) — 계약 구체화 + 검증이 게이트를 대체(게이트키퍼 제거). 완료증거 등급(강/약/없음)

## 기획·아키텍처 (planning/)

- [기획 산출물 및 표준 대응표](./planning/README.ko.md) — 표준 파이프라인 대응표, 기획·구현 순서, 표준 정본 링크
- [상위기획 (PC)](./planning/PC.ko.md) — 제품 정의, 대상 사용자, 소유권 경계
- [화면기획 (SP)](./planning/SP.ko.md) — 플레이어 화면 구조, 글자 도면, 조작 및 상태 변화
- [기술 계획 및 아키텍처 (PL)](./planning/PL.ko.md) — 런타임 모듈 분해, 포맷 버전 정책, 다계층 시험 체계

## 검증 영수증·QC (receipts/)

- [검증 영수증 및 품질 검증](./receipts/README.ko.md) — 영수증 양식 규격, 파일 명명 규칙, 독립 QC 규칙
- [#22 통합 시험(IT) 영수증](./receipts/RECEIPT-IT-22-20261008-01.ko.md) — 로더·코어·플레이어·코디네이터·카탈로그 모듈 통합 시험 영수증
- [#22 사용자 여정 관통 시험(E2E) 영수증](./receipts/RECEIPT-E2E-22-20261008-01.ko.md) — demo 및 naia 공개 예제 다중 뷰포트 브라우저 검증 영수증

## 작업 기록 (progress/)

`docs/progress/` 는 **append-only 작업 기록(ledger)** — 날짜별 진행·검토 메모.
연대기라 상호 링크 의무가 없다(`check-doc-graph --exempt progress` 로 고립 검사 면제).

## 주기 검증

구조·문서·미러 이탈은 결정론 스크립트가 검출한다. 마이그레이션 완료 후
`scripts/verify-watch.sh start`(또는 `cron`)로 백그라운드 주기 검증 — 검출·보고만 자동, 수정은 사람/큰 모델 게이트.
자세히: [LLM 역할 분담](./llm-roles.ko.md) 의 "디텍트 계층".
