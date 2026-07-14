# 01. 요구사항 Registry (REQ)

현재 정본은 NVA `0.3` 상태 리소스 계약이다. `state_engine`과 `sil/a/i/u/e/o` 영상 묶음은 `docs/prebaked-webm-nva.md`의 역사적 실험으로만 보존하며 제품 계약이 아니다.

| ID | 영역 | 요구사항 | 상태 | UC | FE | 검증 |
|---|---|---|---|---|---|---|
| REQ-ARCH-001 | 상태 | 사용자 표현 상태를 서로 평탄화하지 않는 상태 리소스 묶음으로 저장한다. | Done | UC-AV-002, UC-AV-005 | FE-AV-001 | UCT-AV-002, UCT-AV-005, FT-AV-001 |
| REQ-ARCH-002 | 리소스 | 각 상태는 revision이 있는 idle, talking body, 범용 talking-head source/descriptor, 객체형 `face_bbox`를 가진다. | Done | UC-AV-002, UC-AV-003 | FE-AV-001, FE-AV-003 | UCT-AV-002, UCT-AV-003, FT-AV-001, FT-AV-003 |
| REQ-ARCH-003 | 복귀 | 발화 완료·취소·오류·barge-in 뒤 같은 `character_state_id`의 idle로 복귀한다. | Done | UC-AV-007 | FE-AV-002 | UCT-AV-007, FT-AV-002 |
| REQ-ARCH-004 | 버전 | 현재 0.3, legacy 0.1/0.2 migration, 상위 버전 명시적 거부 규칙을 모든 소비자가 공유한다. | Done | UC-AV-005 | FE-AV-001, FE-AV-004 | UCT-AV-005, FT-AV-001, FT-AV-004 |
| REQ-ARCH-005 | 상태 분리 | `playback_state`와 `character_state_id`를 서로 다른 필드로 취급한다. | Done | UC-AV-007 | FE-AV-002 | UCT-AV-007, FT-AV-002 |
| REQ-EXP-002 | 설명자 | talking-head 저장 방식·합성 위치·코덱을 스키마가 선결하지 않고 버전 있는 설명자가 수용한다. | Done | UC-AV-005, UC-AV-007 | FE-AV-001, FE-AV-002 | UCT-AV-005, UCT-AV-007, FT-AV-001, FT-AV-002 |
| REQ-NVA-001 | 편집 | 편집기는 상태·리소스 revision을 잃지 않고 저장하고 다시 연다. | Done | UC-AV-003, UC-AV-005 | FE-AV-003, FE-AV-004 | UCT-AV-003, UCT-AV-005, FT-AV-003, FT-AV-004 |
| REQ-NVA-002 | 공개 fixture | golden fixture는 비개인·비고객 절차 자산이며 출처와 라이선스를 기록한다. | Done | UC-AV-005 | FE-AV-004 | UCT-AV-005, FT-AV-004 |

## 사용자 정정 반영

- Windows 에디터가 상태별 논리적 `profile_ref`를 설정한다.
- Cascade endpoint는 Windows 로컬 설정이며 portable NVA에 URL이나 비밀 값을 넣지 않는다.
- 얼굴 검출 점수·입 동기화 점수·경계 품질은 현재 합의된 고정 임계값이 아니다. 에디터는 관측값을 보존하되 임의의 합격선을 만들지 않는다.
- 현재 단계의 검증 시작점은 기존 자산의 로드·migration·인식 가능 여부다.
