import { readFileSync, writeFileSync } from 'node:fs';

const [hostFile, spriteFile] = process.argv.slice(2);

// ---------- host: 会话列表与切换 ----------
let h = readFileSync(hostFile, 'utf8');
if (!h.includes('rest === "sessions"')) {
  const anchor = '\t\tif (rest === "chat") {';
  if (!h.includes(anchor)) { console.error('chat anchor missing'); process.exit(2); }
  const routes = `\t\tif (rest === "sessions") {
\t\t\ttry {
\t\t\t\tconst roots = typeof ctx.agents?.roots === "function" ? ctx.agents.roots() : [];
\t\t\t\tconst list = [];
\t\t\t\tfor (const a of roots) {
\t\t\t\t\tconst hh = a?.session?.header ?? {};
\t\t\t\t\tconst id = a?.session?.id ?? a?.id ?? "";
\t\t\t\t\tif (!id) continue;
\t\t\t\t\tconst title = String(hh.title || hh.cwd || id).replace(/\\\\/g, "/").split("/").filter(Boolean).pop() || id.slice(0, 8);
\t\t\t\t\tlist.push({ id, title: title.slice(0, 20), cwd: String(hh.cwd || "") });
\t\t\t\t}
\t\t\t\tlet cur = "";
\t\t\t\ttry { cur = readFileSync(join(homedir(), ".dsh", "dsh-pet", "chat-session.txt"), "utf8").trim(); } catch {}
\t\t\t\tfor (const it of list) it.current = it.id === cur;
\t\t\t\treturn { kind: "json", status: 200, obj: { ok: true, current: cur, sessions: list } };
\t\t\t} catch (e) {
\t\t\t\treturn { kind: "json", status: 200, obj: { ok: false, reason: String(e && e.message || e) } };
\t\t\t}
\t\t}
\t\tif (rest === "session") {
\t\t\tif (method !== "POST") return { kind: "json", status: 405, obj: { error: "method not allowed" } };
\t\t\ttry {
\t\t\t\tconst o = JSON.parse(body ?? "null") ?? {};
\t\t\t\tconst id = String(o.id ?? "").trim();
\t\t\t\tif (!id) return { kind: "json", status: 200, obj: { ok: false, reason: "bad-request" } };
\t\t\t\twriteFileSync(join(homedir(), ".dsh", "dsh-pet", "chat-session.txt"), id, "utf8");
\t\t\t\treturn { kind: "json", status: 200, obj: { ok: true } };
\t\t\t} catch (e) {
\t\t\t\treturn { kind: "json", status: 200, obj: { ok: false, reason: String(e && e.message || e) } };
\t\t\t}
\t\t}
`;
  h = h.replace(anchor, routes + anchor);
  writeFileSync(hostFile, h, 'utf8');
  console.log('host routes added');
}

// ---------- sprite: 会话选择入口 ----------
let s = readFileSync(spriteFile, 'utf8');

if (!s.includes('refreshSessions()')) {
  const ctor = "    this.menuItems = [];";
  if (!s.includes(ctor)) { console.error('ctor anchor missing'); process.exit(3); }
  s = s.replace(ctor, ctor + "\n    this.sessionList = [];\n    this.sessionCurrent = '';\n    this.refreshSessions();\n    this.sessionTimer = setInterval(() => this.refreshSessions(), 10000);");

  const methodAnchor = '  showWhisperFromMenu() {';
  if (!s.includes(methodAnchor)) { console.error('method anchor missing'); process.exit(4); }
  const method = `  refreshSessions() {
    fetch(BASE + '/dsh-pet-7340/sessions')
      .then((r) => r.json())
      .then((j) => {
        if (!j || !j.ok) return;
        this.sessionList = Array.isArray(j.sessions) ? j.sessions : [];
        const cur = this.sessionList.find((x) => x.current);
        this.sessionCurrent = cur ? cur.title : '';
      })
      .catch(() => {});
  }

  showWhisperFromMenu() {`;
  s = s.replace(methodAnchor, method);
}

if (!s.includes("action: 'set-session'")) {
  const menuAnchor = "    tools.push({ label: '查看余额', action: 'show-balance' });";
  if (!s.includes(menuAnchor)) { console.error('menu anchor missing'); process.exit(5); }
  const menuAdd = menuAnchor + `
    const sessKids = (this.sessionList || []).slice(0, 8).map((x) => ({
      label: (x.current ? '✓ ' : '') + x.title,
      action: 'set-session',
      sid: x.id,
    }));
    tools.push({
      label: '选择会话' + (this.sessionCurrent ? '（' + this.sessionCurrent + '）' : ''),
      children: sessKids.length ? sessKids : [{ label: '（没有活着的会话）', action: 'noop' }],
    });`;
  s = s.replace(menuAnchor, menuAdd);

  const handlerAnchor = "    if (leaf.action === 'show-balance') {";
  if (!s.includes(handlerAnchor)) { console.error('handler anchor missing'); process.exit(6); }
  const handler = `    if (leaf.action === 'set-session') {
      if (leaf.sid) {
        fetch(BASE + '/dsh-pet-7340/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: BASE },
          body: JSON.stringify({ id: leaf.sid }),
        })
          .then(() => this.refreshSessions())
          .catch(() => {});
      }
      return;
    }
    if (leaf.action === 'noop') return;
` + handlerAnchor;
  s = s.replace(handlerAnchor, handler);
}

writeFileSync(spriteFile, s, 'utf8');
console.log('sprite session picker added');
