// ============================================================================
//  data.js  —  Static game data: wheel layout, colours, payouts, bots, powers
// ============================================================================

// European single-zero wheel order (clockwise as it appears on a real wheel)
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const POCKET_COUNT = WHEEL_ORDER.length; // 37

// Red numbers on a European wheel; everything else (bar 0) is black.
export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function colourOf(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

export const COLOURS = {
  green: 0x0fae6b,
  red: 0xd1283b,
  black: 0x14161c,
  felt: 0x0b6b3a,
  gold: 0xd9b25a,
};

// Layout of the numbers on the betting grid (3 rows × 12 columns).
// Row order top→bottom is 3,2,1 in a real layout; we render top row first.
export const GRID_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

// Base payout multipliers (to-one). Net win = stake * payout, plus stake back.
export const PAYOUTS = {
  straight: 35,
  red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1,
  dozen: 2, column: 2,
};

// --- Outside bet definitions (predicate over the winning number) -----------
export const OUTSIDE_BETS = {
  red:    { label: 'RED',    payout: 1, test: (n) => colourOf(n) === 'red' },
  black:  { label: 'BLACK',  payout: 1, test: (n) => colourOf(n) === 'black' },
  odd:    { label: 'ODD',    payout: 1, test: (n) => n !== 0 && n % 2 === 1 },
  even:   { label: 'EVEN',   payout: 1, test: (n) => n !== 0 && n % 2 === 0 },
  low:    { label: '1-18',   payout: 1, test: (n) => n >= 1 && n <= 18 },
  high:   { label: '19-36',  payout: 1, test: (n) => n >= 19 && n <= 36 },
  dozen1: { label: '1st 12', payout: 2, test: (n) => n >= 1 && n <= 12 },
  dozen2: { label: '2nd 12', payout: 2, test: (n) => n >= 13 && n <= 24 },
  dozen3: { label: '3rd 12', payout: 2, test: (n) => n >= 25 && n <= 36 },
  col1:   { label: '2:1',    payout: 2, test: (n) => n !== 0 && n % 3 === 0 },
  col2:   { label: '2:1',    payout: 2, test: (n) => n !== 0 && n % 3 === 2 },
  col3:   { label: '2:1',    payout: 2, test: (n) => n !== 0 && n % 3 === 1 },
};

// Chip denominations available on the rail.
export const CHIPS = [
  { value: 5,    colour: '#c0392b', ring: '#ffffff' },
  { value: 25,   colour: '#27ae60', ring: '#0c3' },
  { value: 100,  colour: '#2c3e50', ring: '#7f8c8d' },
  { value: 500,  colour: '#8e44ad', ring: '#f1c40f' },
  { value: 1000, colour: '#d9b25a', ring: '#fff' },
];

// AI opponent definitions. Each has a "brain" key resolved in bots.js.
export const BOT_DEFS = [
  { id: 'b1', name: 'VIPER',   brain: 'aggressive',   avatar: '🐍', tint: '#e74c3c' },
  { id: 'b2', name: 'ABACUS',  brain: 'conservative', avatar: '🧮', tint: '#3498db' },
  { id: 'b3', name: 'JESTER',  brain: 'chaotic',      avatar: '🃏', tint: '#9b59b6' },
  { id: 'b4', name: 'ECHO',    brain: 'copycat',      avatar: '🛰️', tint: '#1abc9c' },
];

// Power abilities, fuelled by Power Chips (PC).
export const POWERS = {
  gravity: {
    name: 'Gravity Well', cost: 2, icon: '🌀',
    desc: 'Bend the FIRST ball toward your strongest straight-up number.',
  },
  oracle: {
    name: 'Oracle Eye', cost: 1, icon: '👁️',
    desc: 'Reveal 5 candidate pockets — the true result is among them.',
  },
  insure: {
    name: 'Insurance', cost: 2, icon: '🛡️',
    desc: 'Refund 50% of your net loss if the round goes against you.',
  },
  sabotage: {
    name: 'Sabotage', cost: 3, icon: '💣',
    desc: 'A random rival forfeits ALL winnings this round.',
  },
};

export const START_CHIPS = 1000;
export const ELIMINATE_EVERY = 5;     // rounds between eliminations
export const HEAT_STEP = 0.25;        // multiplier gained per win-streak level
export const HEAT_MAX = 3.0;          // cap on heat multiplier
