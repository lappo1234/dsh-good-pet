import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
let src = readFileSync(file, 'utf8');

const oldBlock = `const inject = [
\t"webServer",
\t"agentDefaultModel",
\t"credentials",
\t"llm",
\t"commands",
\t"connection"
];`;

if (src.includes('"agents"')) {
  console.log('agents already injected');
  process.exit(0);
}

if (!src.includes(oldBlock)) {
  console.error('inject block not found');
  process.exit(2);
}

const newBlock = oldBlock.replace('\t"connection"\n', '\t"connection",\n\t"agents"\n');
src = src.replace(oldBlock, newBlock);
writeFileSync(file, src, 'utf8');
console.log('inject agents added');
