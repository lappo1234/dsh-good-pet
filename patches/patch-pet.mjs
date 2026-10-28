import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const file = process.argv[2];
const src = readFileSync(file, 'utf8');

if (src.includes('relayToSession')) {
  console.log('already patched');
  process.exit(0);
}

const anchor = '\tconst chatWithPet = async (petId, text) => withMemoryLock(async () => {';
if (!src.includes(anchor)) {
  console.error('anchor not found');
  process.exit(2);
}

const relay = `\t/**
\t * 桥：把桌宠聊天框的一句话投进指定 DSH 会话，等它答完，取回文字。
\t * 只在 pets[].chatSession 配了会话 id 时启用；失败返回结构化原因，不吞。
\t */
\tconst relayToSession = async (sessionId, text) => {
\t\ttry {
\t\t\tconst agents = ctx.agents ?? (typeof ctx.get === "function" ? ctx.get("agents") : undefined);
\t\t\tif (!agents || typeof agents.get !== "function") return { ok: false, reason: "no-agents", message: "宿主没有 agents 服务" };
\t\t\tconst agent = agents.get(sessionId);
\t\t\tif (!agent) return { ok: false, reason: "session-not-live", message: "目标会话不在运行：" + sessionId };
\t\t\tconst startSeq = typeof agent.session.seq === "number" ? agent.session.seq : 0;
\t\t\tconst msg = createUserMessage({ content: [{ type: "text", text }], source: { kind: "user" } });
\t\t\tlet claimed = false;
\t\t\ttry {
\t\t\t\tclaimed = await agent.runMaintenance(() => {
\t\t\t\t\tagent.followup(msg);
\t\t\t\t\treturn Promise.resolve(true);
\t\t\t\t});
\t\t\t} catch {
\t\t\t\tclaimed = false;
\t\t\t}
\t\t\tif (!claimed) return { ok: false, reason: "busy", message: "会话正忙，稍后再试" };
\t\t\tawait agent.whenIdle();
\t\t\tconst session = agent.session;
\t\t\tconst events = Array.isArray(session.events) ? session.events : typeof session.snapshotEvents === "function" ? session.snapshotEvents() : [];
\t\t\tconst parts = [];
\t\t\tfor (const ev of events.slice(startSeq)) {
\t\t\t\tif (!ev || ev.type !== "assistant/message" || !ev.data) continue;
\t\t\t\tconst blocks = Array.isArray(ev.data.content) ? ev.data.content : [];
\t\t\t\tfor (const b of blocks) if (b && b.type === "text" && typeof b.text === "string") parts.push(b.text);
\t\t\t}
\t\t\tconst reply = parts.join("\\n").trim();
\t\t\tif (!reply) return { ok: false, reason: "empty-reply", message: "会话没有产出文字" };
\t\t\treturn { ok: true, text: reply };
\t\t} catch (e) {
\t\t\treturn { ok: false, reason: "relay-error", message: String(e && e.message || e) };
\t\t}
\t};
`;

let out = src.replace(anchor, relay + anchor);

const oldCall = '\t\tconst generated = await generateChat(ctx, system, list, text, pool, configuredModel(found.conf, "chatModel"));';
if (!out.includes(oldCall)) {
  console.error('call not found');
  process.exit(3);
}

const newCall = `\t\tconst bridgeSession = typeof found.conf.chatSession === "string" ? found.conf.chatSession.trim() : "";
\t\tconst generated = bridgeSession.length > 0 ? await relayToSession(bridgeSession, text) : await generateChat(ctx, system, list, text, pool, configuredModel(found.conf, "chatModel"));`;

out = out.replace(oldCall, newCall);

copyFileSync(file, file + '.prebridge.bak');
writeFileSync(file, out, 'utf8');
console.log('patched ok');
