// ============================================================================
//  betting.js  —  Builds the felt betting layout and manages player wagers
// ============================================================================
import { GRID_ROWS, OUTSIDE_BETS, colourOf } from './data.js';
import { state, totalStaked } from './state.js';
import { sfx } from './audio.js';

let onChange = () => {};
const cellEls = new Map();   // betKey -> { cell, badge }

function makeCell(label, betKey, classes = '') {
  const cell = document.createElement('div');
  cell.className = `bet-cell ${classes}`;
  cell.dataset.key = betKey;
  cell.innerHTML = `<span class="bet-label">${label}</span>`;
  const badge = document.createElement('div');
  badge.className = 'chip-badge hidden';
  cell.appendChild(badge);
  cellEls.set(betKey, { cell, badge });

  cell.addEventListener('click', (e) => { e.preventDefault(); placeBet(betKey); });
  cell.addEventListener('contextmenu', (e) => { e.preventDefault(); removeBet(betKey); });
  return cell;
}

export function buildBoard(root, onChangeCb) {
  onChange = onChangeCb || (() => {});
  root.innerHTML = '';
  cellEls.clear();

  // --- Zero (spans all three number rows) ------------------------------
  const zero = makeCell('0', 'straight:0', 'zero');
  zero.style.gridRow = '1 / span 3';
  zero.style.gridColumn = '1';
  root.appendChild(zero);

  // --- 1..36 number grid (3 rows × 12 cols) ----------------------------
  GRID_ROWS.forEach((rowNums, r) => {
    rowNums.forEach((n, c) => {
      const cell = makeCell(String(n), `straight:${n}`, `num ${colourOf(n)}`);
      cell.style.gridRow = String(r + 1);
      cell.style.gridColumn = String(c + 2);
      root.appendChild(cell);
    });
  });

  // --- 2:1 column bets (right edge) ------------------------------------
  ['col1', 'col2', 'col3'].forEach((k, i) => {
    const cell = makeCell('2:1', `out:${k}`, 'col');
    cell.style.gridRow = String(i + 1);
    cell.style.gridColumn = '14';
    root.appendChild(cell);
  });

  // --- Dozens row ------------------------------------------------------
  [['dozen1', '1st 12'], ['dozen2', '2nd 12'], ['dozen3', '3rd 12']].forEach(([k, label], i) => {
    const cell = makeCell(label, `out:${k}`, 'dozen');
    cell.style.gridRow = '4';
    cell.style.gridColumn = `${2 + i * 4} / span 4`;
    root.appendChild(cell);
  });

  // --- Even-money row --------------------------------------------------
  const ev = [['low', '1-18'], ['even', 'EVEN'], ['red', 'RED'], ['black', 'BLACK'], ['odd', 'ODD'], ['high', '19-36']];
  ev.forEach(([k, label], i) => {
    const extra = (k === 'red' ? 'redbet' : k === 'black' ? 'blackbet' : '');
    const cell = makeCell(label, `out:${k}`, `evenmoney ${extra}`);
    cell.style.gridRow = '5';
    cell.style.gridColumn = `${2 + i * 2} / span 2`;
    root.appendChild(cell);
  });

  renderAll();
}

export function placeBet(key) {
  if (state.phase !== 'betting') return;
  const amt = state.selectedChip;
  if (totalStaked(state.player) + amt > state.player.chips) {
    flash(key, false);
    return;
  }
  state.player.bets[key] = (state.player.bets[key] || 0) + amt;
  sfx.chip();
  renderCell(key);
  flash(key, true);
  onChange();
}

export function removeBet(key) {
  if (state.phase !== 'betting') return;
  if (!state.player.bets[key]) return;
  delete state.player.bets[key];
  sfx.click();
  renderCell(key);
  onChange();
}

export function clearBets() {
  state.player.bets = {};
  renderAll();
  onChange();
}

function flash(key, ok) {
  const e = cellEls.get(key);
  if (!e) return;
  e.cell.classList.remove('flash-ok', 'flash-bad');
  void e.cell.offsetWidth;
  e.cell.classList.add(ok ? 'flash-ok' : 'flash-bad');
}

function renderCell(key) {
  const e = cellEls.get(key);
  if (!e) return;
  const amt = state.player.bets[key] || 0;
  if (amt > 0) {
    e.badge.textContent = amt >= 1000 ? `${(amt / 1000).toFixed(amt % 1000 ? 1 : 0)}k` : amt;
    e.badge.classList.remove('hidden');
  } else {
    e.badge.classList.add('hidden');
  }
}

export function renderAll() {
  for (const key of cellEls.keys()) renderCell(key);
}

// Highlight winning cells after a spin (numbers + matching outside bets).
export function highlightResults(results) {
  clearHighlights();
  const set = new Set(results);
  for (const n of set) {
    const e = cellEls.get(`straight:${n}`);
    if (e) e.cell.classList.add('winning');
  }
  for (const [k, def] of Object.entries(OUTSIDE_BETS)) {
    if (results.some((n) => def.test(n))) {
      const e = cellEls.get(`out:${k}`);
      if (e) e.cell.classList.add('winning');
    }
  }
}

export function clearHighlights() {
  for (const { cell } of cellEls.values()) cell.classList.remove('winning');
}

// The player's strongest straight-up number — used by the Gravity Well power.
export function strongestStraight() {
  let best = null, bestAmt = 0;
  for (const [k, amt] of Object.entries(state.player.bets)) {
    if (k.startsWith('straight:') && amt > bestAmt) { bestAmt = amt; best = parseInt(k.slice(9), 10); }
  }
  return best;
}
