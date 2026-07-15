import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(
  new URL("../main/editor.html", import.meta.url),
  "utf8",
);

test("editor exposes manifest canvas width and height controls", () => {
  assert.match(editor, /id="m_canvas_w"/);
  assert.match(editor, /id="m_canvas_h"/);
  assert.match(editor, /setCanvasDimension\("width"/);
  assert.match(editor, /setCanvasDimension\("height"/);
});

test("preview sizing follows the manifest canvas ratio", () => {
  assert.match(editor, /ratio=cv\.width\/cv\.height/);
  assert.match(editor, /maxH\*ratio/);
  assert.match(editor, /cv\.style\.aspectRatio/);
});

test("video head generation captures the manifest Ditto ROI as an exact 512 square", () => {
  assert.match(editor, /c\.width=512; c\.height=512/);
  assert.match(editor, /const dr=a&&a\.ditto_region/);
  assert.match(editor, /drawImage\(v, sx,sy,sw,sh, 0,0,512,512\)/);
  assert.doesNotMatch(editor, /Math\.max\(bw\*2\.6,bh\*1\.7\)/);
  assert.match(editor, /heads\/"\+selected\+"_head_512\.png/);
});
