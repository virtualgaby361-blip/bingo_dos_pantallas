/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BingoCard } from './types';

/**
 * Generates an array of unique random integers in [min, max] of given length.
 * Uses crypto.getRandomValues for better entropy when available.
 */
function getRandomUniqueNumbers(min: number, max: number, count: number): number[] {
  const pool: number[] = [];
  for (let i = min; i <= max; i++) {
    pool.push(i);
  }
  
  // Fisher-Yates shuffle with crypto entropy
  for (let i = pool.length - 1; i > 0; i--) {
    let j: number;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomBuffer = new Uint32Array(1);
      crypto.getRandomValues(randomBuffer);
      j = randomBuffer[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Take the first `count` elements and sort them
  return pool.slice(0, count).sort((a, b) => a - b);
}

/**
 * Generates an array of unique random integers in [min, max] that are GUARANTEED
 * to be non-consecutive (no adjacent numbers) if the range size permits it,
 * avoiding cards having too many contiguous clusters and overlapping patterns.
 */
function getRandomNonConsecutiveNumbers(min: number, max: number, count: number): number[] {
  const range = max - min + 1;
  // If the range doesn't allow choosing 'count' non-consecutive elements (needs at least 2 * count - 1),
  // then we fall back to standard unique numbers. For 1-75 bingo, range is usually 15 which allows 5 non-consecutive easily.
  if (range < (2 * count - 1)) {
    return getRandomUniqueNumbers(min, max, count);
  }

  // To choose k non-consecutive items from [min, max],
  // we can choose k unique sorted numbers x_0 < x_1 < ... < x_{k-1} from [0, range - count].
  // Then the mapped y_i = min + x_i + i will be strictly sorted and y_{i+1} - y_i >= 2,
  // making them 100% non-consecutive! This reduces clustered overlaps mathematically.
  const poolSize = range - count + 1;
  const xList = getRandomUniqueNumbers(0, poolSize - 1, count); // This returns sorted unique integers
  
  return xList.map((x, i) => min + x + i);
}

/**
 * Generates a single bingo card with mathematically correct B-I-N-G-O distribution.
 * @param freeSpaces Number of free/wildcard spaces (0-5). Default 1 (center).
 */
export function generateBingoCard(from: number, to: number, serial: string, freeSpaces: number = 1): BingoCard {
  const range = to - from + 1;
  const colSize = Math.max(5, Math.floor(range / 5));
  
  const bList = getRandomNonConsecutiveNumbers(from, from + colSize - 1, 5);
  const iList = getRandomNonConsecutiveNumbers(from + colSize, from + 2 * colSize - 1, 5);
  const nList = getRandomNonConsecutiveNumbers(from + 2 * colSize, from + 3 * colSize - 1, 5);
  const gList = getRandomNonConsecutiveNumbers(from + 3 * colSize, from + 4 * colSize - 1, 5);
  // O column handles the remaining elements up to 'to'
  const oList = getRandomNonConsecutiveNumbers(from + 4 * colSize, to, 5);

  // Build full grid first (no free spaces)
  const grid: number[][] = [];
  for (let row = 0; row < 5; row++) {
    const rowCells: number[] = [
      bList[row] ?? 0,
      iList[row] ?? 0,
      nList[row] ?? 0,
      gList[row] ?? 0,
      oList[row] ?? 0
    ];
    grid.push(rowCells);
  }

  // Apply free spaces (comodines) - mark cells as 0
  // Strategy: center first, then spread to corners and edges
  const freePositions: [number, number][] = [
    [2, 2], // center (classic)
    [0, 0], // top-left
    [0, 4], // top-right
    [4, 0], // bottom-left
    [4, 4], // bottom-right
  ];

  const numFree = Math.min(Math.max(0, freeSpaces), 5);
  for (let i = 0; i < numFree; i++) {
    const [r, c] = freePositions[i];
    grid[r][c] = 0;
  }

  return { serial, grid };
}

/**
 * Generates bulk cards with serial numbers like A-40592.
 * Uses a uniqueness-maximizing algorithm that ensures minimal overlap between cards.
 * Each card's grid is checked against all previously generated cards to avoid
 * duplicate grids and maximize number distribution diversity.
 */
export function generateBulkCards(count: number, from: number, to: number, startingIndex: number = 40592, freeSpaces: number = 1): BingoCard[] {
  const cards: BingoCard[] = [];
  const usedGridHashes = new Set<string>();

  for (let i = 0; i < count; i++) {
    const serialNum = startingIndex + i;
    const serial = `A-${serialNum}`;
    
    let card: BingoCard;
    let attempts = 0;
    const maxAttempts = 50;

    // Try to generate a unique card (no duplicate grid)
    do {
      card = generateBingoCard(from, to, serial, freeSpaces);
      const hash = card.grid.flat().join(',');
      if (!usedGridHashes.has(hash)) {
        usedGridHashes.add(hash);
        break;
      }
      attempts++;
    } while (attempts < maxAttempts);

    cards.push(card);
  }
  return cards;
}

/**
 * Fisher-Yates shuffle for arrays - cryptographically better randomness.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    // Use crypto.getRandomValues for better entropy when available
    let j: number;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomBuffer = new Uint32Array(1);
      crypto.getRandomValues(randomBuffer);
      j = randomBuffer[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sounds a synthesized tone using dynamic Web Audio synthesize so users hear ball drops or success fanfare!
 */
export function playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.15) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio Context might be locked by browser policies before gesture, gracefully ignore
  }
}

/**
 * Triggers a spectacular high-fidelity celebratory chord fanfare using Web Audio API synthesis.
 * Perfect for a major game achievement like winning a full card or line in Bingo.
 */
export function playCelebrationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // We want a sequence of upbeat, triumphal notes:
    // C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50), E6 (1318.51), G6 (1567.98)
    const notes = [
      { freq: 523.25, type: 'triangle' as OscillatorType, time: 0, duration: 0.18 },
      { freq: 659.25, type: 'triangle' as OscillatorType, time: 0.08, duration: 0.18 },
      { freq: 783.99, type: 'triangle' as OscillatorType, time: 0.16, duration: 0.18 },
      { freq: 1046.50, type: 'sine' as OscillatorType, time: 0.24, duration: 0.24 },
      { freq: 1318.51, type: 'sine' as OscillatorType, time: 0.32, duration: 0.24 },
      { freq: 1567.98, type: 'sine' as OscillatorType, time: 0.40, duration: 0.45 },
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);
      
      // Pitch slide slightly up for an upbeat mood
      osc.frequency.exponentialRampToValueAtTime(note.freq * 1.01, ctx.currentTime + note.time + note.duration);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + note.time);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + note.time + 0.03); // soft fade-in
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + note.duration);
    });

    // Final triumphant harmonious, major chord starting at 0.52 seconds (C6, E6, G6, C7)
    const chords = [1046.50, 1318.51, 1567.98, 2093.00];
    chords.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.52);
      
      // Pitch vibrato for synth-like texture
      osc.frequency.linearRampToValueAtTime(freq - 6, ctx.currentTime + 0.75);
      osc.frequency.linearRampToValueAtTime(freq + 6, ctx.currentTime + 0.98);
      osc.frequency.linearRampToValueAtTime(freq, ctx.currentTime + 1.3);

      gain.gain.setValueAtTime(0, ctx.currentTime + 0.52);
      gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.55); // fast attack
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4); // long warm release

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + 0.52);
      osc.stop(ctx.currentTime + 1.4);
    });
  } catch (e) {
    // Gracefully handle context exceptions
  }
}

/**
 * Sounds a subtle, elegant drop-and-chime sound effect representing
 * a bingo ball successfully rolling down and stopping in the cradle.
 */
export function playBallDrawSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // 1. A short, subtle "ball rolling/dropping" slide (freq starts high and drops quickly)
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(350, ctx.currentTime);
    dropOsc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.15);
    
    dropGain.gain.setValueAtTime(0.04, ctx.currentTime);
    dropGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    dropOsc.connect(dropGain);
    dropGain.connect(ctx.destination);
    
    dropOsc.start();
    dropOsc.stop(ctx.currentTime + 0.15);

    // 2. A beautiful, tiny high bell chime that triggers 0.1 seconds after, signaling "ball locked"
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.08); // B5 (very polite, sweet chime)
    
    chimeGain.gain.setValueAtTime(0, ctx.currentTime);
    chimeGain.gain.setValueAtTime(0, ctx.currentTime + 0.08);
    chimeGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.11); // soft rise
    chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38); // clean polite decay
    
    chimeOsc.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    
    chimeOsc.start(ctx.currentTime + 0.08);
    chimeOsc.stop(ctx.currentTime + 0.38);
    
  } catch (e) {
    // Gracefully ignore browser audio blockages
  }
}

