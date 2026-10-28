import { readFileSync, writeFileSync } from 'node:fs';

const [hostFile, spriteFile] = process.argv.slice(2);
let h = readFileSync(hostFile, 'utf8');

// 1) 引入 zstd 解压
if (!h.includes('zstdDecompressSync')) {
  const imp = 'import { fileURLToPath } from "node:url";';
  if (!h.includes(imp)) { console.error('import anchor missing'); process.exit(2); }
  h = h.replace(imp, imp + '\nimport { zstdDecompressSync } from "node:zlib";');
}

// 2) 读取会话首条用户消息作为标题（逐帧解压 zstd）
if (!h.includes('const readSessionTitle')) {
  const anchor = '\tconst sessionTitleCache = new Map();';
  if (!h.includes(anchor)) { console.error('cache anchor missing'); process.exit(3); }
  const fn = `\tconst sessionTitleCache = new Map();
\tconst readSessionTitle = (id) => {
\t\ttry {
\t\t\tconst base = join(homedir(), ".dsh", "sessions");
\t\t\tlet file = "";
\t\t\tfor (const ws of readdirSync(base)) {
\t\t\t\tconst d = join(base, ws, id);
\t\t\t\ttry {
\t\t\t\t\tconst f = readdirSync(d).find((x) => x.startsWith("session.v"));
\t\t\t\t\tif (f) { file = join(d, f); break; }
\t\t\t\t} catch {}
\t\t\t}
\t\t\tif (!file) return "";
\t\t\tconst buf = readFileSync(file);
\t\t\tconst offs = [];
\t\t\tfor (let i = 0; i + 4 <= buf.length && offs.length < 120; i++) {
\t\t\t\tif (buf[i] === 0x28 && buf[i + 1] === 0xb5 && buf[i + 2] === 0x2f && buf[i + 3] === 0xfd) offs.push(i);
\t\t\t}
\t\t\tfor (let k = 0; k < offs.length; k++) {
\t\t\t\tconst end = k + 1 < offs.length ? offs[k + 1] : buf.length;
\t\t\t\tlet text = "";
\t\t\t\ttry { text = zstdDecompressSync(buf.subarray(offs[k], end)).toString("utf8"); } catch { continue; }
\t\t\t\tfor (const line of text.split("\\n")) {
\t\t\t\t\tif (!line.trim()) continue;
\t\t\t\t\tlet ev;
\t\t\t\t\ttry { ev = JSON.parse(line); } catch { continue; }
\t\t\t\t\tif (!ev || (ev.type !== "user/message" && ev.type !== "agent/inbox/spliced")) continue;
\t\t\t\t\tconst d = ev.data || {};
\t\t\t\t\tconst blocks = Array.isArray(d.blocks) ? d.blocks
\t\t\t\t\t\t: Array.isArray(d.content) ? d.content
\t\t\t\t\t\t: Array.isArray(d.inserted) && d.inserted[0] && Array.isArray(d.inserted[0].content) ? d.inserted[0].content
\t\t\t\t\t\t: [];
\t\t\t\t\tconst t = blocks.find((b) => b && b.type === "text" && typeof b.text === "string" && b.text.trim());
\t\t\t\t\tif (t) return String(t.text).replace(/\\s+/g, " ").trim().slice(0, 24);
\t\t\t\t}
\t\t\t}
\t\t} catch {}
\t\treturn "";
\t};`;
  h = h.replace(anchor, fn);
}

// 3) 列表里用这个标题
const oldEnrich = `\t\t\t\tconst persist = typeof ctx.get === "function" ? ctx.get("sessionPersistence") : undefined;
\t\t\t\tif (persist && typeof persist.inspect === "function") {
\t\t\t\t\tfor (const it of list) {
\t\t\t\t\t\tif (sessionTitleCache.has(it.id)) { it.title = sessionTitleCache.get(it.id); continue; }
\t\t\t\t\t\ttry {
\t\t\t\t\t\t\tconst ins = await persist.inspect(it.id);
\t\t\t\t\t\t\tconst ev = (ins && ins.events ? ins.events : []).find((e) => e && e.type === "user/message");
\t\t\t\t\t\t\tconst blocks = ev && ev.data ? (ev.data.blocks || ev.data.content || []) : [];
\t\t\t\t\t\t\tconst t = blocks.find((b) => b && b.type === "text" && typeof b.text === "string" && b.text.trim());
\t\t\t\t\t\t\tif (t) {
\t\t\t\t\t\t\t\tconst title = String(t.text).replace(/\\s+/g, " ").trim().slice(0, 24);
\t\t\t\t\t\t\t\tsessionTitleCache.set(it.id, title);
\t\t\t\t\t\t\t\tit.title = title;
\t\t\t\t\t\t\t}
\t\t\t\t\t\t} catch {}
\t\t\t\t\t}
\t\t\t\t}`;

const newEnrich = `\t\t\t\tfor (const it of list) {
\t\t\t\t\tif (!sessionTitleCache.has(it.id)) {
\t\t\t\t\t\tconst t = readSessionTitle(it.id);
\t\t\t\t\t\tif (t) sessionTitleCache.set(it.id, t);
\t\t\t\t\t}
\t\t\t\t\tconst cached = sessionTitleCache.get(it.id);
\t\t\t\t\tif (cached) it.title = cached;
\t\t\t\t}`;

if (!h.includes(oldEnrich)) { console.error('enrich anchor missing'); process.exit(4); }
h = h.replace(oldEnrich, newEnrich);

writeFileSync(hostFile, h, 'utf8');
console.log('host: read titles from session frames');

// 4) 去掉「（冷）」标记
let s = readFileSync(spriteFile, 'utf8');
s = s.replace(" + (x.live === false ? '（冷）' : '')", "");
writeFileSync(spriteFile, s, 'utf8');
console.log('sprite: cold tag removed');
