# 기술 계획 및 아키텍처 (PL)

[English](./PL.md) | 한국어

> **표준 식별자**: `PL`  
> **상류 문서**: [요구사항 정의 (RQ)](../progress/01.requirements/INDEX.ko.md), [유저 시나리오 (UC)](../progress/02.user-scenarios/INDEX.ko.md)  
> **하류 문서**: [기능 명세 (FE)](../progress/04.features/INDEX.ko.md), [단위 기능 검증 (UT)](../progress/05.features-tests/INDEX.ko.md)

---

## 1. 아키텍처 원칙

1. **무의존성 브라우저 런타임**: 외부 번들러나 패키지 매니저, 서드파티 라이브러리 없이 순수 ES 모듈로만 브라우저 런타임을 구성한다.
2. **단일 책임 모듈화**: 각 모듈은 명확한 인터페이스와 단일 책임을 가진다.
3. **Fail-Closed 안전성**: 형식 위반 아카이브, 용량 초과, 디렉터리 트래버설, 절대경로 참조는 압축 해제 전에 즉시 거부한다.
4. **회복력 있는 재생 수명주기**: 미디어 디코딩 오류나 정지 조작 시 안전하게 무음 대기(idle) 상태로 자동 복귀한다.

---

## 2. 모듈 구조 및 역할

런타임 아키텍처는 `src/main/` 아래 7개의 독립 모듈로 구성된다:

```text
 viewer.html (UI 오케스트레이션 및 상태 표시)
   │
   ├── LoadCoordinator (동시성 제어 및 이전 요청 취소)
   │
   ├── SampleCatalog (동일 출처 카탈로그 안전 로딩)
   │
   ├── StageBackground (배경 색상 및 이미지 프리뷰)
   │
   ├── NvaBundleLoader (클라이언트 측 무의존성 ZIP 파서)
   │     └── NvaCore (매니페스트 스키마 검증 및 호환 파싱)
   │
   └── NvaAnimationPlayer (HTMLVideoElement 재생 상태 기계)
```

| 모듈명 | 파일 경로 | 핵심 역할 |
|---|---|---|
| **nva-core** | `src/main/nva-core.js`<br>`src/main/nva-schema.json` | 코드로 매니페스트를 검증한다(`validateManifest()`: 구조·참조·포즈 그래프). Studio 0.2 하위 호환 대기·말하기 키 선택(`derive()`의 `idleKey`, `talkKey`)과 시나리오 보조 함수(`listScenarios()`, `scenarioPlayOrder()`, `findTransitionPath()`)를 제공한다. `nva-schema.json`은 작성자용으로 공개한 JSON Schema 참고 문서이며 Player가 실행 중에 읽지 않는다. |
| **nva-bundle-loader** | `src/main/nva-bundle-loader.js` | 서드파티 라이브러리 없는 순수 ZIP 파싱(Store 및 Deflate 지원), 경로 안전성 검증(`..` 및 절대경로 차단), 크기 한도(100 MiB, 512 파일) 검사, 미디어 Object URL 생성. |
| **nva-animation-player** | `src/main/nva-animation-player.js` | `HTMLVideoElement` 기반 재생 상태 기계(`idle`, `speech`, `talking`, `action`) 관리. 오디오 포함 발화 영상 재생, 무음 루프, 정지 세대(generation) 추적, 완료/오류 시 대기 복귀. |
| **load-coordinator** | `src/main/load-coordinator.js` | 비동기 아바타 로드에 최신 요청 승자(latest-request-wins) 수명주기 적용. 단조 증가 토큰 및 `AbortSignal`로 이전 로드 중단 처리. |
| **sample-catalog** | `src/main/sample-catalog.js` | 카탈로그 JSON 스키마 검증, 동일 출처(same-origin) 제약, 안전한 상대 경로 해소, 응답 크기 예산 검사. |
| **stage-background** | `src/main/stage-background.js` | 무대 배경 단색 지정 및 사용자 선택 이미지의 Blob URL 생성·해제 관리. |
| **viewer** | `src/main/viewer.html` | DOM 인터페이스 구성, UI 이벤트와 플레이어 모듈 바인딩, 화면 폭 반응형 스타일링, 상태 및 오류 메시지 제공. |

---

## 3. 포맷 버전 정책

### 3.1 NVA Version 0.3 (배포 정본)
- **프로필**: `completed-media`.
- **발화 영상**: `speech_clips`의 모든 항목은 내장 오디오(`audio: "embedded"`)와 BCP 47 `language` 태그를 가진 완성형 MP4/WebM이어야 한다.
- **표면 경계**: 생성·학습·실시간 추론 관련 필드를 완전히 배제한 최종 소비 규격.

### 3.2 NVA Version 0.2 (읽기 호환 — NFR-011)
- **읽기 호환**: 기존 제작된 Studio 0.2 아카이브의 열람 및 재생을 지원한다.
- **말하기 루프**: `loop: true`, `can_talk: true` 애니메이션을 인식하여 speech_clips가 없어도 `#playTalking` 버튼을 통해 말하기 모션을 재생한다.
- **관용적 파싱**: 매니페스트 내 미등록 Studio 확장 필드는 오류 없이 무시하며 v0.3 산출물로 전파하지 않는다.
- **언어 필드 호환**: 구버전 `locale` 필드를 `language`의 읽기 전용 별칭으로 수용한다.

---

## 4. 다계층 시험 체계

검증은 세 가지 독립적인 시험 계층으로 수행된다:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Node.js 단위 및 계약 시험 (src/test/*.test.mjs)         │
│    - 스키마 검증, 번들 로더, 애니메이션 플레이어            │
│    - 로드 코디네이터, 카탈로그, 보안 계약 검증             │
├─────────────────────────────────────────────────────────────┤
│ 2. Python 도구 및 패키징 시험 (src/test/*.test.py)          │
│    - 결정론적 v0.3 빌더 (scripts/build-final-nva.py)        │
│    - 로컬 샘플 준비 스크립트 (scripts/prepare-local-samples)│
├─────────────────────────────────────────────────────────────┤
│ 3. Playwright 브라우저 E2E 시험 (src/test/*.e2e.py)         │
│    - 로컬 정적 서버 기반 실제 Chromium 헤드리스 브라우저    │
│    - 다중 뷰포트 반응형 (폰 390px, 데스크톱 1440px)        │
│    - 대기 루프, 발화 영상, 말하기 루프, 정지 안정성 검증     │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 다음 단계 (Roadmap)

1. **복수 대기 영상(#17)**:
   - 매니페스트 `animations` 규격에 복수 idle 클립 목록 지원 구조 검토.
   - 순차 및 가중치 기반 순환 재생 및 매끄러운 루프 전환 로직 구현.
2. **Studio 확장 필드 표준화**:
   - 저작 파이프라인 안정화에 맞추어 Studio 메타데이터 필드의 공개 및 표준 규격화 여부 검토.
