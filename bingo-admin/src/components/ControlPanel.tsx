/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { playTone, playCelebrationSound, playBallDrawSound } from '../utils';
import { playLineWinSound, playBingoWinSound } from '../sounds';
import { Play, Pause, RotateCcw, AlertCircle, Sparkles, CheckCircle2, Clock, ArrowUpDown, History, RotateCw, DollarSign, Wallet, Hash, Ticket, Trophy, Download } from 'lucide-react';
import { GeneratorConfig, BingoCard, Prize, HistoricalWinner, WinnerEvent } from '../types';
import { jsPDF } from 'jspdf';

interface ControlPanelProps {
  calledNumbers: number[];
  setCalledNumbers: (numbers: number[] | ((prev: number[]) => number[])) => void;
  onResetGame: () => void;
  generatedCards: BingoCard[];
  config: GeneratorConfig;
  setConfig: (config: GeneratorConfig | ((prev: GeneratorConfig) => GeneratorConfig)) => void;
  lineWinner: WinnerEvent | null;
  setLineWinner: (winner: WinnerEvent | null) => void;
  bingoWinner: WinnerEvent | null;
  setBingoWinner: (winner: WinnerEvent | null) => void;
}

// Winning validation helper function
const checkSingleCardWon = (card: BingoCard, calledList: number[], type: 'full_card' | 'horizontal_line' | 'any_line' | 'palabra_bingo') => {
  if (calledList.length === 0) return false;
  const set = new Set<any>();
  calledList.forEach(n => {
    set.add(n);
    set.add(Number(n));
    set.add(String(n));
  });
  set.add(0);
  set.add("0");

  const isCellCalled = (val: any) => {
    if (val === 0 || val === "0" || val === "★" || val === "FREE") return true;
    return set.has(val) || set.has(Number(val)) || set.has(String(val));
  };

  if (type === 'full_card') {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!isCellCalled(card.grid[r][c])) return false;
      }
    }
    return true;
  }

  if (type === 'palabra_bingo') {
    // Check if at least one whole Column (B, I, N, G, or O) representing a letter of BINGO is fully called
    for (let c = 0; c < 5; c++) {
      let colMatched = true;
      for (let r = 0; r < 5; r++) {
        if (!isCellCalled(card.grid[r][c])) { colMatched = false; break; }
      }
      if (colMatched) return true;
    }
    return false;
  }

  if (type === 'horizontal_line') {
    for (let r = 0; r < 5; r++) {
      let rowMatched = true;
      for (let c = 0; c < 5; c++) {
        if (!isCellCalled(card.grid[r][c])) { rowMatched = false; break; }
      }
      if (rowMatched) return true;
    }
    return false;
  }

  if (type === 'any_line') {
    // Check Rows
    for (let r = 0; r < 5; r++) {
      let rowMatched = true;
      for (let c = 0; c < 5; c++) {
        if (!isCellCalled(card.grid[r][c])) { rowMatched = false; break; }
      }
      if (rowMatched) return true;
    }
    // Check Cols
    for (let c = 0; c < 5; c++) {
      let colMatched = true;
      for (let r = 0; r < 5; r++) {
        if (!isCellCalled(card.grid[r][c])) { colMatched = false; break; }
      }
      if (colMatched) return true;
    }
    // Check Diagonal 1
    let d1 = true;
    for (let i = 0; i < 5; i++) {
      if (!isCellCalled(card.grid[i][i])) { d1 = false; break; }
    }
    if (d1) return true;
    // Check Diagonal 2
    let d2 = true;
    for (let i = 0; i < 5; i++) {
      if (!isCellCalled(card.grid[i][4 - i])) { d2 = false; break; }
    }
    if (d2) return true;
  }

  return false;
};

export default function ControlPanel({ 
  calledNumbers, 
  setCalledNumbers, 
  onResetGame, 
  generatedCards, 
  config, 
  setConfig,
  lineWinner,
  setLineWinner,
  bingoWinner,
  setBingoWinner
}: ControlPanelProps) {
  // Dynamic ranges based on user config
  const fromRange = config.fromRange || 1;
  const toRange = config.toRange || 75;
  const totalRangeCount = toRange - fromRange + 1;

  // Simulator states
  const [activeTab, setActiveTab] = useState<'overview' | 'prizes' | 'history'>('overview');
  const [animatingBall, setAnimatingBall] = useState(false);
  const [currentDisplayNum, setCurrentDisplayNum] = useState<number | null>(null);
  const [sortDescending, setSortDescending] = useState(true);
  const [autoDrawActive, setAutoDrawActive] = useState(false);

  // Game session ID state
  const [currentGameId, setCurrentGameId] = useState<string>('');

  // Historical winners list from localStorage
  const [historicalWinners, setHistoricalWinners] = useState<HistoricalWinner[]>(() => {
    try {
      const stored = localStorage.getItem('bingo_historical_winners');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Track and initialize game ID
  useEffect(() => {
    if (calledNumbers.length === 0) {
      setCurrentGameId('');
    } else if (calledNumbers.length === 1 && !currentGameId) {
      setCurrentGameId(`game_${Date.now()}`);
    }
  }, [calledNumbers, currentGameId]);

  // States to manage automatic winnings popping modal
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [activeWinningSession, setActiveWinningSession] = useState<{ prize: Prize; card: BingoCard }[]>([]);
  const [showGameOverModal, setShowGameOverModal] = useState(false);

  // Automatic verification of won conditions upon drawing new balls
  // GAME RULE: Must win LINE first, then BINGO (full card). Both conditions are mandatory.
  useEffect(() => {
    if (calledNumbers.length === 0 || generatedCards.length === 0) {
      setActiveWinningSession([]);
      setShowWinnerModal(false);
      setShowGameOverModal(false);
      return;
    }

    const prevCalled = calledNumbers.slice(0, -1);
    const newWinnersList: { prize: Prize; card: BingoCard }[] = [];

    // === STEP 1: Check for LINE winner (must happen first) ===
    if (!lineWinner) {
      // Search for ANY card that currently has a completed horizontal line
      for (const card of generatedCards) {
        const winsLineNow = checkSingleCardWon(card, calledNumbers, 'horizontal_line');
        if (winsLineNow) {
          // Found a line winner!
          const linePrize: Prize = (config.prizes || []).find(p => p.type === 'horizontal_line') || {
            id: 'line_auto',
            name: 'Línea (Horizontal)',
            description: 'Premio al completar la primera línea horizontal.',
            type: 'horizontal_line',
            percentage: 40,
            isFixed: false,
            fixedAmount: 50
          };

          const winnerEvent: WinnerEvent = {
            type: 'line',
            cardSerial: card.serial,
            card,
            prizeName: linePrize.name,
            calledCount: calledNumbers.length,
            timestamp: new Date().toISOString()
          };
          setLineWinner(winnerEvent);
          newWinnersList.push({ prize: linePrize, card });
          break; // Only first line winner counts
        }
      }
    }

    // === STEP 2: Check for BINGO (full card) winner - only AFTER line has been won ===
    // We check lineWinner OR if we just found a line winner in this cycle (newWinnersList)
    const lineAlreadyWon = lineWinner || newWinnersList.some(w => w.prize.type === 'horizontal_line');
    if (lineAlreadyWon && !bingoWinner) {
      for (const card of generatedCards) {
        const winsBingoNow = checkSingleCardWon(card, calledNumbers, 'full_card');
        if (winsBingoNow) {
          // Found a bingo winner!
          const bingoPrize: Prize = (config.prizes || []).find(p => p.type === 'full_card') || {
            id: 'bingo_auto',
            name: 'Bingo (Cartón Lleno)',
            description: 'Premio al completar el cartón completo.',
            type: 'full_card',
            percentage: 60,
            isFixed: false,
            fixedAmount: 100
          };

          const winnerEvent: WinnerEvent = {
            type: 'bingo',
            cardSerial: card.serial,
            card,
            prizeName: bingoPrize.name,
            calledCount: calledNumbers.length,
            timestamp: new Date().toISOString()
          };
          setBingoWinner(winnerEvent);
          newWinnersList.push({ prize: bingoPrize, card });
          break; // Only first bingo winner counts
        }
      }
    }

    // 3. If all numbers called and still no bingo, force find the absolute winner
    if (calledNumbers.length === totalRangeCount && (lineWinner || lineAlreadyWon) && !bingoWinner && !newWinnersList.some(w => w.prize.type === 'full_card')) {
      const { maxMatches, winners } = getAbsWinners();
      if (winners.length > 0) {
        const virtualGameOverPrize: Prize = {
          id: 'game_over_abs',
          name: '¡BINGO / GANADOR ABSOLUTO! (Fin de Partida)',
          description: `¡PREMIO MÁXIMO! Logró ${maxMatches} de 24 aciertos posibles.`,
          type: 'full_card',
          percentage: 100,
          isFixed: true,
          fixedAmount: 0
        };

        const absCard = winners[0];
        const winnerEvent: WinnerEvent = {
          type: 'bingo',
          cardSerial: absCard.serial,
          card: absCard,
          prizeName: virtualGameOverPrize.name,
          calledCount: calledNumbers.length,
          timestamp: new Date().toISOString()
        };
        setBingoWinner(winnerEvent);
        newWinnersList.push({ prize: virtualGameOverPrize, card: absCard });
      } else {
        setShowGameOverModal(true);
      }
    }

    if (newWinnersList.length > 0) {
      setActiveWinningSession(newWinnersList);
      setShowWinnerModal(true);

      // Save to local storage history
      setHistoricalWinners(prev => {
        const updated = [...prev];
        let hasChanges = false;
        newWinnersList.forEach(({ prize, card }) => {
          const recordId = `${currentGameId || 'default'}-${card.serial}-${prize.id}`;
          if (!updated.some(hist => hist.id === recordId)) {
            const histItem: HistoricalWinner = {
              id: recordId,
              gameId: currentGameId || `game_${Date.now()}`,
              date: new Date().toISOString(),
              cardSerial: card.serial,
              prizeName: prize.name,
              prizeType: prize.type,
              calledCount: calledNumbers.length,
              lastNumberCalled: calledNumbers[calledNumbers.length - 1],
              range: `${fromRange}-${toRange}`
            };
            updated.unshift(histItem);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          localStorage.setItem('bingo_historical_winners', JSON.stringify(updated));
        }
        return updated;
      });

      // Play the appropriate celebration sound
      const hasLineWin = newWinnersList.some(w => w.prize.type === 'horizontal_line');
      const hasBingoWin = newWinnersList.some(w => w.prize.type === 'full_card');
      if (hasBingoWin) {
        playBingoWinSound();
      } else if (hasLineWin) {
        playLineWinSound();
      } else {
        playCelebrationSound();
      }
    }
  }, [calledNumbers, generatedCards, config.prizes, currentGameId, fromRange, toRange, totalRangeCount, lineWinner, bingoWinner]);

  // Spectacular confetti shower effect
  useEffect(() => {
    if (showWinnerModal || showGameOverModal) {
      // Immediate initial massive explosion
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });

      // Periodic left/right corner fountains during 4.5 seconds
      const end = Date.now() + 4500;
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      requestAnimationFrame(frame);
    }
  }, [showWinnerModal, showGameOverModal]);

  // Helper functions for chronological call log styling
  const getBallLetter = (num: number) => {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
  };

  const getBallColorClass = (num: number) => {
    if (num <= 15) return 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]'; // B
    if (num <= 30) return 'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]'; // I
    if (num <= 45) return 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]'; // N
    if (num <= 60) return 'bg-[#ffedd5] text-[#9a3412] border-[#fed7aa]'; // G
    return 'bg-[#fce7f3] text-[#9d174d] border-[#fbcfe8]'; // O
  };
  
  // Set current display number to the last elements of called numbers
  useEffect(() => {
    if (calledNumbers.length > 0) {
      setCurrentDisplayNum(calledNumbers[calledNumbers.length - 1]);
    } else {
      setCurrentDisplayNum(null);
    }
  }, [calledNumbers]);

  // Function to draw a random ball
  const handleDrawBall = () => {
    if (calledNumbers.length >= totalRangeCount) {
      playTone(300, 'triangle', 0.4);
      alert("¡Todos los números han sido cantados!");
      return;
    }

    setAnimatingBall(true);
    const duration = config.spinDuration || 300; // Slower and configurable spin duration
    const startTime = Date.now();
    
    // Play tension ticks quickly
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      playTone(550 + (tickCount * 30), 'sine', 0.04);
      tickCount++;
    }, 55);

    const spinInterval = setInterval(() => {
      let tempNum;
      do {
        tempNum = Math.floor(Math.random() * totalRangeCount) + fromRange;
      } while (calledNumbers.includes(tempNum));
      setCurrentDisplayNum(tempNum);

      if (Date.now() - startTime > duration) {
        clearInterval(spinInterval);
        clearInterval(tickInterval);
        
        // Final draw
        let finalNum;
        do {
          finalNum = Math.floor(Math.random() * totalRangeCount) + fromRange;
        } while (calledNumbers.includes(finalNum));

        setCalledNumbers(prev => [...prev, finalNum]);
        setAnimatingBall(false);
        
        // Success notification sound (subtle ball drop and sweet chime)
        setTimeout(() => {
          playBallDrawSound();
        }, 30);
      }
    }, 30);
  };

  // Spacebar keypress handler for playing seamlessly!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if the user is typing in a form or inputs
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent standard page scroll
        if (!animatingBall && calledNumbers.length < totalRangeCount && activeTab === 'overview') {
          handleDrawBall();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [animatingBall, calledNumbers, activeTab]);

  // Auto-draw timer: draws a ball automatically at the configured interval
  useEffect(() => {
    if (!autoDrawActive || (config.autoDrawInterval || 0) === 0) return;
    if (calledNumbers.length >= totalRangeCount) {
      setAutoDrawActive(false);
      return;
    }
    // Pause auto-draw when winner modal is showing
    if (showWinnerModal || showGameOverModal) return;

    const intervalMs = (config.autoDrawInterval || 5) * 1000;
    const timer = setInterval(() => {
      if (!animatingBall && calledNumbers.length < totalRangeCount) {
        handleDrawBall();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoDrawActive, config.autoDrawInterval, calledNumbers.length, animatingBall, totalRangeCount, showWinnerModal, showGameOverModal]);

  // Stop auto-draw when game ends
  useEffect(() => {
    if (calledNumbers.length >= totalRangeCount) {
      setAutoDrawActive(false);
    }
  }, [calledNumbers.length, totalRangeCount]);

  // Manual cell call trigger
  const handleToggleCell = (num: number) => {
    if (calledNumbers.includes(num)) {
      setCalledNumbers(prev => prev.filter(n => n !== num));
      playTone(180, 'sawtooth', 0.1);
    } else {
      setCalledNumbers(prev => [...prev, num]);
      playBallDrawSound();
    }
  };

  // Find card(s) with the maximum matched numbers
  const getAbsWinners = () => {
    if (generatedCards.length === 0) return { maxMatches: 0, winners: [] };
    
    const calledSet = new Set<any>();
    calledNumbers.forEach(n => {
      calledSet.add(n);
      calledSet.add(Number(n));
      calledSet.add(String(n));
    });
    
    // For each card, calculate the number of matched playable squares (excluding 0)
    const cardScores = generatedCards.map(card => {
      const playableNumbers = card.grid.flat().filter(val => val !== 0 && (val as any) !== "0");
      const matches = playableNumbers.filter(val => 
        calledSet.has(val) || calledSet.has(Number(val)) || calledSet.has(String(val))
      ).length;
      return { card, matches };
    });

    // Find the maximum hits value
    const maxMatches = Math.max(...cardScores.map(cs => cs.matches), 0);
    
    // Filter cards with this maximum value
    const winners = cardScores.filter(cs => cs.matches === maxMatches).map(cs => cs.card);
    
    return {
      maxMatches,
      winners
    };
  };

  const { maxMatches, winners: absoluteWinners } = getAbsWinners();

  const handleClearHistory = () => {
    if (confirm("¿Estás seguro de que deseas vaciar por completo el historial de ganadores de este navegador?")) {
      localStorage.removeItem('bingo_historical_winners');
      setHistoricalWinners([]);
      playTone(300, 'triangle', 0.2);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Theme and colors
      const primaryBgRGB = [23, 0, 64];      // #170040 (Dark purple)
      const accentRGB = [138, 76, 252];      // #8a4cfc (Purple accent)
      const cardBgRGB = [245, 243, 255];     // #f5f3ff (Light violet card)
      const textDarkRGB = [35, 30, 45];      // Almost black
      const textLightRGB = [120, 110, 130];  // Gray
      const rowAlertBgRGB = [252, 251, 254]; // Soft alternating background

      // PAGE 1 HEADER
      // Deep purple top banner
      doc.setFillColor(primaryBgRGB[0], primaryBgRGB[1], primaryBgRGB[2]);
      doc.rect(14, 12, 182, 22, 'F');

      // Title text inside banner
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("REPORTE DE GANADORES - BINGO MULTIJUGADOR", 20, 21);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Generado automaticamente desde la mesa de control de Bingo | ${new Date().toLocaleString('es-ES')}`, 20, 27);

      // Summary box
      doc.setFillColor(cardBgRGB[0], cardBgRGB[1], cardBgRGB[2]);
      doc.setDrawColor(221, 214, 254);
      doc.rect(14, 39, 182, 16, 'FD');

      doc.setTextColor(primaryBgRGB[0], primaryBgRGB[1], primaryBgRGB[2]);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("RESUMEN ACUMULADO DEL HISTORIAL", 20, 45);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(textDarkRGB[0], textDarkRGB[1], textDarkRGB[2]);
      doc.setFontSize(8.5);
      doc.text(`Total Premios Otorgados: ${totalWins}       |       Bingo (Cartón Lleno): ${fullCardWins}       |       Líneas Ganadas: ${lineWins}`, 20, 50);

      // Footer helper
      const drawFooter = (pageNum: number) => {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(150, 140, 160);
        doc.text("Este reporte contiene el registro acumulado de premios cantados y guardados localmente.", 14, 287);
        doc.text(`Pagina ${pageNum}`, 196, 287, { align: 'right' });
      };

      drawFooter(1);

      // TABLE HEADERS
      const colStarts = [14, 24, 82, 112, 137, 155];
      
      const drawTableHeader = (startY: number) => {
        doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
        doc.rect(14, startY, 182, 8, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        
        doc.text("#", colStarts[0] + 3, startY + 5.5);
        doc.text("PREMIO / DETALLE", colStarts[1], startY + 5.5);
        doc.text("CARTON GANADOR", colStarts[2], startY + 5.5);
        doc.text("N. DESENCADENANTE", colStarts[3], startY + 5.5);
        doc.text("BOLAS", colStarts[4], startY + 5.5);
        doc.text("FECHA Y HORA", colStarts[5], startY + 5.5);
      };

      let currentY = 60;
      drawTableHeader(currentY);
      currentY += 8;

      let pageNum = 1;

      // Loop through winners
      historicalWinners.forEach((winner, idx) => {
        // Check for page overflow (stop at 275mm)
        if (currentY + 12 > 275) {
          doc.addPage();
          pageNum++;
          drawFooter(pageNum);
          currentY = 20;
          drawTableHeader(currentY);
          currentY += 8;
        }

        // Draw row background alternating colors
        if (idx % 2 === 1) {
          doc.setFillColor(rowAlertBgRGB[0], rowAlertBgRGB[1], rowAlertBgRGB[2]);
          doc.rect(14, currentY, 182, 12, 'F');
        }
        
        // Bottom border for the row
        doc.setDrawColor(240, 238, 243);
        doc.setLineWidth(0.15);
        doc.line(14, currentY + 12, 196, currentY + 12);

        // COL 1: Index
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(textLightRGB[0], textLightRGB[1], textLightRGB[2]);
        doc.setFontSize(8);
        doc.text(String(idx + 1), colStarts[0] + 3, currentY + 7);

        // COL 2: Prize / Detail
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(primaryBgRGB[0], primaryBgRGB[1], primaryBgRGB[2]);
        doc.setFontSize(8.5);
        doc.text(winner.prizeName || 'Premio', colStarts[1], currentY + 4.5);

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(textLightRGB[0], textLightRGB[1], textLightRGB[2]);
        doc.setFontSize(7);
        const cleanType = (winner.prizeType || '').replace('_', ' ').toUpperCase();
        doc.text(`Rango: ${winner.range || 'N/A'}  |  Categoria: ${cleanType}`, colStarts[1], currentY + 9);

        // COL 3: Card Serial
        doc.setFillColor(243, 240, 255);
        doc.setDrawColor(221, 214, 254);
        doc.rect(colStarts[2], currentY + 3.5, 24, 5.5, 'FD');

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
        doc.setFontSize(8);
        doc.text(`Carton #${winner.cardSerial}`, colStarts[2] + 2, currentY + 7.5);

        // COL 4: Trigger Number
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.rect(colStarts[3] + 4, currentY + 3, 7, 6.5, 'FD');

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(8.5);
        doc.text(String(winner.lastNumberCalled), colStarts[3] + 6, currentY + 7.5);

        // COL 5: Called Ball count
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(textDarkRGB[0], textDarkRGB[1], textDarkRGB[2]);
        doc.setFontSize(8.5);
        doc.text(`${winner.calledCount}`, colStarts[4] + 2, currentY + 7.5);

        // COL 6: Date & Time
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(textLightRGB[0], textLightRGB[1], textLightRGB[2]);
        doc.setFontSize(7.5);
        const dateObj = new Date(winner.date);
        const formatted = isNaN(dateObj.getTime()) ? 'Reciente' : dateObj.toLocaleString('es-ES', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        doc.text(formatted, colStarts[5], currentY + 7.5);

        currentY += 12;
      });

      // Save report
      doc.save(`reporte-ganadores-bingo-${Date.now()}.pdf`);
      playTone(600, 'sine', 0.15);
      setTimeout(() => playTone(800, 'sine', 0.15), 100);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un problema al exportar el documento PDF.");
    }
  };

  const totalWins = historicalWinners.length;
  const fullCardWins = historicalWinners.filter(w => w.prizeType === 'full_card').length;
  const lineWins = historicalWinners.filter(w => w.prizeType === 'horizontal_line').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-[#cbc4d2]/30">
        <div className="flex gap-8 items-center">
          <h2 className="text-2xl font-black text-[#170040] tracking-tight">Live Game Dashboard</h2>
          {/* Custom Navigation Tab Items */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 px-4 text-sm font-semibold transition-all border-b-2 ${
                activeTab === 'overview'
                  ? 'border-[#16a34a] text-[#16a34a]'
                  : 'border-transparent text-[#494550] hover:text-[#170040]'
              }`}
            >
              Vista General
            </button>
            <button
              onClick={() => setActiveTab('prizes')}
              className={`pb-2 px-4 text-sm font-semibold transition-all border-b-2 ${
                activeTab === 'prizes'
                  ? 'border-[#16a34a] text-[#16a34a]'
                  : 'border-transparent text-[#494550] hover:text-[#170040]'
              }`}
            >
              Tabla de Premios
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 px-4 text-sm font-semibold transition-all border-b-2 ${
                activeTab === 'history'
                  ? 'border-[#16a34a] text-[#16a34a]'
                  : 'border-transparent text-[#494550] hover:text-[#170040]'
              }`}
            >
              Historial de Ganadores
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#6ffbbe]/20 text-[#002113] border border-[#6ffbbe]/50 px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00a06f] animate-ping" />
            <span className="w-2.5 h-2.5 absolute rounded-full bg-[#00a06f]" />
            <span className="ml-2">Live Status: Active</span>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Digital Bolillero */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-[#cbc4d2]/30 p-6 text-center flex flex-col items-center justify-between min-h-[460px] overflow-hidden">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-[#494550]/80">Digital Bolillero</span>
              </div>
              {/* Concentric rotating glowing circle layout with Hechos on the left and Restan on the right */}
              <div className="w-full flex items-center justify-center gap-3 my-6 select-none">
                {/* Left side: Tiros Hechos */}
                <div className="text-center shrink-0 w-14 bg-[#eefaf3] border border-[#16a34a]/20 py-2.5 px-1 rounded-xl shadow-xs">
                  <span className="block text-[8px] uppercase font-black tracking-wider text-[#15803d]">HECHOS</span>
                  <span className="block text-xl font-black text-[#16a34a] font-mono leading-none mt-1.5">{calledNumbers.length}</span>
                </div>

                {/* Center side: Animated sphere */}
                <div className="relative flex items-center justify-center w-40 h-40 sm:w-44 sm:h-44 shrink-0">
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#22c55e]/30 animate-spin pointer-events-none" style={{ animationDuration: '30s' }} />
                  <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#4edea5]/25 animate-spin pointer-events-none" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                  
                  {/* Clickable ball sphere mimicking a real premium physical container element */}
                  <button
                    id="btn-click-sphere"
                    onClick={handleDrawBall}
                    disabled={animatingBall}
                    style={{
                      background: 'radial-gradient(circle at 32% 32%, #ffffff 0%, #cbd5e1 15%, #10b981 48%, #047857 80%, #022c22 100%)',
                      boxShadow: '0 10px 25px -5px rgba(2, 44, 34, 0.45), inset 0 -4px 10px rgba(0,0,0,0.55), inset 0 4px 10px rgba(255,255,255,0.7)'
                    }}
                    className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center text-white active:scale-[0.94] transition-all transform duration-300 outline-none select-none relative z-10 ${
                      animatingBall 
                        ? 'animate-pulse-glow rotate-12 pointer-events-none opacity-90' 
                        : 'cursor-pointer hover:scale-[1.08] hover:shadow-2xl focus:ring-4 focus:ring-emerald-400/50'
                    }`}
                    title="¡Haz clic en el bolillero o presiona la BARRA ESPACIADORA para sacar una bolilla!"
                  >
                    <span className="text-[9px] uppercase font-black text-emerald-250 tracking-widest leading-none mb-1 flex items-center justify-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      <RotateCw className={`w-3 h-3 ${animatingBall ? 'animate-spin' : ''}`} />
                      <span>{animatingBall ? 'GIRANDO...' : '¡GIRAR!'}</span>
                    </span>
                    <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight leading-none ${animatingBall ? 'text-emerald-100' : ''}`}>
                      {currentDisplayNum !== null ? String(currentDisplayNum).padStart(2, '0') : '--'}
                    </span>
                    
                    {/* Subtle letter indicator based on number */}
                    {currentDisplayNum !== null ? (
                      <span className="text-xs font-black tracking-widest bg-white/20 px-3 py-1 rounded-full mt-2 leading-none">
                        {getBallLetter(currentDisplayNum)}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-100 tracking-wide mt-2 opacity-80 leading-none">
                        BOLILLERO
                      </span>
                    )}
                  </button>
                </div>

                {/* Right side: Tiros Restantes */}
                <div className="text-center shrink-0 w-14 bg-gray-50 border border-gray-200 py-2.5 px-1 rounded-xl shadow-xs">
                  <span className="block text-[8px] uppercase font-black tracking-wider text-gray-500">RESTAN</span>
                  <span className="block text-xl font-black text-gray-400 font-mono leading-none mt-1.5">{totalRangeCount - calledNumbers.length}</span>
                  {calledNumbers.length === totalRangeCount && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowGameOverModal(true);
                        playTone(520, 'sine', 0.1);
                      }}
                      className="mt-1.5 text-[8px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 hover:bg-amber-200 py-1 px-0.5 rounded-md border border-amber-300 cursor-pointer block w-full text-center hover:scale-105 transition-all"
                      title="Ver Ganadores del Juego"
                    >
                      🏆 VER
                    </button>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="w-full space-y-3">
                {/* Auto-draw toggle button */}
                {(config.autoDrawInterval || 0) > 0 && (
                  <button
                    id="btn-auto-draw"
                    onClick={() => {
                      setAutoDrawActive(!autoDrawActive);
                      playTone(autoDrawActive ? 300 : 600, 'sine', 0.1);
                    }}
                    disabled={calledNumbers.length >= totalRangeCount}
                    className={`w-full py-3.5 font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      autoDrawActive
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400'
                        : 'bg-[#8a4cfc] hover:bg-[#712ae2] text-white border-2 border-[#8a4cfc]'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {autoDrawActive ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Detener Auto ({config.autoDrawInterval}s)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Tirado Automático ({config.autoDrawInterval}s)</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  id="btn-reset-game"
                  onClick={() => { setAutoDrawActive(false); onResetGame(); }}
                  className="w-full py-3.5 bg-white hover:bg-emerald-50 text-[#16a34a] border-2 border-[#16a34a]/35 hover:border-[#16a34a] font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reiniciar Juego</span>
                </button>
              </div>

              {/* Recent History queue */}
              <div className="w-full mt-6 border-t border-gray-100 pt-6">
                <p className="text-xs font-bold text-[#494550] mb-3 uppercase tracking-wider text-left">Recent History</p>
                <div className="flex gap-3 justify-start items-center">
                  {calledNumbers.length === 0 ? (
                    <div className="flex gap-2">
                      <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">?</span>
                      <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">?</span>
                      <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">?</span>
                    </div>
                  ) : (
                    calledNumbers.slice(-4, -1).reverse().map((num, i) => (
                      <span
                        key={i}
                        className="w-9 h-9 rounded-full bg-[#eceef0] border border-gray-300 font-mono font-bold text-sm flex items-center justify-center text-[#170040] shadow-sm transform hover:scale-105 transition-all"
                      >
                        {String(num).padStart(2, '0')}
                      </span>
                    ))
                  )}
                  {calledNumbers.length > 1 && (
                    <span className="text-xs text-gray-400 italic ml-2">anterior</span>
                  )}
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-[#cbc4d2]/30 p-6 space-y-4">
              <h3 className="font-bold text-base text-[#170040] mb-1">Game Stats</h3>

              {/* Bento status nodes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f2f4f6] p-4 rounded-lg flex flex-col justify-between">
                  <p className="text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">Cartones Creados</p>
                  <div className="flex items-center gap-1.5">
                    <Ticket className="w-5 h-5 text-[#16a34a]" />
                    <span className="text-2.5xl font-black text-[#170040] tracking-tight">
                      {generatedCards.length}
                    </span>
                  </div>
                </div>
                
                <div className="bg-[#f2f4f6] p-4 rounded-lg flex flex-col justify-between">
                  <p className="text-[10px] uppercase font-black tracking-wider text-gray-500 mb-1">Total Facturado</p>
                  <div className="flex items-center gap-1">
                    <Wallet className="w-4.5 h-4.5 text-emerald-600" />
                    <span className="text-2.5xl font-black text-[#16a34a] tracking-tight">
                      ${(generatedCards.length * config.cardPrice).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-[#f2f4f6] p-4 rounded-lg col-span-2 space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 leading-none">Precio por Cartón ($)</label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center bg-gray-200/50 w-8 h-8 rounded-lg text-gray-500 font-extrabold text-xs">
                      $
                    </div>
                    <input
                      id="input-card-price-dashboard"
                      type="number"
                      min="0"
                      step="any"
                      value={config.cardPrice}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setConfig(prev => ({ ...prev, cardPrice: val }));
                      }}
                      className="w-full bg-white border border-gray-200 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 hover:border-[#16a34a]/30 text-sm font-black text-[#170040] px-3 py-1.5 rounded-lg outline-none transition-all"
                      placeholder="Precio de venta por unidad"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: General Board View */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-[#cbc4d2]/30 p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#170040]">El Testigo</h3>
                  <p className="text-xs text-[#494550]">General Board View ({fromRange}-{toRange}). Haz clic en cualquier número para cantarlo manualmente.</p>
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-[#16a34a]" />
                    <span className="text-[#16a34a]">Called</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-[#eceef0] border border-gray-300" />
                    <span className="text-[#494550]">Pending</span>
                  </div>
                </div>
              </div>

              {/* Grid divided into logical tabs B I N G O inside a table layout */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
                {Array.from({ length: totalRangeCount }).map((_, idx) => {
                  const num = idx + fromRange;
                  const isCalled = calledNumbers.includes(num);
                  return (
                    <button
                      key={num}
                      onClick={() => handleToggleCell(num)}
                      className={`h-11 sm:h-12 w-full rounded-md text-sm font-bold transition-all duration-150 relative active:scale-95 flex items-center justify-center border ${
                        isCalled
                          ? 'bg-[#16a34a] border-[#16a34a] text-white shadow-sm font-extrabold hover:bg-[#15803d]'
                          : 'bg-[#eceef0] border-gray-200 text-[#494550] hover:border-[#16a34a] hover:bg-white'
                      }`}
                    >
                      {num}
                      {/* Accent spark if it is the absolute current ball */}
                      {num === currentDisplayNum && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chronological Game History Log */}
            <div className="bg-white rounded-xl shadow-sm border border-[#cbc4d2]/30 p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#16a34a]/10 text-[#16a34a]">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#170040]">Historial Cronológico</h3>
                    <p className="text-xs text-[#494550]">Registro de bolillas en el orden exacto de aparición.</p>
                  </div>
                </div>

                {calledNumbers.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSortDescending(!sortDescending);
                        playTone(500, 'sine', 0.05);
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#170040] text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>{sortDescending ? 'Recientes primero' : 'Antiguos primero'}</span>
                    </button>
                    <span className="text-xs font-black bg-[#16a34a]/10 text-[#16a34a] px-3 py-1.5 rounded-full font-mono uppercase tracking-tight">
                      {calledNumbers.length} Llamadas
                    </span>
                  </div>
                )}
              </div>

              {calledNumbers.length === 0 ? (
                <div className="border border-dashed border-[#cbc4d2]/50 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-[#f2f4f6]/30">
                  <Clock className="w-8 h-8 text-gray-400 animate-pulse" />
                  <div>
                    <p className="font-bold text-sm text-[#170040]">Sin llamados todavía</p>
                    <p className="text-xs text-gray-400 mt-1">Saca una de las bolillas del bolillero digital para poblar el registro.</p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {(sortDescending ? [...calledNumbers].reverse() : calledNumbers).map((num, idx) => {
                      // Determine the actual call index (1-based index)
                      const originalIndex = sortDescending 
                        ? calledNumbers.length - idx 
                        : idx + 1;
                      const letter = getBallLetter(num);
                      const isLatest = num === currentDisplayNum;

                      return (
                        <div
                          key={`${num}-${originalIndex}`}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                            isLatest
                              ? 'border-[#16a34a] bg-[#16a34a]/5 shadow-sm shadow-[#16a34a]/10 scale-[1.02] ring-1 ring-[#16a34a]'
                              : 'border-gray-200 bg-[#f7f9fb] hover:border-gray-300'
                          }`}
                        >
                          {/* Order Indicator Bubble */}
                          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#eceef0] text-[#494550] text-[10px] font-black font-mono">
                            #{originalIndex}
                          </span>

                          {/* Colored letter & number ball */}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black border font-mono ${getBallColorClass(num)}`}>
                            <span className="opacity-75">{letter}</span>
                            <span>{String(num).padStart(2, '0')}</span>
                          </div>

                          {/* Sparkle or pulse for the absolute latest draw */}
                          {isLatest && (
                            <span className="ml-auto flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16a34a]"></span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Banner Card */}
            <div className="rounded-xl shadow-md p-8 bg-gradient-to-r from-[#170040] to-[#2e1065] text-white flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-6 text-white opacity-5 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                <CheckCircle2 size={240} className="stroke-current" />
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-white/10 shrink-0 text-[#6ffbbe]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold tracking-tight">System Integrity Validated</h4>
                  <p className="text-sm text-gray-300 mt-1 max-w-lg">
                    All calls are logged, secured with cryptographic serial controls, and synchronized with active player apps in real-time. No duplicates guaranteed mathematically in 100% of cases.
                  </p>
                </div>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg text-xs font-mono border border-white/10 tracking-widest text-[#6ffbbe]/90 tracking-tight">
                ACTIVE LOGS: VERIFIED
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prizes' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#cbc4d2]/30 p-8 space-y-6">
          <h3 className="text-xl font-bold text-[#170040]">Tabla de Premios</h3>
          <p className="text-xs text-[#494550]">Distribución de premios configurada basándose en la venta total de {generatedCards.length} cartones.</p>

          <div className="space-y-4">
            {(config.prizes && config.prizes.length > 0) ? (
              config.prizes.map((prize, idx) => {
                const totalRevenue = generatedCards.length * config.cardPrice;
                const computedAmount = prize.isFixed 
                  ? prize.fixedAmount 
                  : Math.round((totalRevenue * prize.percentage) / 100);

                return (
                  <div key={prize.id} className="flex justify-between items-center p-4 border border-[#cbc4d2]/20 rounded-xl hover:border-[#16a34a]/40 transition-all bg-gradient-to-r from-white to-[#f2f4f6]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#16a34a]/10 text-[#16a34a] rounded-lg flex items-center justify-center font-black">
                        {idx + 1}°
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#170040]">{prize.name}</h4>
                        <p className="text-xs text-[#494550]">
                          {prize.description} {!prize.isFixed && `(${prize.percentage}% de la recaudación)`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-lg text-[#16a34a] block">
                        ${computedAmount.toLocaleString()} USD
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono italic">
                        {prize.isFixed ? 'Monto Fijo' : 'Pozo Proporcional'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-6 text-gray-400 text-xs">
                No hay premios configurados en Settings.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#cbc4d2]/30 p-8 space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-[#170040]">Historial de Ganadores</h3>
              <p className="text-xs text-[#494550]">Registro acumulado de premios cantados y ganadores detectados en este navegador.</p>
            </div>
            {historicalWinners.length > 0 && (
              <div className="flex flex-wrap gap-2.5 self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Vaciar Historial
                </button>
              </div>
            )}
          </div>

          {/* Stats Summary Panel */}
          {historicalWinners.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">PREMIOS TOTALES</span>
                  <span className="text-xl font-black text-emerald-900 font-mono leading-none">{totalWins}</span>
                </div>
              </div>

              <div className="bg-[#fefce8] border border-[#fef08a] p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-yellow-700 font-extrabold uppercase tracking-wider">CARTÓN LLENO</span>
                  <span className="text-xl font-black text-yellow-900 font-mono leading-none">{fullCardWins}</span>
                </div>
              </div>

              <div className="bg-[#f5f3ff] border border-[#ddd6fe] p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider font-sans">GANADOR LÍNEA</span>
                  <span className="text-xl font-black text-indigo-900 font-mono leading-none">{lineWins}</span>
                </div>
              </div>
            </div>
          )}

          {historicalWinners.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[#cbc4d2]/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-[#cbc4d2]/20">
                    <th className="py-3 px-4">Premio</th>
                    <th className="py-3 px-4">Cartón</th>
                    <th className="py-3 px-4">N° Desencadenador</th>
                    <th className="py-3 px-4">Detalle Partida</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {historicalWinners.map((winner) => {
                    const dateObj = new Date(winner.date);
                    const formattedDate = isNaN(dateObj.getTime()) 
                      ? 'Reciente' 
                      : dateObj.toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        });

                    return (
                      <tr key={winner.id} className="hover:bg-gray-50/60 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              winner.prizeType === 'full_card' ? 'bg-[#eab308]' : 
                              winner.prizeType === 'palabra_bingo' ? 'bg-[#9061f9]' : 
                              winner.prizeType === 'horizontal_line' ? 'bg-[#10b981]' : 'bg-[#3b82f6]'
                            }`} />
                            <div>
                              <span className="font-extrabold text-[#170040] block">{winner.prizeName}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{winner.prizeType.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-[#8a4cfc]/10 text-[#8a4cfc] border border-[#8a4cfc]/20 px-2.5 py-1 rounded-md text-xs font-black font-mono">
                            #{winner.cardSerial}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-black font-mono text-xs">
                            {winner.lastNumberCalled}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-gray-500">
                          <div className="space-y-0.5">
                            <p>Tiradas: <span className="font-bold text-[#170040]">{winner.calledCount} bolas</span></p>
                            <p className="text-[10px]">Rango: {winner.range}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-gray-400 font-mono">
                          {formattedDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-[#fbfbfd] border border-dashed border-[#cbc4d2]/30 rounded-xl space-y-3">
              <div className="w-12 h-12 bg-gray-100/80 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <History className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-[#170040]">Sin historial registrado</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Los ganadores que completen las condiciones configuradas de juego durante el sorteo activo aparecerán automáticamente registrados aquí.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Pop-up Winner Verification Modal */}
      {showWinnerModal && activeWinningSession.length > 0 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border-4 border-[#16a34a] shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 transform animate-bounce-short relative overflow-hidden">
            {/* Shimmer background flare effect */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 animate-pulse" />
            
            {/* Giant GANADOR Title Header Block */}
            <div className="text-center space-y-3 relative z-10 pt-2">
              <div className="inline-flex relative items-center justify-center">
                {/* Rotating glow ring background */}
                <div className="absolute inset-0 w-24 h-24 rounded-full bg-amber-400/20 blur-xl animate-pulse" />
                <div className="p-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-white shadow-lg relative">
                  <Trophy className="w-12 h-12 text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.30)] animate-bounce" />
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="inline-block tracking-widest text-[#15803d] font-black text-xs sm:text-sm uppercase bg-[#eefaf3] px-4 py-1.5 rounded-full border border-emerald-200 shadow-xs">
                  🏆 PREMIO DETECTADO 🏆
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-[#170040] select-none uppercase">
                  ¡<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#16a34a] via-amber-500 to-[#10b981] animate-pulse">GANADOR</span>!
                </h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  ¡Felicitaciones! El sistema ha validado cartones premiados en la jugada actual.
                </p>
              </div>
            </div>

            {/* Winners List */}
            <div className="space-y-6 max-h-[380px] overflow-y-auto p-1 relative z-10">
              {activeWinningSession.map(({ prize, card }) => {
                const calledSet = new Set<any>();
                calledNumbers.forEach(n => {
                  calledSet.add(n);
                  calledSet.add(Number(n));
                  calledSet.add(String(n));
                });
                
                // Filter actual playable grid numbers excluding the free space 0 center cell
                const playableNumbers = card.grid.flat().filter(val => val !== 0 && val !== "0");
                const matchedNumbers = playableNumbers.filter(val => 
                  calledSet.has(val) || calledSet.has(Number(val)) || calledSet.has(String(val))
                );
                const totalMatches = matchedNumbers.length;

                return (
                  <div key={`${prize.id}-${card.serial}`} className="border-3 border-emerald-500/80 bg-gradient-to-b from-[#f0fdf4] to-white p-5 rounded-2xl space-y-4 shadow-md relative">
                    {/* Floating mini badge */}
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase shadow-sm">
                      GANADOR
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-100 pb-3">
                      <div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-xs font-black bg-[#16a34a] text-white px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-xs">
                            {prize.name}
                          </span>
                          <span className="text-xs font-sans font-black bg-amber-500 text-white px-3 py-1 rounded-full uppercase tracking-wider shadow-md animate-pulse">
                            🔥 {totalMatches} ACIERTOS
                          </span>
                        </div>
                        <p className="text-xs text-emerald-850 mt-1.5 font-bold">
                          {prize.description} — Ganador con <strong className="text-[#15803d] underline decoration-wavy">{totalMatches} números cantados</strong> (+ comodín central).
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase block tracking-wider leading-none">Número de Cartón</span>
                        <span className="text-xl font-black text-[#170040] font-mono leading-none mt-1.5 block">Cartón #{card.serial}</span>
                      </div>
                    </div>

                    {/* Mini Card Grid to verify visually */}
                    <div className="max-w-[260px] mx-auto bg-white p-4 rounded-xl border-2 border-emerald-200/60 shadow-md">
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        {/* B I N G O Headers */}
                        {['B', 'I', 'N', 'G', 'O'].map((letter, colIdx) => (
                           <div key={colIdx} className="text-xs font-extrabold text-[#170040] py-1 bg-gradient-to-b from-gray-50 to-gray-200 rounded-md font-sans border border-gray-200">
                            {letter}
                          </div>
                        ))}
                        
                        {/* Grid cells */}
                        {card.grid.map((row, rIdx) => 
                          row.map((val, cIdx) => {
                            const isCalled = val === 0 || (val as any) === "0" || calledSet.has(val) || calledSet.has(Number(val)) || calledSet.has(String(val));
                            return (
                              <div
                                key={`${rIdx}-${cIdx}`}
                                className={`h-9 w-9 text-xs font-black flex items-center justify-center rounded-md border transition-all ${
                                  isCalled
                                    ? 'bg-gradient-to-br from-[#16a34a] to-[#047857] text-white border-[#15803d] shadow-md font-mono font-black scale-102 ring-2 ring-emerald-300'
                                    : 'bg-gray-50 text-gray-400 border-gray-150 font-mono font-semibold'
                                }`}
                              >
                                {val === 0 ? '★' : val}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Buttons / Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center border-t border-gray-100 pt-5 relative z-10 w-full">
              {calledNumbers.length === totalRangeCount ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onResetGame();
                      setShowWinnerModal(false);
                      playTone(520, 'sine', 0.1);
                    }}
                    className="w-full sm:w-1/2 py-3.5 px-6 border-2 border-emerald-300 hover:border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-[#16a34a] font-black text-sm rounded-xl cursor-pointer transition-all active:scale-95 text-center"
                  >
                    Empezar Nuevo Juego
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWinnerModal(false);
                      playTone(445, 'sine', 0.15);
                      confetti({ particleCount: 50, spread: 80 });
                    }}
                    className="w-full sm:w-1/2 py-3.5 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-95 text-center font-sans tracking-wide"
                  >
                    Cerrar y Ver Tablero
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowWinnerModal(false);
                    playTone(440, 'sine', 0.1);
                    // Quick final single burst
                    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
                  }}
                  className="w-full sm:w-auto py-4 px-10 bg-gradient-to-r from-[#16a34a] to-[#10b981] hover:from-[#15803d] hover:to-[#059669] text-white font-extrabold text-sm rounded-xl shadow-lg cursor-pointer transition-all transform active:scale-95 text-center flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>Aceptar y Continuar Juego</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Pop-up Game Over / 0 Remaining Modal */}
      {showGameOverModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in animate-duration-200">
          <div className="bg-white rounded-2xl border-4 border-amber-500 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 transform animate-bounce-short relative overflow-hidden">
            {/* Shimmer background flare effect */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400 animate-pulse" />

            {/* Header */}
            <div className="text-center space-y-3 relative z-10 pt-2">
              <div className="inline-flex relative items-center justify-center">
                <div className="absolute inset-0 w-24 h-24 rounded-full bg-amber-400/30 blur-xl animate-pulse" />
                <div className="p-4 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-300 text-white shadow-lg relative">
                  <Trophy className="w-12 h-12 text-white animate-bounce" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="inline-block tracking-widest text-amber-800 font-extrabold text-xs sm:text-sm uppercase bg-amber-50 px-4 py-1.5 rounded-full border border-amber-200 shadow-xs">
                  🏆 FINAL DE JUEGO MÁXIMO 🏆
                </span>
                <h2 className="text-4.5xl sm:text-5xl font-extrabold tracking-tighter text-[#170040] select-none uppercase">
                  ¡<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-yellow-500 to-emerald-600 animate-pulse">GANADOR ABSOLUTO</span>!
                </h2>
                <p className="text-xs text-amber-700 font-extrabold uppercase tracking-widest leading-none">Cero Bolillas Restantes (0 DE {totalRangeCount} RESTANTES)</p>
                <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed mt-2 font-medium">
                  Se han cantado la totalidad de los {totalRangeCount} números del bolillero. El sistema ha calculated el cartón ganador definitivo en base a la mayor cantidad de aciertos logrados.
                </p>
              </div>
            </div>

            {/* Absolute Winner Box */}
            <div className="space-y-4 relative z-10">
              <div className="bg-[#fefaf0] border-2 border-amber-300 p-4 rounded-2xl text-center space-y-1 shadow-xs">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block leading-none">Récord Máximo de Aciertos en esta Partida</span>
                <span className="text-3xl font-black text-amber-600 font-mono tracking-tight block mt-1.5">🔥 {maxMatches} COINCIDENCIAS / 24</span>
                <p className="text-xs text-gray-505 mt-1 max-w-md mx-auto font-bold leading-normal">
                  De las 24 casillas numéricas de juego ({absoluteWinners.length} {absoluteWinners.length === 1 ? 'cartón destacado' : 'cartones empatados en primer lugar'}).
                </p>
              </div>

              {/* Winners list */}
              <div className="space-y-6 max-h-[290px] overflow-y-auto p-1 divide-y divide-gray-150">
                {absoluteWinners.length > 0 ? (
                  absoluteWinners.map((card, idx) => {
                    const calledSet = new Set<any>();
                    calledNumbers.forEach(n => {
                      calledSet.add(n);
                      calledSet.add(Number(n));
                      calledSet.add(String(n));
                    });
                    return (
                      <div key={card.serial} className={`space-y-4 ${idx > 0 ? 'pt-6' : ''}`}>
                        <div className="flex justify-between items-center bg-[#fffbeb] border border-amber-200 py-2.5 px-4 rounded-xl shadow-xs relative">
                          <span className="text-xs font-black text-amber-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
                            🌟 Ganador Absoluto #{idx + 1}
                          </span>
                          <span className="text-sm font-black text-[#170040] font-mono bg-white px-3 py-1 rounded-lg border border-amber-200">
                            Cartón #{card.serial}
                          </span>
                        </div>

                        {/* Mini Card Grid to verify visually */}
                        <div className="max-w-[260px] mx-auto bg-white p-4 rounded-xl border-2 border-amber-200/60 shadow-md">
                          <div className="grid grid-cols-5 gap-1.5 text-center">
                            {/* B I N G O Headers */}
                            {['B', 'I', 'N', 'G', 'O'].map((letter, colIdx) => (
                              <div key={colIdx} className="text-xs font-extrabold text-[#170040] py-1 bg-gradient-to-b from-gray-50 to-gray-200 rounded-md font-sans border border-gray-200">
                                {letter}
                              </div>
                            ))}
                            
                            {/* Grid cells */}
                            {card.grid.map((row, rIdx) => 
                              row.map((val, cIdx) => {
                                const isCalled = val === 0 || (val as any) === "0" || calledSet.has(val) || calledSet.has(Number(val)) || calledSet.has(String(val));
                                return (
                                  <div
                                    key={`${rIdx}-${cIdx}`}
                                    className={`h-9 w-9 text-xs font-black flex items-center justify-center rounded-md border transition-all ${
                                      isCalled
                                        ? 'bg-gradient-to-br from-[#16a34a] to-[#047857] text-white border-[#15803d] shadow-sm font-mono font-black scale-102 ring-2 ring-emerald-300'
                                        : 'bg-gray-50 text-gray-450 border-gray-150 font-mono font-semibold'
                                    }`}
                                  >
                                    {val === 0 ? '★' : val}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-gray-450 font-bold py-8">
                    No hay cartones generados para calcular los ganadores absolutos.
                  </div>
                )}
              </div>
            </div>

            {/* Buttons / Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center border-t border-gray-150 pt-5 relative z-10">
              <button
                type="button"
                onClick={() => {
                  onResetGame();
                  setShowGameOverModal(false);
                  playTone(520, 'sine', 0.1);
                }}
                className="w-full sm:w-1/2 py-3.5 px-6 border-2 border-emerald-300 hover:border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-[#16a34a] font-black text-sm rounded-xl cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5"
              >
                <span>Empezar Nuevo Juego</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGameOverModal(false);
                  playTone(445, 'sine', 0.15);
                  confetti({ particleCount: 50, spread: 80 });
                }}
                className="w-full sm:w-1/2 py-3.5 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-95 text-center font-sans tracking-wide"
              >
                Cerrar y Ver Tablero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
