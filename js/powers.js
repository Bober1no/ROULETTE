// ============================================================================
//  powers.js  —  Power-chip abilities (Gravity / Oracle / Insurance / Sabotage)
// ============================================================================
import { POWERS, POCKET_COUNT } from './data.js';
import { state } from './state.js';
import { strongestStraight } from './betting.js';
import { sfx } from './audio.js';

const fail = (message) => ({ ok: false, message });

export function activatePower(key) {
  if (state.phase !== 'betting') return fail('Powers can only be primed before the spin.');
  const def = POWERS[key];
  if (!def) return fail('Unknown power.');
  if (state.player.powerChips < def.cost) return fail(`Need ${def.cost} Power Chips for ${def.name}.`);

  switch (key) {
    case 'gravity': {
      if (state.queuedPower) return fail('A power is already primed this round.');
      if (state.forcedFirst != null) return fail('The Oracle locked the ball — it cannot be bent now.');
      const target = strongestStraight();
      if (target == null) return fail('Place a straight-up bet for gravity to pull toward.');
      state.queuedPower = { key, payload: target };
      break;
    }
    case 'oracle': {
      if (state.oracleUsed) return fail('The Oracle has already scouted this round.');
      if (state.queuedPower && state.queuedPower.key === 'gravity') {
        return fail('The bent ball is unreadable — gravity is already primed.');
      }
      state.oracleUsed = true;
      const truth = Math.floor(Math.random() * POCKET_COUNT);
      state.forcedFirst = truth;
      const reveal = new Set([truth]);
      while (reveal.size < 5) reveal.add(Math.floor(Math.random() * POCKET_COUNT));
      const candidates = [...reveal].sort(() => Math.random() - 0.5);
      spend(def.cost);
      sfx.power();
      return { ok: true, message: 'Oracle Eye: the true pocket hides among these.', reveal: candidates };
    }
    case 'insure': {
      if (state.queuedPower) return fail('A power is already primed this round.');
      state.queuedPower = { key };
      break;
    }
    case 'sabotage': {
      if (state.queuedPower) return fail('A power is already primed this round.');
      state.queuedPower = { key };
      break;
    }
    default:
      return fail('Unknown power.');
  }

  spend(def.cost);
  sfx.power();
  return { ok: true, message: `${def.name} primed.`, primed: key };
}

function spend(n) { state.player.powerChips -= n; }
