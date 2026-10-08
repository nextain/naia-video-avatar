# 검증 영수증 및 품질 검증

[English](./README.md) | 한국어

이 디렉터리는 [naia-pj-adk](https://github.com/nextain/naia-pj-adk) 표준 파이프라인에 따라 통합 시험(IT), 사용자 여정 관통 시험(E2E)의 검증 영수증과 독립 품질 검증(QC) 기록을 보관한다.

---

## 1. 파일 명명 규칙

이 디렉터리의 모든 검증 영수증 및 기록은 다음 명명 규칙을 엄격히 따른다:

- **통합 시험 영수증 (IT)**:  
  `RECEIPT-IT-{ISSUE}-{YYYYMMDD}-{SEQ}.md`  
  (예: `RECEIPT-IT-22-20261008-01.md`)
- **사용자 여정 관통 시험 영수증 (E2E)**:  
  `RECEIPT-E2E-{ISSUE}-{YYYYMMDD}-{SEQ}.md`  
  (예: `RECEIPT-E2E-22-20261008-01.md`)
- **독립 품질 검증 기록 (QC)**:  
  `QC-{NN}.md`  
  (예: `QC-01.md`)  
  *참고: QC 문서는 구현 주체와 분리된 독립 세션에서 오직 PC와 SP만을 읽고 수행하므로, 구현 세션에서는 생성하지 않으며 조정자가 별도 실행한다.*

---

## 2. 영수증 기재 항목 규격

모든 시험 영수증은 표준 [TEST-RECEIPT.ko.md](https://github.com/nextain/naia-pj-adk/blob/main/docs/pipeline/TEST-RECEIPT.ko.md)에 정의된 다음 항목을 누락 없이 포함한다:

### 2.1 메타데이터
- **Receipt ID**: 명명 규칙에 부합하는 고유 식별자.
- **Test Type**: `IT` (화면 없이 실제 모듈 관통) 또는 `E2E` (실제 화면에서 실제 모듈까지 관통).
- **E2E 해당 없음(N/A)**: `N/A` (SP에 화면이 없는 단위) 또는 `REQUIRED` (기본값).
- **SP Section Reference (SP 근거 절)**: *[E2E N/A인 경우 필수]* SP 문서 내 화면 부재 확인 절.
- **Issue**: 연계된 GitHub 이슈 번호 (`owner/repo#number`).
- **Manifest Unit / REQ-IDs**: 연계된 기능 및 요구사항 단위 (`FE-NN`, `REQ-NNN`).
- **Target Repository**: 대상 저장소 (`nextain/naia-video-avatar`).
- **Target Commit**: 시험 실행 시점의 커밋 SHA (`git rev-parse HEAD`).
- **Executed At**: 시험 완료 일시 (ISO 8601).

### 2.2 산술적 검증 결과
거짓 완료를 방지하기 위한 정량 칸 명시:
- **Total Tests (실행한 시험 수)**: N
- **Passed (통과 수)**: N
- **Failed (실패 수)**: N (`Failed > 0`인 경우 통과 선언 절대 금지)
- **Skipped (건너뜀 수)**: N (건너뜀 사유 명시 필수)
- **Exit Code (종료 코드)**: 0 (성공) / 비 0 (실패)
- **Final Verdict (최종 판정)**: `PASS` 또는 `FAIL` / `BLOCKED`

### 2.3 실행 환경 및 산출물 경로
- **Tested Address (시험 주소)**: API 엔드포인트/로컬 서버 주소 또는 `"없음(모듈 시험)"`.
- **Artifact File Path (산출물 파일 경로)**: 생성된 결과 파일 경로 또는 `"해당 없음"`.
- **Preceding IT Receipt (선행 IT 영수증)**: *[E2E 필수]* 동일 이슈의 통과된 선행 IT 영수증 경로 및 커밋 SHA.

### 2.4 리뷰어 확인 세 가지 질문
1. **Q1**: 시험한 주소가 그 기능의 실제 경로인가?
2. **Q2**: 산출물 파일이 실제로 존재하며 직접 열어 확인했는가?
3. **Q3**: 화면 결과(E2E)가 같은 이슈의 통과된 IT 영수증을 가리키는가? (화면 없는 단위는 SP 근거 확인)

---

## 3. 등록된 영수증 목록

- [RECEIPT-IT-22-20261008-01.ko.md](./RECEIPT-IT-22-20261008-01.ko.md) ([English](./RECEIPT-IT-22-20261008-01.md)) — #22 통합 시험(IT) 영수증 (Loader, Core, Player, Coordinator, Catalog 모듈 검증)
- [RECEIPT-E2E-22-20261008-01.ko.md](./RECEIPT-E2E-22-20261008-01.ko.md) ([English](./RECEIPT-E2E-22-20261008-01.md)) — #22 E2E 영수증 (공개 demo 및 naia 예제 Playwright 브라우저 검증)
- [RECEIPT-IT-22-20261008-02.ko.md](./RECEIPT-IT-22-20261008-02.ko.md) ([English](./RECEIPT-IT-22-20261008-02.md)) — #22 통합 시험(IT) 영수증 (전체 단위 시험 스위트, B1/N1 AbortError 및 디코드 오류 검증 포함)
- [RECEIPT-E2E-22-20261008-02.ko.md](./RECEIPT-E2E-22-20261008-02.ko.md) ([English](./RECEIPT-E2E-22-20261008-02.md)) — #22 E2E 영수증 (QC-01 B1/N1 결함 수정 Playwright 브라우저 검증)
- [QC-01.md](./QC-01.md) — #22 독립 QC, `4f6f74c` 대상 (FAIL: 차단 B1, `85f5ca7`·`2ab1fd9` 에서 수정)
- [QC-02.md](./QC-02.md) — #22 독립 QC, `2ab1fd9` 대상 (PASS: 차단 결함 없음)
