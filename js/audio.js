// ============================================================================
//  audio.js  —  Lightweight synthesised sound, no external assets
// ============================================================================

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
}

// Browsers suspend audio until a user gesture; call this on first click.
export function unlockAudio() {
  ensure();
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}

function tone({ freq = 440, dur = 0.12, type = 'sine', vol = 0.3, slide = 0 }) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), ctx.currentTime + dur);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(master);
  o.start(); o.stop(ctx.currentTime + dur + 0.02);
}

export const sfx = {
  chip()  { tone({ freq: 880, dur: 0.06, type: 'triangle', vol: 0.18, slide: -300 }); },
  click() { tone({ freq: 520, dur: 0.05, type: 'square',   vol: 0.12 }); },
  // Ball rattling around the rim: a quick burst of descending ticks.
  rattle() {
    if (!ctx || muted) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => tone({ freq: 1200 - i * 120, dur: 0.03, type: 'square', vol: 0.08 }), i * 45);
    }
  },
  drop()  { tone({ freq: 240, dur: 0.18, type: 'sine', vol: 0.3, slide: -120 }); },
  win()   {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.25 }), i * 90));
  },
  lose()  { tone({ freq: 180, dur: 0.4, type: 'sawtooth', vol: 0.22, slide: -80 }); },
  power() { tone({ freq: 300, dur: 0.5, type: 'sine', vol: 0.3, slide: 900 }); },
  elim()  { tone({ freq: 140, dur: 0.7, type: 'sawtooth', vol: 0.3, slide: -60 }); },
};
