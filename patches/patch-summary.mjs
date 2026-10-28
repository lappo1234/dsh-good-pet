import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
let src = readFileSync(file, 'utf8');

if (src.includes('pet-bub-full')) {
  console.log('already patched');
  process.exit(0);
}

const startMarker = '\treturn function WhisperBubble({ text, image, url, assetRoot, on }) {';
const endMarker = '\t};\n}\n';

const start = src.indexOf(startMarker);
if (start < 0) { console.error('start marker missing'); process.exit(2); }
const end = src.indexOf(endMarker, start);
if (end < 0) { console.error('end marker missing'); process.exit(3); }

const replacement = `\treturn function WhisperBubble({ text, image, url, assetRoot, on }) {
\t\tconst full = typeof text === "string" ? text : "";
\t\tconst isLong = full.length > 90;
\t\tconst summary = isLong ? full.slice(0, 90).replace(/\\s+$/, "") + "…" : full;
\t\tconst rows = [{
\t\t\trole: "label",
\t\t\ttext: summary
\t\t}];
\t\tconst key = String(image ?? "").trim();
\t\tconst href = String(url ?? "").trim();
\t\tconst src = href || (key ? memeImageUrl(key, "/dsh-pet-7340", assetRoot) : "");
\t\tconst kids = [];
\t\tif (src) kids.push(h("img", {
\t\t\tkey: "img",
\t\t\tclassName: MEME_IMG_CLASS,
\t\t\tsrc,
\t\t\talt: key || href
\t\t}));
\t\tkids.push(h("div", { key: "sum", className: "pet-bub-summary", children: rowsToNodes(h, rows) }));
\t\tif (isLong) {
\t\t\tkids.push(h("div", { key: "more", className: "pet-bub-more", children: "点我看全文" }));
\t\t\tkids.push(h("div", { key: "full", className: "pet-bub-full", children: full }));
\t\t}
\t\treturn h("div", {
\t\t\tclassName: "dsh-pet-bubble dsh-pet-whisper" + (src ? " " + MEME_BUBBLE_CLASS : "") + (on ? " is-on" : ""),
\t\t\tonClick: (e) => {
\t\t\t\tif (!isLong) return;
\t\t\t\te.stopPropagation();
\t\t\t\te.currentTarget.classList.toggle("is-expanded");
\t\t\t},
\t\t\tchildren: kids
\t\t});
\t};
}
`;

src = src.slice(0, start) + replacement + src.slice(end + endMarker.length);

const cssAnchor = '".dsh-pet-bubble .pet-bub-title{';
if (!src.includes('pet-bub-full{display:none')) {
  const cssNew = '".dsh-pet-bubble .pet-bub-more{font-size:calc(var(--f,12px)*0.8);opacity:.6;margin-top:calc(var(--f,12px)*0.2)}",\n\t".dsh-pet-bubble .pet-bub-full{display:none;white-space:pre-wrap;overflow-wrap:anywhere;max-height:50vh;overflow-y:auto;text-align:left}",\n\t".dsh-pet-bubble.is-expanded .pet-bub-full{display:block}",\n\t".dsh-pet-bubble.is-expanded .pet-bub-summary,.dsh-pet-bubble.is-expanded .pet-bub-more{display:none}",\n\t';
  src = src.replace(cssAnchor, cssNew + cssAnchor);
}

writeFileSync(file, src, 'utf8');
console.log('summary + expand patched');
