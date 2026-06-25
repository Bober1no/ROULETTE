// ============================================================================
//  state.js  —  Single source of truth for the live game
// ============================================================================
import { START_CHIPS, BOT_DEFS } from './data.js';

export const state = {
  round: 0,
  phase: 'betting',          // betting | spinning | resolving | over
  ballCount: 1,              // 1..3 balls chosen by the player this round

  // The human player.
  player: {
    id: 'you', name: 'YOU', isHuman: true, avatar: '🎩',
    chips: START_CHIPS, powerChips: 1, alive: true,
    heat: 0,                 // win-streak level → multiplier
    bets: {},                // betKey -> amount staked this round
    lastDelta: 0,
    tint: '#d9b25a',
  },

  bots: BOT_DEFS.map((b) => ({
    ...b, isHuman: false,
    chips: START_CHIPS, powerChips: 0, alive: true,
    heat: 0, bets: {}, lastDelta: 0,
  })),

  // Round outcome.
  results: [],               // winning numbers (one per ball)
  history: [],               // recent winning numbers (first ball) for the board
  queuedPower: null,         // { key, payload } chosen for this round
  forcedFirst: null,         // Oracle Eye locks the first ball to this number
  oracleUsed: false,         // one scout per round

  selectedChip: 25,          // active chip denomination on the rail
};

export function everyone() {
  return [state.player, ...state.bots];
}

export function alivePlayers() {
  return everyone().filter((p) => p.alive);
}

// Total staked across all bet keys for a given participant.
export function totalStaked(p) {
  return Object.values(p.bets).reduce((s, v) => s + v, 0);
}

export function resetBets() {
  for (const p of everyone()) p.bets = {};
  state.queuedPower = null;
  state.forcedFirst = null;
  state.oracleUsed = false;
}
