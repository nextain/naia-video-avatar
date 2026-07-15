import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../main/editor.html", import.meta.url), "utf8");

assert.match(html, /data-ditto-region=/, "Ditto ROI x/y/w/h controls exist");
assert.match(html, /data-ditto-center/, "face-centered 512 action exists");
assert.match(html, /canvas\.dittoRegion/, "512 ROI preview guide exists");
assert.match(html, /a\.ditto_region=\[/, "editor writes ditto_region independently");
assert.match(html, /ditto_region:\[104,113,512,512\]/, "new 720x1280 avatars start with the shoulder-anchored Ditto region");
assert.match(html, /const dr=a&&a\.ditto_region/, "head frame generation reads the fixed Ditto ROI");
assert.match(html, /dr\[2\]!==512\|\|dr\[3\]!==512/, "head frame generation rejects non-512 ROI");
assert.match(html, /drawImage\(v, sx,sy,sw,sh, 0,0,512,512\)/, "head frame generation captures only the exact ROI");
assert.doesNotMatch(html, /Math\.max\(bw\*2\.6,bh\*1\.7\)/, "head frame generation never expands from face_bbox to a full-body square");

console.log("✓ editor fixed 512 Ditto region contract");
