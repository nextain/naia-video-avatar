# 02. 사용자 시나리오 Registry (UC)

| ID | 사용자 | 시나리오 | 요구사항 | 상태 | 사용자 테스트 |
|---|---|---|---|---|---|
| UC-AV-002 | NVA 제작자 | 기존 상태를 그대로 둔 채 새 표현 상태의 전체 리소스 묶음을 추가한다. | REQ-ARCH-001, REQ-ARCH-002 | Done | UCT-AV-002 |
| UC-AV-003 | NVA 제작자 | 선택한 상태의 한 리소스만 새 revision으로 교체하고 비선택 상태·리소스는 보존한다. | REQ-ARCH-002, REQ-NVA-001 | Done | UCT-AV-003 |
| UC-AV-005 | NVA 제작자 | 0.3 NVA를 저장하고 다시 열어 같은 상태·설명자·revision을 얻는다. legacy는 migration하고 상위 버전은 거부한다. | REQ-ARCH-001, REQ-ARCH-004, REQ-EXP-002, REQ-NVA-001, REQ-NVA-002 | Done | UCT-AV-005 |
| UC-AV-007 | 검토자 | Windows에서 상태와 profile을 고르고 원격 Cascade에 NVA를 올린 뒤 그 상태로 발화하고 같은 idle로 복귀한다. | REQ-ARCH-003, REQ-ARCH-005, REQ-EXP-002 | Done | UCT-AV-007 |

성공 기준은 브라우저 UI와 실제 core 호출에서 관찰한다. 에디터의 body/head 미리보기는 배치 확인이며 입 동기화 방식의 제품 확정 증거로 세지 않는다.
