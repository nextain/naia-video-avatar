import assert from "node:assert/strict";
import test from "node:test";

import { LoadCoordinator } from "../main/load-coordinator.js";

test("a newer avatar load aborts and invalidates the previous load", () => {
  const loads = new LoadCoordinator();
  const first = loads.begin();
  assert.equal(loads.isCurrent(first.generation), true);
  const second = loads.begin();
  assert.equal(first.signal.aborted, true);
  assert.equal(loads.isCurrent(first.generation), false);
  assert.equal(loads.isCurrent(second.generation), true);
});

test("cancelling invalidates the active avatar load", () => {
  const loads = new LoadCoordinator();
  const active = loads.begin();
  loads.cancel();
  assert.equal(active.signal.aborted, true);
  assert.equal(loads.isCurrent(active.generation), false);
});
