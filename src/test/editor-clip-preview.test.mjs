import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(
  new URL("../main/editor.html", import.meta.url),
  "utf8",
);

test("editor exposes a clip preview control beside the clip path", () => {
  assert.match(editor, /data-k="clip"[\s\S]*data-clip-preview/);
  assert.match(editor, /"form\.clipPreview":"▶ 미리보기"/);
  assert.match(editor, /"form\.clipPreview":"▶ Preview"/);
});

test("clip preview replays the selected animation in the central player", () => {
  assert.match(
    editor,
    /querySelector\("\[data-clip-preview\]"\)[\s\S]*busy=false; current=null; goto\(selected\)/,
  );
});
