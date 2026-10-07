import test from "node:test";
import assert from "node:assert/strict";

import { StageBackground } from "../main/stage-background.js";

test("stage background switches local images and colors while revoking URLs", () => {
  const element = { style: {} };
  const revoked = [];
  let next = 0;
  const background = new StageBackground(element, {
    urlApi: {
      createObjectURL: () => `blob:bg-${++next}`,
      revokeObjectURL: (url) => revoked.push(url),
    },
  });
  background.setColor("#101722");
  assert.equal(element.style.backgroundColor, "#101722");
  background.setImage(new Blob(["image"], { type: "image/png" }));
  assert.match(element.style.backgroundImage, /blob:bg-1/);
  background.setImage(new Blob(["next"], { type: "image/jpeg" }));
  assert.deepEqual(revoked, ["blob:bg-1"]);
  background.setColor("#203A5F");
  assert.deepEqual(revoked, ["blob:bg-1", "blob:bg-2"]);
  assert.equal(element.style.backgroundImage, "none");
});

test("stage background rejects invalid image and color inputs", () => {
  const background = new StageBackground({ style: {} }, {
    urlApi: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
  });
  assert.throws(() => background.setColor("red"), /#RRGGBB/);
  assert.throws(() => background.setImage(new Blob(["text"], { type: "text/plain" })), /local image/);
});
