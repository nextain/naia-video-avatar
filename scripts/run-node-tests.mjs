import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const tests = readdirSync(new URL("../src/test", import.meta.url))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort();

for (const test of tests) {
  const result = spawnSync(process.execPath, [`src/test/${test}`], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
