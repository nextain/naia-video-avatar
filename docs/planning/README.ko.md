# 기획 산출물 및 표준 대응표

[English](./README.md) | 한국어

이 디렉터리는 naia-video-avatar 프로젝트의 기획 문서를 정의하고, [naia-pj-adk](https://github.com/nextain/naia-pj-adk) 표준 산출물 정본과 이 저장소의 기존 문서·레지스트리 간 대응 관계를 정의한다.

---

## 1. 표준 산출물 대응표

과거 이슈·커밋·검사 스크립트의 하위 호환성을 유지하기 위해 기존 레지스트리와 식별자(ID) 체계를 보존하고, 신규 산출물은 표준 식별자를 사용한다.

| 표준 산출물 | 명칭 및 역할 | naia-video-avatar 위치 | 식별자 규칙 |
|---|---|---|---|
| **PC** | 상위기획 (Product Concept) | [docs/planning/PC.ko.md](./PC.ko.md) | `PC` |
| **SP** | 화면기획 (Screen Plan) | [docs/planning/SP.ko.md](./SP.ko.md) | `SP-NN` (예: `SP-01`) |
| **UC** | 유저 시나리오 (User Scenario) | [docs/progress/02.user-scenarios/INDEX.ko.md](../progress/02.user-scenarios/INDEX.ko.md) | `UC-NNN` |
| **RQ** | 요구사항 정의 (Requirements) | [docs/progress/01.requirements/INDEX.ko.md](../progress/01.requirements/INDEX.ko.md) | `REQ-NNN`, `NFR-NNN` |
| **PL** | 기술 계획 및 구조 (Plan / Architecture) | [docs/planning/PL.ko.md](./PL.ko.md) | `PL` |
| **FE** | 기능 명세 (Feature Specification) | [docs/progress/04.features/INDEX.ko.md](../progress/04.features/INDEX.ko.md) | `SPEC-NNN` |
| **UT** | 단위 기능 검증 (Unit & Feature Test) | [docs/progress/05.features-tests/INDEX.ko.md](../progress/05.features-tests/INDEX.ko.md) | `TEST-F-NNN` |
| **IT** | 통합 시험 영수증 (Integration Test) | [docs/receipts/](../receipts/README.ko.md) | `RECEIPT-IT-{ISSUE}-{YYYYMMDD}-{SEQ}` |
| **E2E** | 사용자 여정 관통 시험 영수증 | [docs/receipts/](../receipts/README.ko.md) ([03.uc-tests](../progress/03.uc-tests/INDEX.ko.md) 연결) | `RECEIPT-E2E-{ISSUE}-{YYYYMMDD}-{SEQ}` / `TEST-S-NNN` |
| **QC** | 독립 품질 검증 (Quality Control) | [docs/receipts/](../receipts/README.ko.md) | `QC-NN` |

---

## 2. 기획 및 구현 순서

개발은 '기획은 위에서 아래로(Top-down), 개발은 아래에서 위로(Bottom-up)' 원칙을 엄격히 따른다.

```text
[기획: 위에서 아래로]
PC (상위기획: 존재 이유, 사용자 가치, 소유권 경계)
  └── SP (화면기획: 화면 도면, UI 배치, 상태 변화)
        └── UC (유저 시나리오: 사용자 여정 및 맥락)
              └── RQ (요구사항: 기능/비기능 요건 및 수용 기준)
                    └── PL (기술 계획: 아키텍처 및 로드맵)
                          └── FE (기능 명세: 구체적 기능 단위)

[이슈 전 범위 잠금: pre-issue scope lock]
이슈 생성 전 요구 단위와 수용 기준 목록을 사람이 승인

[구현 및 검증: 아래에서 위로]
UT (단위 기능 검증: 코드 명세 검증)
  └── 통합 시험(IT) 관문 (화면 없이 실제 모듈 관통 검증)
        └── 화면 구현 및 백엔드 연결 (UC 기준 화면 연결)
              └── E2E (사용자 여정 관통 시험: 실제 화면에서 모듈까지 관통)
                    └── 독립 QC (PC와 SP만 입력으로 하는 독립 적대적 검증)
```

### 핵심 원칙

- **Top-down 기획, Bottom-up 개발**: 상위 기획과 화면 설계로부터 요구사항을 정의하되, 개발은 바닥의 동작하는 최소 단위부터 만들고 관통을 확인한 후 점진적으로 확대한다.
- **이슈 전 범위 잠금 (pre-issue scope lock)**: 이슈를 만들기 전에 요구 단위와 수용 기준 목록을 사람이 승인한다. 사람이 승인하지 않은 범위는 구현으로 진행하지 않는다.
- **IT 통과 전 화면 확장 금지**: 모의 객체(mock) 없이 실제 모듈(loader·core·player)을 관통하는 통합 시험(IT)이 통과하기 전에는 화면 개발을 넓히지 않는다.
- **화면만 먼저 만들어 넘기지 않는다**: 백엔드 또는 코어 연결 없는 화면만 따로 만드는 방식은 통합 단계에서 전면 재개발을 부르므로 금지한다.
- **완료 조건**: implementation 단위는 통합 시험(IT)과 E2E 영수증이 모두 있어야 완료(close)된다. 단, 화면기획(SP)에 해당 화면이 없는 단위만 E2E 해당 없음(영수증에 근거 SP 절 명시)이다.
- **피드백 루프**: 구현 중 발견한 문서 오류는 상류(상위) 문서에서 먼저 고쳐 하류로 반영한다.

---

## 3. 표준 정본 문서 링크

이 절차는 [naia-pj-adk](https://github.com/nextain/naia-pj-adk) 표준 파이프라인 정본과 일치한다:

- [OVERVIEW.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/OVERVIEW.ko.md) — 문서 우선 전체 범위 기능 파이프라인
- [FLOW.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/FLOW.ko.md) — 문서·이슈·개발 큐·검증 연결 워크플로우
- [TERMINOLOGY.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/TERMINOLOGY.ko.md) — 표준 용어 사전
- [TEST-RECEIPT.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/TEST-RECEIPT.ko.md) — 통합 시험(IT) / E2E 시험 영수증 표준 양식

---

## 4. 디렉터리 내 기획 문서

- [PC.ko.md](./PC.ko.md) ([English](./PC.md)) — 상위기획 및 소유권 경계
- [SP.ko.md](./SP.ko.md) ([English](./SP.md)) — 플레이어 화면 구조, 도면, 상태 변화
- [PL.ko.md](./PL.ko.md) ([English](./PL.md)) — 모듈 구조, 시험 체계, 기술 계획
