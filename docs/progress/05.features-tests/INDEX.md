# 05. 기능 테스트 Registry (FT)

| ID | 검증 기능 | 테스트 | 실행 증거 | 상태 |
|---|---|---|---|---|
| FT-AV-001 | FE-AV-001 | 두 상태·필수 리소스·객체 bbox·범용 descriptor, 누락 descriptor, v0.2 migration, v0.4 거부 | `src/test/nva-v03-state-contract.test.mjs`, `src/test/nva-core.test.mjs` | Done |
| FT-AV-002 | FE-AV-002 | 상태별 speech plan과 완료·취소·오류·barge-in 후 같은 idle 복귀 | `src/test/nva-v03-state-contract.test.mjs` | Done |
| FT-AV-003 | FE-AV-003 | UI 로드·상태 선택·비선택 revision 불변·Windows profile_ref·원격 상태 요청·콘솔 오류 0 | `src/test/playwright/pw-editor-verify.spec.js`, `src/test/playwright/pw-nva-state-engine-phases.spec.js`, `src/test/playwright/phase_state_engine_playwright.py` | Done |
| FT-AV-004 | FE-AV-004 | portable 경로 거부, zip에 manifest와 모든 중복 제거 자산 포함, export/reopen 동등성 | `src/test/nva-v03-state-contract.test.mjs`, `src/test/playwright/phase_state_engine_playwright.py` | Done |

실행 명령:

```bash
pnpm test
pnpm test:browser
python /var/home/luke/alpha-adk/.agents/skills/webapp-testing/scripts/with_server.py \
  --server "python3 -m http.server 8785 --bind 127.0.0.1" --port 8785 --timeout 30 \
  -- python src/test/playwright/phase_state_engine_playwright.py
```
