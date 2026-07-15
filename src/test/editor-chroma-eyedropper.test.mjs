import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(
  new URL("../main/editor.html", import.meta.url),
  "utf8",
);

test("editor exposes a localized chroma-key eyedropper", () => {
  assert.match(editor, /id="m_chroma_pick"/);
  assert.match(editor, /"bg\.eyedropper":"스포이드"/);
  assert.match(editor, /"bg\.eyedropper":"Eyedropper"/);
});

test("eyedropper samples the original video frame and stores chroma_key", () => {
  assert.match(editor, /octx\.drawImage\(video,0,0,off\.width,off\.height\)/);
  assert.match(editor, /octx\.getImageData\(x,y,1,1\)/);
  assert.match(editor, /M\.chroma_key=hex/);
  assert.match(editor, /\$\("m_chroma"\)\.value=hex/);
  assert.match(editor, /cv\.getBoundingClientRect\(\)/);
});
