// ============================================================================
//  ui.js  —  HUD: player cards, powers, chip rail, history, toasts, banners
// ============================================================================
import { CHIPS, POWERS, colourOf, ELIMINATE_EVERY } from './data.js';
import { state, everyone, totalStaked } from './state.js';
import { heatMultiplier } from './game.js';

const $ = (id) => document.getElementById(id);

let onPower = () => {};
let onChip = () => {};
let onBalls = () => {};

export function initUI(handlers) {
  onPower = handlers.onPower; onChip = handlers.onChip; onBalls = handlers.onBalls;
  buildPlayerCards();
  buildPowerList();
  buildChipRail();
  refreshHUD();
}

/* --------------------------- Player cards -------------------------------- */
function buildPlayerCards() {
  const root = $('players');
  root.innerHTML = '';
  for (const p of everyone()) {
    const c = document.createElement('div');
    c.className = 'pcard' + (p.isHuman ? ' you' : '');
    c.id = `pcard-${p.id}`;
    c.style.setProperty('--tint', p.tint);
    c.innerHTML = `
      <div class="av">${p.avatar}</div>
      <div class="info">
        <div class="nm">${p.name}${p.isHuman ? '<span class="badge">YOU</span>' : `<span class="badge">${brainLabel(p.brain)}</span>`}</div>
        <div class="chips" data-chips></div>
        <div class="delta" data-delta></div>
      </div>`;
    root.appendChild(c);
  }
}

function brainLabel(b) {
  return ({ aggressive: 'RECKLESS', conservative: 'STEADY', chaotic: 'WILD', copycat: 'MIMIC' })[b] || 'BOT';
}

export function refreshHUD() {
  $('roundNum').textContent = state.round + 1;
  const toCut = ELIMINATE_EVERY - (state.round % ELIMINATE_EVERY);
  $('nextCut').textContent = toCut;
  $('heatVal').textContent = '×' + heatMultiplier(state.player.heat).toFixed(1);
  $('pcCount').textContent = state.player.powerChips;
  $('stakeVal').textContent = totalStaked(state.player).toLocaleString();

  for (const p of everyone()) {
    const card = $(`pcard-${p.id}`);
    if (!card) continue;
    card.classList.toggle('dead', !p.alive);
    card.querySelector('[data-chips]').textContent = '◆ ' + p.chips.toLocaleString();
    const d = card.querySelector('[data-delta]');
    if (p.heat >= 1 && p.alive) {
      d.innerHTML = `<span class="firestreak">🔥 ${p.heat} streak ·×${heatMultiplier(p.heat).toFixed(2)}</span>`;
    } else { d.textContent = ''; }
  }
  refreshPowerList();
}

// Flash a card after results.
export function pulseCard(p) {
  const card = $(`pcard-${p.id}`);
  if (!card) return;
  const cls = p.lastDelta > 0 ? 'turn-win' : p.lastDelta < 0 ? 'turn-lose' : '';
  if (!cls) return;
  card.classList.remove('turn-win', 'turn-lose');
  void card.offsetWidth;
  card.classList.add(cls);
  const d = card.querySelector('[data-delta]');
  if (d && p.lastDelta !== 0) {
    const up = p.lastDelta > 0;
    d.innerHTML = `<span class="delta ${up ? 'up' : 'down'}">${up ? '+' : ''}${p.lastDelta.toLocaleString()}</span>`;
    setTimeout(() => refreshHUD(), 1800);
  }
}

/* --------------------------- Power list ---------------------------------- */
function buildPowerList() {
  const root = $('powerList');
  root.innerHTML = '';
  for (const [key, def] of Object.entries(POWERS)) {
    const el = document.createElement('div');
    el.className = 'power';
    el.id = `power-${key}`;
    el.innerHTML = `
      <div class="pic">${def.icon}</div>
      <div class="pbody"><div class="pname">${def.name}</div><div class="pdesc">${def.desc}</div></div>
      <div class="pcost">${def.cost}◈</div>`;
    el.addEventListener('click', () => onPower(key));
    root.appendChild(el);
  }
}

function refreshPowerList() {
  for (const [key, def] of Object.entries(POWERS)) {
    const el = $(`power-${key}`);
    if (!el) continue;
    const affordable = state.player.powerChips >= def.cost && state.phase === 'betting';
    el.classList.toggle('disabled', !affordable);
    const primed = state.queuedPower && state.queuedPower.key === key;
    const scouted = key === 'oracle' && state.oracleUsed;
    el.classList.toggle('primed', !!primed || scouted);
  }
}

/* --------------------------- Chip rail ----------------------------------- */
function buildChipRail() {
  const root = $('chiprail');
  root.innerHTML = '';
  for (const c of CHIPS) {
    const el = document.createElement('div');
    el.className = 'chip' + (c.value === state.selectedChip ? ' active' : '');
    el.dataset.value = c.value;
    el.style.background = `radial-gradient(circle at 35% 30%, ${shade(c.colour, 30)}, ${c.colour} 65%)`;
    el.style.borderColor = c.ring;
    el.textContent = c.value >= 1000 ? (c.value / 1000) + 'k' : c.value;
    el.addEventListener('click', () => {
      state.selectedChip = c.value;
      [...root.children].forEach((x) => x.classList.toggle('active', +x.dataset.value === c.value));
      onChip(c.value);
    });
    root.appendChild(el);
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

/* --------------------------- History ------------------------------------- */
export function renderHistory() {
  const root = $('history');
  root.innerHTML = '';
  for (const n of state.history) {
    const el = document.createElement('div');
    el.className = `h ${colourOf(n)}`;
    el.textContent = n;
    root.appendChild(el);
  }
}

/* --------------------------- Result banner ------------------------------- */
export function showResultBanner(results) {
  const b = $('resultBanner');
  b.innerHTML = '';
  results.forEach((n, i) => {
    const el = document.createElement('div');
    el.className = `rb ${colourOf(n)}`;
    el.style.animationDelay = `${i * 0.12}s`;
    el.textContent = n;
    b.appendChild(el);
  });
  b.classList.remove('hidden');
}
export function hideResultBanner() { $('resultBanner').classList.add('hidden'); }

/* --------------------------- Oracle reveal ------------------------------- */
export function showOracle(candidates) {
  const el = $('oracleReveal');
  el.classList.remove('hidden');
  el.innerHTML = `<div class="otitle">👁️ THE POCKET HIDES HERE</div>
    <div class="ocand">${candidates.map((n) => `<div class="onum ${colourOf(n)}">${n}</div>`).join('')}</div>`;
}
export function hideOracle() { $('oracleReveal').classList.add('hidden'); }

/* --------------------------- Toasts -------------------------------------- */
export function toast(msg, type = '', big = false) {
  const root = $('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}${big ? ' big' : ''}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2700);
}

/* --------------------------- Game over ----------------------------------- */
export function showGameOver(outcome) {
  const m = $('gameover');
  $('goTitle').textContent = outcome === 'win' ? 'VICTORY' : 'ELIMINATED';
  $('goText').textContent = outcome === 'win'
    ? 'You are the Last Spin Standing. The table is yours.'
    : 'Your stack hit zero. The sharks feast tonight.';
  const stats = everyone().sort((a, b) => b.chips - a.chips);
  $('goStats').innerHTML = stats.map((p, i) =>
    `<div class="rule"><b>${i + 1}. ${p.avatar} ${p.name}</b><span>${p.alive ? '◆ ' + p.chips.toLocaleString() + ' chips' : 'Eliminated'}</span></div>`
  ).join('');
  m.classList.remove('hidden');
}

export function setSpinEnabled(on) {
  $('spinBtn').disabled = !on;
  $('clearBtn').disabled = !on;
  $('rebetBtn').disabled = !on;
}
