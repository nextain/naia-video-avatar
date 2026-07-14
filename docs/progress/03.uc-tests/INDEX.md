# 03. 사용자 시나리오 테스트 Registry (UCT)

| ID | 검증 UC | 시나리오 | 실행 증거 | 상태 |
|---|---|---|---|---|
| UCT-AV-002 | UC-AV-002 | 두 상태 golden fixture를 열고 상태 목록·필수 리소스·기본 상태를 확인한다. | `src/test/nva-v03-state-contract.test.mjs`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| UCT-AV-003 | UC-AV-003 | seated profile/label을 바꾸고 neutral 전체와 seated의 비선택 revision이 그대로인지 확인한다. | `src/test/nva-v03-state-contract.test.mjs`, `src/test/playwright/pw-nva-state-engine-phases.spec.js` | Done |
| UCT-AV-005 | UC-AV-005 | 편집→zip export→manifest/assets reopen 동등성, v0.2 migration, v0.4·경로 탈출 거부를 확인한다. | `src/test/nva-v03-state-contract.test.mjs`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| UCT-AV-007 | UC-AV-007 | 선택 상태를 `/stream_text` 요청에 보내고 완료·취소·오류·barge-in이 같은 상태 idle로 복귀하는지 확인한다. | `src/test/nva-v03-state-contract.test.mjs`, `src/test/playwright/phase_state_engine_playwright.py` | Done |

브라우저 증거: `/var/home/luke/alpha-adk/.agents/work/nva-editor-v03.png` (gitignored 실행 산출물). 지속 증거는 위 테스트 코드와 golden fixture다.
