# Project Structure Specification

English | [한국어](./project-structure.ko.md)

> **SoT**: `.agents/context/agents-rules.json` F12/F13
> Always check registry status in this document before creating new files/folders.
> Unregistered resources → **deleted** by `scripts/enforce-root-structure.sh --fix`.

---

## Allowed Root Directories (F12 Registry)

| Directory | Purpose |
|---------|------|
| `.agents/` | AI context SoT — rules, progress, reviews |
| `.claude/` | Claude Code configuration |
| `.github/` | CI/CD workflows |
| `.users/` | Human-readable mirror (reflects `.agents/` content) |
| `about-docs/` | **Meta documentation about this canonical repo itself** (descriptions, verification ledgers, experiments). Not payload — excluded from replication in project-create/migration |
| `benchmark/` | Performance, accuracy, and autonomy benchmarks |
| `bin/` | CLI entry points |
| `docs/` | Canonical design documentation (only those registered in this table, sub: `progress/` issue-specific deliverables) |
| `examples/` | Executable examples |
| `node_modules/` | Dependencies (gitignored, automatically generated) |
| `packages/` | Source packages (only those registered in `pnpm-workspace.yaml`) |
| `quarantine/` | **Quarantine holding** (6th disposition method) — backup of suspected abandoned assets. Actual files are gitignored, only `MANIFEST.json`/`README.md` are tracked. Managed by `scripts/quarantine.mjs` (agents-rules `quarantine_policy`) |
| `READMES/` | Multilingual READMEs |
| `scripts/` | Build, verification, and operation scripts (sub: `cron/` periodic batch tasks) |
| `src/` | Source code (sub: `main/` main source, `test/` tests) |

> When adding a new directory: `agents-rules.json` F12 → this table → user approval order is mandatory.

---

## Allowed Root Files (F13 Registry)

| File | Purpose |
|------|------|
| `AGENTS.md` | AI tool entry point — canonical SoT |
| `CLAUDE.md` | AGENTS.md mirror (Claude Code) |
| `GEMINI.md` | AGENTS.md mirror (Gemini CLI) |
| `OPENCODE.md` | AGENTS.md mirror (opencode) |
| `CODEX.md` | AGENTS.md mirror (Codex) |
| `.gitignore` | Git ignore rules |
| `.gitmodules` | Submodule configuration |
| `LICENSE` | License |
| `package.json` | Root workspace package configuration |
| `pnpm-workspace.yaml` | pnpm workspace package list |
| `pnpm-lock.yaml` | pnpm lock file |
| `tsconfig.json` | TypeScript project references |
| `tsconfig.base.json` | Common tsconfig defaults |
| `README.md` | Introduction to this repo (excluded from replication) |
| `README.template.md` | README skeleton for new projects (used as README.md in create/migration) |
| `CHANGELOG.md` | Change log |

> When adding a new file: `agents-rules.json` F13 → this table → user approval order is mandatory.

---

## Registered Packages (Package Registry)

Packages under `packages/` can only be created if registered in `pnpm-workspace.yaml`.

Procedure for adding a new package:
1. Edit `pnpm-workspace.yaml` first
2. Update `agents-rules.json` package list
3. Add to this table
4. Create actual folder/files after user approval

| Package Directory | npm name | Layer | Description |
|--------------|----------|------|------|
| _(Defined by project)_ | — | — | — |

---

## Canonical Documents (Doc Registry)

Documents under `docs/` must be registered in the `AGENTS.md` Canonical Design Documents table.

Procedure for adding a new document:
1. Add to `AGENTS.md` Canonical Design Documents table first
2. Add to this table
3. Create actual file after user approval

| File | Role |
|------|------|
| `project-structure.md` | This file — Structure specification |
| `lessons.md` | Lessons — Why rules exist |
| `requirements.md` | Functional / non-functional requirements |
| `user-scenarios.md` | User scenarios + test coverage map |
| `glossary.md` | Domain glossary |
| `ARCHITECTURE.md` | System architecture |

---

## Enforcement

```bash
./scripts/enforce-root-structure.sh         # dry-run — print violations
./scripts/enforce-root-structure.sh --fix   # delete unregistered items
```
