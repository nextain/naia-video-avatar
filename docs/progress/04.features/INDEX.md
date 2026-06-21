# 04. 기능 설계 Registry (SPEC) — V모델 04

<!--
스키마: 이 한 파일 registry. UC(02)를 구현 가능한 기능 단위(SPEC)로 분해.
추적: 모든 SPEC는 ≥1 UC를 가리키고(역추적), ≥1 TEST-F(05)로 닫힌다 (orphan 0).
컬럼 = | ID | 유도 UC | 기능 요약 | area | 상태 | TEST-F |
-->

| ID | 유도 UC | 기능 요약 | area | 상태 | TEST-F |
|----|---------|-----------|------|------|--------|
| SPEC-001 | UC-001 | nva manifest JSON Schema (states/transitions/poses/layers/meta) | src/main/nva-schema.json | Done | TEST-F-001 |
| SPEC-002 | UC-001, UC-003 | nva-core: validateManifest + findTransitionPath + reachableStates + NvaStateMachine | src/main/nva-core.js | Done | TEST-F-001, TEST-F-002 |
| SPEC-003 | UC-002 | viewer: 크로마/알파 레이어 합성 + 상태 전환 재생 + 헤드토킹 오버레이 | src/main/viewer.html | Done | TEST-F-003 |
| SPEC-004 | UC-004 | editor: manifest 편집 + 미리보기 + 유효성 + `.nva`(JSZip) export | src/main/editor.html | Done | TEST-F-004 |
| SPEC-005 | UC-003 | scenario runner(playScenario)+listScenarios 자동 연출 재생 | src/main(viewer+core) | Done | TEST-F-005 |
