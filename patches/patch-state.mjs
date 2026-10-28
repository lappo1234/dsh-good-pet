import { readFileSync, writeFileSync } from 'node:fs';

const f = process.argv[2];
let s = readFileSync(f, 'utf8');

if (s.includes('petState')) { console.log('already'); process.exit(0); }

// A. 构造函数里加状态字段
const a = '    this.pressScoreFired = false;';
if (!s.includes(a)) { console.error('A missing'); process.exit(2); }
s = s.replace(a, a + "\n    // ---- 拟人状态机（借 VPet 的结构：先定状态，再选动画）----\n    this.petState = 'normal'; // normal | sleep\n    this.lastInteractAt = Date.now();\n    this.sleepAfterMs = 8 * 60 * 1000;\n    this.stateTimer = setInterval(() => this.tickState(), 20000);");

// B. 方法：触摸 / 醒 / 睡 / 状态 tick / 分区选动作
const b = '  onPointerDown(e) {';
if (!s.includes(b)) { console.error('B missing'); process.exit(3); }
const methods = `  // ---- 拟人状态机 ----
  touch() {
    this.lastInteractAt = Date.now();
  }

  tickState() {
    if (this.petState !== 'normal') return;
    if (Date.now() - this.lastInteractAt < this.sleepAfterMs) return;
    this.enterSleep();
  }

  enterSleep() {
    this.petState = 'sleep';
    this.stopMove();
    this.playOnce('原地小憩沉眠');
  }

  wakeUp() {
    if (this.petState !== 'sleep') return false;
    this.petState = 'normal';
    this.playOnce('打瞌睡被惊醒');
    return true;
  }

  // 点击分区：上部=头、下部=尾巴、中间=身体（照 VPet 的 Touch_Head / Touch_Body 分区）
  zoneAnim(e) {
    try {
      const r = this.hit.getBoundingClientRect();
      const rel = r.height > 0 ? (e.clientY - r.top) / r.height : 0.5;
      if (rel < 0.36) return ['点击回应-害羞惊讶', '点击回应-挠痒咯咯笑'];
      if (rel > 0.82) return ['用鲸鱼尾巴拍打地面', '点击回应-傲娇生气'];
    } catch {}
    return this.animations.clicks;
  }

  onPointerDown(e) {`;
s = s.replace(b, methods);

// C. 点击时：先醒、记一次互动、按分区选动作
const c = `    if (!this.animations.clicks.length) return;
    this.pendingSquash = true; // 等新点击动画切到前台后 Q 弹（压新首帧，与浏览器一致）
    this.playOnce(S.pick(this.animations.clicks));`;
if (!s.includes(c)) { console.error('C missing'); process.exit(4); }
s = s.replace(c, `    this.touch();
    this.wakeUp();
    const pool = this.zoneAnim(e);
    if (!pool || !pool.length) return;
    this.pendingSquash = true; // 等新点击动画切到前台后 Q 弹（压新首帧，与浏览器一致）
    this.playOnce(S.pick(pool));`);

// D. 睡眠循环：一段睡姿播完接着播
const d = `    if (this.frozen) return;
    const { animations } = { animations: this.animations };`;
if (!s.includes(d)) { console.error('D missing'); process.exit(5); }
s = s.replace(d, `    if (this.frozen) return;
    if (this.petState === 'sleep') {
      this.playOnce('原地小憩沉眠');
      return;
    }
    const { animations } = { animations: this.animations };`);

writeFileSync(f, s, 'utf8');
console.log('state machine patched');
