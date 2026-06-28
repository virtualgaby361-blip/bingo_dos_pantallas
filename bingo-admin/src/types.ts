/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AppScreen {
  ControlPanel = 'control-panel',
  CardGenerator = 'card-generator',
  GenerationProgress = 'generation-progress',
  PrintSheet = 'print-sheet',
  Settings = 'settings',
  SecondScreen = 'second-screen'
}

export enum PageSize {
  A4 = 'A4',
  Letter = 'Letter'
}

export interface BingoCard {
  serial: string;
  grid: number[][]; // 5x5 grid, center [2][2] is 0 (FREE SPACE)
}

export interface Prize {
  id: string;
  name: string;
  description: string;
  type: 'full_card' | 'horizontal_line' | 'any_line' | 'palabra_bingo';
  percentage: number;
  isFixed: boolean;
  fixedAmount: number;
}

export interface GeneratorConfig {
  fromRange: number;
  toRange: number;
  selectedColor: string;
  cardCount: number;
  pageSize: PageSize;
  cardsPerPage: 1 | 2 | 3 | 4;
  showCutLines: boolean;
  cardPrice: number;
  prizes?: Prize[];
  spinDuration?: number; // Configurable spin duration in ms
  freeSpaces?: number; // Number of free/wildcard spaces per card (0-5), default 1
  autoDrawInterval?: number; // Auto-draw interval in seconds (0 = disabled), default 0
}

export interface GameStats {
  numbersCalled: number[];
  activePlayers: number;
  jackpot: number;
  totalBalls: number;
}

export interface HistoricalWinner {
  id: string;
  gameId: string;
  date: string;
  cardSerial: string;
  prizeName: string;
  prizeType: string;
  calledCount: number;
  lastNumberCalled: number;
  range: string;
}

// Represents a winner event for the secondary screen
export interface WinnerEvent {
  type: 'line' | 'bingo';
  cardSerial: string;
  card: BingoCard;
  prizeName: string;
  calledCount: number;
  timestamp: string;
}
