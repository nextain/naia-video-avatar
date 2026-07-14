# manage-skills result — NVA 0.3

## Analyzed change groups

- portable contract: `src/main/nva-core.js`, `src/main/nva-schema.json`
- Windows editor: `src/main/editor.html`
- golden fixture: `examples/demo.nva/manifest.json`
- automated checks: `src/test/`, `package.json`, `scripts/run-node-tests.mjs`
- trace and user docs: `docs/progress/`, format and Cascade guides

## Coverage decision

No reusable workspace-level `verify-*` skill was created. The rules are specific to the NVA
0.3 exchange format and already have executable local enforcement:

- schema/core parity and negative contract cases in `src/test/nva-v03-state-contract.test.mjs`
- browser CRUD, revision isolation, remote request, export/reopen, and unsafe input checks
- strict REQ→UC→UCT→FE→FT trace validation
- two clean adversarial development and test review passes

A separate verify skill would duplicate these project-owned tests without covering another
repository. `verify-conflict-markers` and the project test/browser/trace commands remain the
appropriate pre-commit checks. If the 0.3 contract becomes a shared package consumed by multiple
repositories, promote these checks into a cross-repo `verify-nva-contract` skill then.
