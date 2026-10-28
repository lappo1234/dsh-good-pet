import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
let src = readFileSync(file, 'utf8');

if (!src.includes('bridgeSessionId')) {
  const anchor = '\tconst relayToSession = async (sessionId, text) => {';
  if (!src.includes(anchor)) { console.error('anchor missing'); process.exit(2); }
  const helper = `\t/** 桥的目标会话：写在 ~/.dsh/dsh-pet/chat-session.txt 里，改它不用动配置 */\n\tconst bridgeSessionId = () => {\n\t\ttry {\n\t\t\treturn readFileSync(join(homedir(), ".dsh", "dsh-pet", "chat-session.txt"), "utf8").trim();\n\t\t} catch {\n\t\t\treturn "";\n\t\t}\n\t};\n`;
  src = src.replace(anchor, helper + anchor);
}

const oldLine = '\t\tconst bridgeSession = typeof found.conf.chatSession === "string" ? found.conf.chatSession.trim() : "";';
if (src.includes(oldLine)) {
  src = src.replace(oldLine, '\t\tconst bridgeSession = bridgeSessionId();');
}

writeFileSync(file, src, 'utf8');
console.log('bridge target switched to chat-session.txt');
