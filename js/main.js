// ============================================================================
//  main.js  —  Boots the scene, owns the render loop and the round lifecycle
// ============================================================================
import { createScene } from './three-scene.js';
import { buildWheel } from './wheel.js';
import { state, resetBets, totalStaked } from './state.js';
import { resolveRound } from './game.js';
import { botsPlaceBets } from './bots.js';
import {
  buildBoard, clearBets, renderAll, highlightResults, clearHighlights,
} from './betting.js';
import { activatePower } from './powers.js';
import {
  initUI, refreshHUD, renderHistory, pulseCard, toast, setSpinEnabled,
  showResultBanner, hideResultBanner, showOracle, hideOracle, showGameOver,
} from './ui.js';
import { unlockAudio, setMuted, sfx } from './audio.js';

const canvas = document.getElementById('scene');
const ctx = createScene(canvas);
const wheel = buildWheel(ctx.scene);

let lastPlayerBets = {};
let muted = false;

/* ----------------------------- Render loop ------------------------------- */
let prev = performance.now();
function loop(now) {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  wheel.update(dt);
  ctx.controls.update();
  ctx.composer.render();
  requestAnimationFrame(loop);
}

function resize() {
  ctx.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(loop);
document.getElementById('loading').classList.add('hidden');

/* ----------------------------- Start game -------------------------------- */
function showGameUI() {
  ['topbar', 'players', 'powers', 'history', 'dock'].forEach((id) =>
    document.getElementById(id).classList.remove('hidden'));
}

document.getElementById('startBtn').addEventListener('click', () => {
  unlockAudio();
  document.getElementById('intro').classList.add('hidden');
  showGameUI();
  buildBoard(document.getElementById('board'), () => refreshHUD());
  initUI({ onPower: handlePower, onChip: () => {}, onBalls: () => {} });
  renderHistory();
  ctx.controls.autoRotate = true;
  sfx.power();
});

/* ----------------------------- Controls ---------------------------------- */
document.getElementById('spinBtn').addEventListener('click', startSpin);
document.getElementById('clearBtn').addEventListener('click', () => { clearBets(); refreshHUD(); });
document.getElementById('rebetBtn').addEventListener('click', () => {
  if (state.phase !== 'betting') return;
  let restored = 0;
  for (const [k, v] of Object.entries(lastPlayerBets)) {
    if (totalStaked(state.player) + v <= state.player.chips) {
      state.player.bets[k] = (state.player.bets[k] || 0) + v; restored += v;
    }
  }
  if (restored) sfx.chip();
  renderAll(); refreshHUD();
});

document.querySelectorAll('.ballbtn').forEach((b) => {
  b.addEventListener('click', () => {
    if (state.phase !== 'betting') return;
    state.ballCount = +b.dataset.balls;
    document.querySelectorAll('.ballbtn').forEach((x) => x.classList.toggle('active', x === b));
    sfx.click();
  });
});

document.getElementById('muteBtn').addEventListener('click', (e) => {
  muted = !muted; setMuted(muted);
  e.target.textContent = muted ? '🔇' : '🔊';
});

document.getElementById('againBtn').addEventListener('click', () => location.reload());

/* ----------------------------- Powers ------------------------------------ */
function handlePower(key) {
  const r = activatePower(key);
  if (!r.ok) { toast(r.message, 'bad'); return; }
  toast(r.message, 'power');
  if (r.reveal) showOracle(r.reveal);
  refreshHUD();
}

/* ----------------------------- Round flow -------------------------------- */
async function startSpin() {
  if (state.phase !== 'betting') return;
  if (totalStaked(state.player) <= 0) { toast('Place a bet before spinning.', 'bad'); return; }

  lastPlayerBets = { ...state.player.bets };
  state.phase = 'spinning';
  setSpinEnabled(false);
  ctx.controls.autoRotate = false;
  clearHighlights();
  hideResultBanner();
  hideOracle();

  // Opponents lock in, then the round is resolved into a definite outcome.
  botsPlaceBets();
  const summary = resolveRound();

  // Animate the wheel toward the decided result.
  await wheel.spin(summary.results, { onRattle: sfx.rattle, onDrop: sfx.drop });

  // Reveal.
  reveal(summary);
}

function reveal(summary) {
  highlightResults(summary.results);
  showResultBanner(summary.results);
  renderHistory();

  const net = summary.playerNet;
  if (net > 0) { sfx.win(); toast(`+${net.toLocaleString()} chips!`, 'good', true); }
  else if (net < 0) { sfx.lose(); toast(`${net.toLocaleString()} chips`, 'bad'); }
  else { sfx.click(); }

  for (const p of [state.player, ...state.bots]) pulseCard(p);

  if (summary.powerChipsGained > 0)
    setTimeout(() => toast(`+${summary.powerChipsGained} Power Chip${summary.powerChipsGained > 1 ? 's' : ''} ◈`, 'power'), 500);
  if (summary.sabotaged)
    setTimeout(() => toast(`💣 ${summary.sabotaged.name} sabotaged — winnings forfeit!`, 'power'), 700);
  if (summary.eliminated)
    setTimeout(() => { sfx.elim(); toast(`💀 ${summary.eliminated.name} ELIMINATED`, 'bad', true); }, 1000);

  setTimeout(() => refreshHUD(), 200);

  if (summary.outcome) {
    setTimeout(() => { sfx[summary.outcome === 'win' ? 'win' : 'elim'](); showGameOver(summary.outcome); }, 1600);
    return;
  }

  // Next betting round after a beat.
  setTimeout(nextRound, 2600);
}

function nextRound() {
  state.phase = 'betting';
  resetBets();
  renderAll();
  clearHighlights();
  hideResultBanner();
  hideOracle();
  setSpinEnabled(true);
  ctx.controls.autoRotate = true;
  refreshHUD();
}
