import { readFileSync, writeFileSync } from 'node:fs';

const [hostFile, eventsFile, spriteFile] = process.argv.slice(2);

// A. 宿主：气泡发全文（摘要与展开交给前端）
let h = readFileSync(hostFile, 'utf8');
if (h.includes('const sayText = bridgeSession.length > 0 ? toBubbleText(generated.text) : generated.text;')) {
  h = h.replace('const sayText = bridgeSession.length > 0 ? toBubbleText(generated.text) : generated.text;', 'const sayText = generated.text;');
  writeFileSync(hostFile, h, 'utf8');
  console.log('host: full text');
}

// B. events.js：记录全文 + 展开态 + duration=-1 不自动关
let e = readFileSync(eventsFile, 'utf8');
if (!e.includes('this.whisperExpanded = false;')) {
  const anchor = '  if (duration === 0) return;\n  this.whisperOn = true;';
  if (!e.includes(anchor)) { console.error('events anchor missing'); process.exit(2); }
  e = e.replace(anchor, '  if (duration === 0) return;\n  this.whisperExpanded = false;\n  this.whisperFull = text;\n  this.whisperOn = true;');
}
const oldTimer = `  if (this.whisperTimer !== null) window.clearTimeout(this.whisperTimer);
  this.whisperTimer = window.setTimeout(() => {
    this.whisperOn = false;
    this.renderBubble();
  }, duration ?? BUBBLE_DURATION_MS);`;
const newTimer = `  if (this.whisperTimer !== null) window.clearTimeout(this.whisperTimer);
  if (duration === -1) {
    this.whisperTimer = null;
  } else {
    this.whisperTimer = window.setTimeout(() => {
      this.whisperOn = false;
      this.renderBubble();
    }, duration ?? BUBBLE_DURATION_MS);
  }`;
if (e.includes(oldTimer)) e = e.replace(oldTimer, newTimer);
writeFileSync(eventsFile, e, 'utf8');

// C. sprite.js：摘要 + 两个按钮
let s = readFileSync(spriteFile, 'utf8');
const oldLine = `      const line = document.createElement('div');
      line.className = 'pet-bub-row';
      line.textContent = this.whisperView[0]?.text ?? '';
      this.bubble.appendChild(line);`;

const newLine = `      const full = this.whisperFull || (this.whisperView[0]?.text ?? '');
      const isLong = full.length > 90;
      const shown = !isLong || this.whisperExpanded ? full : full.slice(0, 90).replace(/\\s+$/, '') + '…';
      const line = document.createElement('div');
      line.className = 'pet-bub-row';
      line.textContent = shown;
      this.bubble.style.maxHeight = this.whisperExpanded ? '52vh' : '';
      this.bubble.style.overflowY = this.whisperExpanded ? 'auto' : '';
      this.bubble.appendChild(line);
      if (isLong) {
        this.bubble.style.pointerEvents = 'auto';
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;margin-top:4px';
        const btnStyle = 'font-size:11px;line-height:1.4;padding:2px 8px;border:1px solid rgba(0,0,0,.15);background:rgba(255,255,255,.95);border-radius:8px;cursor:pointer;color:#2b2b2b';
        const more = document.createElement('button');
        more.textContent = this.whisperExpanded ? '收起' : '展开全文';
        more.style.cssText = btnStyle;
        more.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.whisperExpanded = !this.whisperExpanded;
          this.renderBubble();
        });
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = btnStyle + ';padding:2px 6px';
        closeBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.whisperOn = false;
          if (this.whisperTimer !== null) { window.clearTimeout(this.whisperTimer); this.whisperTimer = null; }
          this.renderBubble();
        });
        actions.append(more, closeBtn);
        this.bubble.appendChild(actions);
      }`;

if (s.includes(oldLine)) {
  s = s.replace(oldLine, newLine);
  writeFileSync(spriteFile, s, 'utf8');
  console.log('sprite: buttons added');
} else {
  console.error('sprite anchor missing');
  process.exit(3);
}
