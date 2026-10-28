import { readFileSync, writeFileSync } from 'node:fs';

const [hostFile, spriteFile] = process.argv.slice(2);
let h = readFileSync(hostFile, 'utf8');

// 1) /sessions：活会话 + 磁盘上的冷会话
if (!h.includes('coldScan')) {
  const oldBlock = `\t\tif (rest === "sessions") {
\t\t\ttry {
\t\t\t\tconst roots = typeof ctx.agents?.roots === "function" ? ctx.agents.roots() : [];
\t\t\t\tconst list = [];`;
  if (!h.includes(oldBlock)) { console.error('sessions block anchor missing'); process.exit(2); }
  const newBlock = `\t\tif (rest === "sessions") {
\t\t\ttry {
\t\t\t\tconst roots = typeof ctx.agents?.roots === "function" ? ctx.agents.roots() : [];
\t\t\t\tconst list = [];
\t\t\t\tconst coldScan = (id) => {
\t\t\t\t\tconst out = [];
\t\t\t\t\tconst base = join(homedir(), ".dsh", "sessions");
\t\t\t\t\ttry {
\t\t\t\t\t\tfor (const ws of readdirSync(base)) {
\t\t\t\t\t\t\tconst wsName = ws.replace(/^--|--$/g, "").replace(/~([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
\t\t\t\t\t\t\tconst wsPath = join(base, ws);
\t\t\t\t\t\t\tlet dirs = [];
\t\t\t\t\t\t\ttry { dirs = readdirSync(wsPath); } catch { continue; }
\t\t\t\t\t\t\tfor (const d of dirs) {
\t\t\t\t\t\t\t\tif (!d.startsWith("session-")) continue;
\t\t\t\t\t\t\t\tif (d === id) continue;
\t\t\t\t\t\t\t\tlet has = false;
\t\t\t\t\t\t\t\ttry { has = readdirSync(join(wsPath, d)).some((f) => f.startsWith("session.v")); } catch {}
\t\t\t\t\t\t\t\tif (!has) continue;
\t\t\t\t\t\t\t\tconst tail = wsName.split("/").filter(Boolean).pop() || wsName;
\t\t\t\t\t\t\t\tout.push({ id: d, title: (tail + " · " + d.slice(8, 14)).slice(0, 24), cwd: wsName, live: false });
\t\t\t\t\t\t\t}
\t\t\t\t\t\t}
\t\t\t\t\t} catch {}
\t\t\t\t\treturn out;
\t\t\t\t};`;
  h = h.replace(oldBlock, newBlock);
}

// 2) 在填充 live 列表后补冷会话（去重）
if (!h.includes('for (const c of coldScan')) {
  const anchor = '\t\t\t\tfor (const it of list) it.current = it.id === cur;';
  if (!h.includes(anchor)) { console.error('current anchor missing'); process.exit(3); }
  const add = '\t\t\t\tconst seen = new Set(list.map((x) => x.id));\n\t\t\t\tfor (const c of coldScan(cur)) if (!seen.has(c.id)) list.push(c);\n' + anchor;
  h = h.replace(anchor, add);
}

// 3) relay：冷会话先 resume
if (!h.includes('resumeSessionId')) {
  const oldRelay = `\t\t\tconst agent = agents.get(sessionId);
\t\t\tif (!agent) return {
\t\t\t\tok: false,
\t\t\t\treason: "session-not-live",
\t\t\t\tmessage: "目标会话不在运行：" + sessionId
\t\t\t};`;
  if (!h.includes(oldRelay)) { console.error('relay anchor missing'); process.exit(4); }
  const newRelay = `\t\t\tlet agent = agents.get(sessionId);
\t\t\tif (!agent) {
\t\t\t\t// 冷会话：先用会话自己记的配置把它叫醒（不调用模型）
\t\t\t\ttry {
\t\t\t\t\tconst handle = await agents.resume({ resumeSessionId: sessionId, agentOptions: {} });
\t\t\t\t\tagent = handle?.agent ?? agents.get(sessionId);
\t\t\t\t} catch (e) {
\t\t\t\t\treturn { ok: false, reason: "resume-failed", message: "叫醒会话失败：" + String(e && e.message || e) };
\t\t\t\t}
\t\t\t}
\t\t\tif (!agent) return { ok: false, reason: "session-not-live", message: "目标会话不在运行：" + sessionId };`;
  h = h.replace(oldRelay, newRelay);
}

writeFileSync(hostFile, h, 'utf8');
console.log('host: cold sessions + resume');

// sprite: 冷会话加标记
let s = readFileSync(spriteFile, 'utf8');
if (!s.includes("x.live === false")) {
  const anchor = "      label: (x.current ? '✓ ' : '') + x.title,";
  if (!s.includes(anchor)) { console.error('sprite label anchor missing'); process.exit(5); }
  s = s.replace(anchor, "      label: (x.current ? '✓ ' : '') + x.title + (x.live === false ? '（冷）' : ''),");
}
writeFileSync(spriteFile, s, 'utf8');
console.log('sprite: cold tag');
