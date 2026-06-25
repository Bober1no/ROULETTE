// ============================================================================
//  game.js  —  Round resolution: results, payouts, heat, powers, elimination
// ============================================================================
import {
  OUTSIDE_BETS, POCKET_COUNT, WHEEL_ORDER, HEAT_STEP, HEAT_MAX,
  ELIMINATE_EVERY,
} from './data.js';
import { state, everyone, alivePlayers, totalStaked } from './state.js';

export function heatMultiplier(level) {
  return Math.min(HEAT_MAX, 1 + level * HEAT_STEP);
}

// Resolve a single bet key into { payout, test }.
function resolveBetKey(key) {
  if (key.startsWith('straight:')) {
    const n = parseInt(key.slice(9), 10);
    return { payout: 35, test: (x) => x === n, straight: true };
  }
  const sub = key.slice(4);
  const def = OUTSIDE_BETS[sub];
  return def ? { payout: def.payout, test: def.test, straight: false } : null;
}

// Net chip change for a participant given the ball results (multi-ball spread).
//   net = Σ  stake * ((P+1) * matches / B - 1)
function computeNet(p, results) {
  const B = results.length;
  let net = 0;
  let straightHit = false;
  for (const [key, stake] of Object.entries(p.bets)) {
    const r = resolveBetKey(key);
    if (!r) continue;
    let matches = 0;
    for (const num of results) if (r.test(num)) matches++;
    net += stake * (((r.payout + 1) * matches) / B - 1);
    if (r.straight && matches > 0) straightHit = true;
  }
  return { net, straightHit };
}

// Generate this round's winning numbers, honouring a queued Gravity Well.
function generateResults() {
  const results = [];
  for (let i = 0; i < state.ballCount; i++) results.push(Math.floor(Math.random() * POCKET_COUNT));

  // Oracle Eye pre-locked the first ball.
  if (state.forcedFirst != null) results[0] = state.forcedFirst;

  const power = state.queuedPower;
  if (power && power.key === 'gravity' && power.payload != null) {
    const target = power.payload;
    const roll = Math.random();
    if (roll < 0.6) {
      results[0] = target;                       // direct nudge
    } else if (roll < 0.85) {
      const idx = WHEEL_ORDER.indexOf(target);
      const off = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
      results[0] = WHEEL_ORDER[(idx + off + POCKET_COUNT) % POCKET_COUNT]; // neighbour
    }
  }
  return results;
}

// Run the full resolution for the round. Returns a summary for the UI.
export function resolveRound() {
  const results = generateResults();
  const power = state.queuedPower;

  // 1) Raw nets for everyone.
  const raw = new Map();
  for (const p of alivePlayers()) {
    const { net, straightHit } = computeNet(p, results);
    raw.set(p.id, { net, straightHit });
  }

  // 2) Heat multiplier boosts positive nets.
  for (const p of alivePlayers()) {
    const e = raw.get(p.id);
    if (e.net > 0) e.net *= heatMultiplier(p.heat);
  }

  // 3) Player powers (insurance + sabotage).
  let sabotaged = null;
  if (power) {
    if (power.key === 'insure') {
      const e = raw.get(state.player.id);
      if (e.net < 0) e.net *= 0.5;
    }
    if (power.key === 'sabotage') {
      const rivals = state.bots.filter((b) => b.alive && raw.get(b.id) && raw.get(b.id).net > 0);
      if (rivals.length) {
        sabotaged = rivals[Math.floor(Math.random() * rivals.length)];
        raw.get(sabotaged.id).net = 0;
      }
    }
  }

  // 4) Commit results to chips, update heat & power chips.
  let powerChipsGained = 0;
  for (const p of alivePlayers()) {
    const e = raw.get(p.id);
    const net = Math.round(e.net);
    p.lastDelta = net;
    p.chips = Math.max(0, p.chips + net);

    if (net > 0) p.heat = Math.min(8, p.heat + 1);
    else if (net < 0) p.heat = 0;

    if (p.isHuman) {
      if (e.straightHit) powerChipsGained += 1;
      if (net > 0 && p.heat > 0 && p.heat % 3 === 0) powerChipsGained += 1;
    }
  }
  state.player.powerChips += powerChipsGained;

  // 5) Bust anyone who hit zero.
  for (const p of alivePlayers()) {
    if (p.chips <= 0) p.alive = false;
  }

  state.results = results;
  state.history.unshift(results[0]);
  if (state.history.length > 16) state.history.pop();

  // 6) Periodic battle-royale elimination (lowest stack out).
  let eliminated = null;
  state.round += 1;
  if (state.round % ELIMINATE_EVERY === 0) {
    const survivors = alivePlayers();
    if (survivors.length > 1) {
      eliminated = survivors.reduce((lo, p) => (p.chips < lo.chips ? p : lo), survivors[0]);
      eliminated.alive = false;
    }
  }

  // 7) Win / lose state.
  const alive = alivePlayers();
  let outcome = null;
  if (!state.player.alive) outcome = 'lose';
  else if (alive.length === 1 && alive[0].isHuman) outcome = 'win';

  if (outcome) state.phase = 'over';

  return {
    results,
    powerChipsGained,
    sabotaged,
    eliminated,
    outcome,
    playerNet: state.player.lastDelta,
  };
}
