// ============================================================================
//  bots.js  —  AI opponents. Each "brain" bets with a distinct personality.
// ============================================================================
import { OUTSIDE_BETS } from './data.js';
import { state } from './state.js';

const OUTSIDE_KEYS = Object.keys(OUTSIDE_BETS);
const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round5 = (x) => Math.max(5, Math.round(x / 5) * 5);

function add(bot, key, amt) {
  if (amt <= 0) return;
  bot.bets[key] = (bot.bets[key] || 0) + amt;
}

// Total a bot is willing to risk this round, scaled by personality & chips.
function budget(bot, frac) {
  return round5(Math.min(bot.chips, bot.chips * frac));
}

const BRAINS = {
  // VIPER — high variance, loves straight-up numbers and bold colour calls.
  aggressive(bot) {
    let pool = budget(bot, 0.22 + Math.random() * 0.12);
    const picks = rint(2, 4);
    for (let i = 0; i < picks && pool > 0; i++) {
      const n = rint(0, 36);
      const amt = round5(pool / (picks - i) * (0.6 + Math.random() * 0.6));
      add(bot, `straight:${n}`, Math.min(amt, pool));
      pool -= amt;
    }
    if (pool > 0 && Math.random() < 0.6) add(bot, `out:${pick(['red', 'black'])}`, round5(pool));
  },

  // ABACUS — risk-averse, spreads small money across even-money bets.
  conservative(bot) {
    let pool = budget(bot, 0.06 + Math.random() * 0.05);
    const spread = pick([['red', 'low'], ['black', 'high'], ['even', 'low'], ['odd', 'high']]);
    for (const k of spread) add(bot, `out:${k}`, round5(pool / 2));
    if (Math.random() < 0.3) add(bot, `out:${pick(['dozen1', 'dozen2', 'dozen3'])}`, round5(pool * 0.4));
  },

  // JESTER — pure chaos. Anything goes, sometimes all-in.
  chaotic(bot) {
    const wild = Math.random() < 0.12;
    let pool = wild ? budget(bot, 0.85) : budget(bot, 0.05 + Math.random() * 0.3);
    const moves = rint(1, 5);
    for (let i = 0; i < moves && pool > 0; i++) {
      const amt = round5(pool / (moves - i) * Math.random());
      if (Math.random() < 0.5) add(bot, `straight:${rint(0, 36)}`, amt);
      else add(bot, `out:${pick(OUTSIDE_KEYS)}`, amt);
      pool -= amt;
    }
  },

  // ECHO — copies the human's current bets (or last round's), with drift.
  copycat(bot) {
    const human = state.player;
    const source = Object.keys(human.bets).length ? human.bets : (bot._memory || {});
    const keys = Object.keys(source);
    if (!keys.length) { BRAINS.conservative(bot); return; }
    const scale = (0.4 + Math.random() * 0.5);
    for (const k of keys) {
      const amt = round5(source[k] * scale);
      if (amt <= bot.chips) add(bot, k, amt);
    }
    // Occasionally add a contrarian flourish.
    if (Math.random() < 0.4) add(bot, `out:${pick(OUTSIDE_KEYS)}`, budget(bot, 0.04));
  },
};

// Have every living bot lock in its wagers for the round.
export function botsPlaceBets() {
  for (const bot of state.bots) {
    if (!bot.alive) continue;
    bot.bets = {};
    (BRAINS[bot.brain] || BRAINS.conservative)(bot);
    // Never let a bot over-commit beyond its stack.
    let total = Object.values(bot.bets).reduce((s, v) => s + v, 0);
    if (total > bot.chips) {
      const f = bot.chips / total;
      for (const k of Object.keys(bot.bets)) bot.bets[k] = Math.floor(bot.bets[k] * f);
    }
    bot._memory = { ...state.player.bets };
  }
}
