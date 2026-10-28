import { readFileSync, writeFileSync } from 'node:fs';

const [hostFile, spriteFile] = process.argv.slice(2);
let h = readFileSync(hostFile, 'utf8');

// 1) 冷会话扫描函数
const anchor1 = "\t\t\t\tconst list = [];\n\t\t\t\tfor (const a of roots) {";
if (!h.includes(anchor1)) { console.error('anchor1 missing'); process.exit(2); }

const coldFn = [
  "\t\t\t\tconst scanCold = () => {",
  "\t\t\t\t\tconst out = [];",
  "\t\t\t\t\tconst base = join(homedir(), \".dsh\", \"sessions\");",
  "\t\t\t\t\ttry {",
  "\t\t\t\t\t\tfor (const ws of readdirSync(base)) {",
  "\t\t\t\t\t\t\tconst wsName = ws.replace(/^--|--$/g, \"\").replace(/~([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));",
  "\t\t\t\t\t\t\tconst wsPath = join(base, ws);",
  "\t\t\t\t\t\t\tlet dirs = [];",
  "\t\t\t\t\t\t\ttry { dirs = readdirSync(wsPath); } catch { continue; }",
  "\t\t\t\t\t\t\tfor (const d of dirs) {",
  "\t\t\t\t\t\t\t\tif (!d.startsWith(\"session-\")) continue;",
  "\t\t\t\t\t\t\t\tlet has = false;",
  "\t\t\t\t\t\t\t\ttry { has = readdirSync(join(wsPath, d)).some((f) => f.startsWith(\"session.v\")); } catch {}",
  "\t\t\t\t\t\t\t\tif (!has) continue;",
  "\t\t\t\t\t\t\t\tconst parts = wsName.split(\"-\").filter(Boolean);",
  "\t\t\t\t\t\t\t\tconst tail = parts[parts.length - 1] || wsName;",
  "\t\t\t\t\t\t\t\tout.push({ id: d, title: (tail + \" · \" + d.slice(8, 14)).slice(0, 24), cwd: wsName, live: false });",
  "\t\t\t\t\t\t\t}",
  "\t\t\t\t\t\t}",
  "\t\t\t\t\t} catch {}",
  "\t\t\t\t\treturn out;",
  "\t\t\t\t};",
  ""
].join('\n') + anchor1;

h = h.replace(anchor1, coldFn);

// 2) 合并冷会话（去重、排除当前活着的）
const anchor2 = "\t\t\t\tfor (const it of list) it.current = it.id === cur;";
if (!h.includes(anchor2)) { console.error('anchor2 missing'); process.exit(3); }
const merge = [
  "\t\t\t\tconst seen = new Set(list.map((x) => x.id));",
  "\t\t\t\tfor (const c of scanCold()) if (!seen.has(c.id)) { c.current = c.id === cur; list.push(c); }",
  anchor2
].join('\n');
h = h.replace(anchor2, merge);

writeFileSync(hostFile, h, 'utf8');
console.log('host cold scan added');

// 3) 菜单里的冷标记
let s = readFileSync(spriteFile, 'utf8');
if (!s.includes("（冷）")) {
  const anchor3 = "      label: (x.current ? '✓ ' : '') + x.title,";
  if (s.includes(anchor3)) {
    s = s.replace(anchor3, "      label: (x.current ? '✓ ' : '') + x.title + (x.live === false ? '（冷）' : ''),");
    writeFileSync(spriteFile, s, 'utf8');
    console.log('sprite cold tag added');
  } else {
    console.log('sprite label anchor missing');
  }
}
