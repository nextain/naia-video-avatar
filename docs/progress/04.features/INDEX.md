# 04. 기능 Registry (FE)

| ID | UC | 기능 | 구현 | 상태 | 기능 테스트 |
|---|---|---|---|---|---|
| FE-AV-001 | UC-AV-002, UC-AV-005 | 0.3 상태 리소스 JSON Schema, validator, 0.1/0.2 migration, 상위 버전 거부 | `src/main/nva-schema.json`, `src/main/nva-core.js` | Done | FT-AV-001 |
| FE-AV-002 | UC-AV-007 | 상태 선택·발화 계획·재생 상태 분리·동일 상태 복귀 core | `src/main/nva-core.js` | Done | FT-AV-002 |
| FE-AV-003 | UC-AV-002, UC-AV-003, UC-AV-005, UC-AV-007 | 상태 CRUD, 리소스/revision 편집, profile_ref, 원격 Cascade 설정·업로드·발화 UI | `src/main/editor.html` | Done | FT-AV-003 |
| FE-AV-004 | UC-AV-005 | 경로 안전성, zip builder, 공개 2상태 golden fixture, browser export/reopen | `src/main/nva-core.js`, `src/main/editor.html`, `examples/demo.nva/manifest.json` | Done | FT-AV-004 |

`talking_head.descriptor.kind`는 확장 가능한 문자열이다. `remote-profile`은 현재 에디터의 사용 예이며 포맷 자체가 한 렌더 방식만 허용한다는 뜻이 아니다.
