import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
let src = readFileSync(file, 'utf8');

const oldBlock = `\t\t\tawait agent.whenIdle();
\t\t\tconst session = agent.session;
\t\t\tconst events = Array.isArray(session.events) ? session.events : typeof session.snapshotEvents === "function" ? session.snapshotEvents() : [];
\t\t\tconst parts = [];
\t\t\tfor (const ev of events.slice(startSeq)) {
\t\t\t\tif (!ev || ev.type !== "assistant/message" || !ev.data) continue;
\t\t\t\tconst blocks = Array.isArray(ev.data.content) ? ev.data.content : [];
\t\t\t\tfor (const b of blocks) if (b && b.type === "text" && typeof b.text === "string") parts.push(b.text);
\t\t\t}`;

const newBlock = `\t\t\tawait agent.whenIdle();
\t\t\tconst session = agent.session;
\t\t\tconst events = Array.isArray(session.events) ? session.events : typeof session.snapshotEvents === "function" ? session.snapshotEvents() : [];
\t\t\t// 从末尾往回找我们刚投进去的那条用户消息，避免依赖 seq 的语义
\t\t\tconst probe = String(text).slice(0, 24);
\t\t\tlet from = -1;
\t\t\tfor (let i = events.length - 1; i >= 0; i--) {
\t\t\t\tconst ev = events[i];
\t\t\t\tif (!ev || ev.type !== "user/message") continue;
\t\t\t\ttry {
\t\t\t\t\tif (JSON.stringify(ev.data ?? {}).includes(probe)) { from = i; break; }
\t\t\t\t} catch {}
\t\t\t}
\t\t\tif (from < 0) from = Math.max(0, events.length - 80);
\t\t\tconst blocksOf = (data) => {
\t\t\t\tif (!data || typeof data !== "object") return [];
\t\t\t\tif (Array.isArray(data.blocks)) return data.blocks;
\t\t\t\tif (Array.isArray(data.content)) return data.content;
\t\t\t\tif (data.message && Array.isArray(data.message.content)) return data.message.content;
\t\t\t\treturn [];
\t\t\t};
\t\t\tconst parts = [];
\t\t\tfor (const ev of events.slice(from)) {
\t\t\t\tif (!ev || ev.type !== "assistant/message" || !ev.data) continue;
\t\t\t\tfor (const b of blocksOf(ev.data)) {
\t\t\t\t\tif (b && b.type === "text" && typeof b.text === "string" && b.text.trim()) parts.push(b.text);
\t\t\t\t}
\t\t\t}`;

if (!src.includes(oldBlock)) {
  console.error('relay extraction block not found');
  process.exit(2);
}

src = src.replace(oldBlock, newBlock);
writeFileSync(file, src, 'utf8');
console.log('extraction patched');
