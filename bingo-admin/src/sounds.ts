/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { playCelebrationSound } from './utils';

// Import audio files - these will be resolved by Vite if they exist
let lineWinAudio: HTMLAudioElement | null = null;
let bingoWinAudio: HTMLAudioElement | null = null;

/**
 * Initialize audio elements for line and bingo win sounds.
 * Falls back to Web Audio synthesis if MP3 files are not available.
 */
export function initSounds() {
  try {
    lineWinAudio = new Audio('/sounds/line-win.mp3');
    lineWinAudio.preload = 'auto';
    lineWinAudio.volume = 0.8;
  } catch (e) {
    lineWinAudio = null;
  }

  try {
    bingoWinAudio = new Audio('/sounds/bingo-win.mp3');
    bingoWinAudio.preload = 'auto';
    bingoWinAudio.volume = 0.9;
  } catch (e) {
    bingoWinAudio = null;
  }
}

/**
 * Play the LINE win sound. Uses MP3 if available, otherwise Web Audio synthesis.
 */
export function playLineWinSound() {
  if (lineWinAudio) {
    lineWinAudio.currentTime = 0;
    lineWinAudio.play().catch(() => {
      // MP3 not available or blocked, use synthesized fallback
      playCelebrationSound();
    });
  } else {
    playCelebrationSound();
  }
}

/**
 * Play the BINGO win sound. Uses MP3 if available, otherwise Web Audio synthesis.
 */
export function playBingoWinSound() {
  if (bingoWinAudio) {
    bingoWinAudio.currentTime = 0;
    bingoWinAudio.play().catch(() => {
      // MP3 not available or blocked, use synthesized fallback
      playCelebrationSound();
    });
  } else {
    playCelebrationSound();
  }
}

// Initialize on load
initSounds();
