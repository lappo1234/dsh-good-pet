import { readFileSync, writeFileSync } from 'node:fs';

const [spriteFile, hostFile, sayFile] = process.argv.slice(2);

// A. sprite: 每个气泡都有 ×；长文才多一个「展开全文」
let s = readFileSync(spriteFile, 'utf8');
const oldBlock = `      if (isLong) {
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
        // buttons make bubble clickable —— 登记成控件矩形，主进程才肯把点击交给气泡
        this.bubble.classList.add('is-clickable');
        this.syncInputBusy();
      }`;

const newBlock = `      {
        this.bubble.style.pointerEvents = 'auto';
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;align-items:center;margin-top:4px';
        const btnStyle = 'font-size:11px;line-height:1.4;padding:2px 8px;border:1px solid rgba(0,0,0,.15);background:rgba(255,255,255,.95);border-radius:8px;cursor:pointer;color:#2b2b2b';
        if (isLong) {
          const more = document.createElement('button');
          more.textContent = this.whisperExpanded ? '收起' : '展开全文';
          more.style.cssText = btnStyle;
          more.addEventListener('click', (ev) => {
            ev.stopPropagation();
            this.whisperExpanded = !this.whisperExpanded;
            this.renderBubble();
          });
          actions.append(more);
        }
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = btnStyle + ';padding:2px 7px';
        closeBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.whisperOn = false;
          if (this.whisperTimer !== null) { window.clearTimeout(this.whisperTimer); this.whisperTimer = null; }
          this.renderBubble();
        });
        actions.append(closeBtn);
        this.bubble.appendChild(actions);
        // 任何气泡都登记成控件矩形，× 才点得到
        this.bubble.classList.add('is-clickable');
        this.syncInputBusy();
      }`;

if (!s.includes(oldBlock)) { console.error('sprite block missing'); process.exit(2); }
s = s.replace(oldBlock, newBlock);
writeFileSync(spriteFile, s, 'utf8');
console.log('sprite: close button on every bubble');

// B. host: 桥接回复 10 分钟
let h = readFileSync(hostFile, 'utf8');
h = h.replace('const sayDuration = bridgeSession.length > 0 ? -1 : undefined;', 'const sayDuration = bridgeSession.length > 0 ? 600000 : undefined;');
h = h.replace('" | dur=" + (bridgeSession.length > 0 ? -1 : "default")', '" | dur=" + (bridgeSession.length > 0 ? 600000 : "default")');
writeFileSync(hostFile, h, 'utf8');
console.log('host: 10min');

// C. say.ps1 默认 10 分钟
let p = readFileSync(sayFile, 'utf8');
p = p.replace('[int]$Duration = 86400000,', '[int]$Duration = 600000,');
writeFileSync(sayFile, p, 'utf8');
console.log('say.ps1: 10min');
