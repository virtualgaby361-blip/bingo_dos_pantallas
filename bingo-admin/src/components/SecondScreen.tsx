/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { WinnerEvent } from '../types';
import { Star, Trophy, Play } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * SecondScreen component - designed to run in its own browser window.
 * Reads game state from localStorage and syncs in real-time.
 */
export default function SecondScreen() {
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [lineWinner, setLineWinner] = useState<WinnerEvent | null>(null);
  const [bingoWinner, setBingoWinner] = useState<WinnerEvent | null>(null);
  const [bingoName, setBingoName] = useState<string>('Bingo Admin');
  const [bingoLogo, setBingoLogo] = useState<string>('B');
  const [fromRange, setFromRange] = useState<number>(1);
  const [toRange, setToRange] = useState<number>(99);

  // Track previous winner state to detect new wins
  const prevLineWinnerRef = useRef<string | null>(null);
  const prevBingoWinnerRef = useRef<string | null>(null);

  // Modal state - only for BINGO winner (line shows inline)
  const [showBingoModal, setShowBingoModal] = useState(false);
  const [bingoModalWinner, setBingoModalWinner] = useState<WinnerEvent | null>(null);

  // Paused state: when line won, waiting for operator to continue to bingo
  const [pausedForLine, setPausedForLine] = useState(false);

  const loadState = () => {
    try {
      const called = localStorage.getItem('bingo_called_numbers');
      if (called) setCalledNumbers(JSON.parse(called));

      const line = localStorage.getItem('bingo_line_winner');
      if (line) setLineWinner(JSON.parse(line));
      else setLineWinner(null);

      const bingo = localStorage.getItem('bingo_bingo_winner');
      if (bingo) setBingoWinner(JSON.parse(bingo));
      else setBingoWinner(null);

      const name = localStorage.getItem('bingo_name');
      if (name) setBingoName(name);

      const logo = localStorage.getItem('bingo_logo');
      if (logo) setBingoLogo(logo);

      const configStr = localStorage.getItem('bingo_generator_config');
      if (configStr) {
        const cfg = JSON.parse(configStr);
        if (cfg.fromRange) setFromRange(cfg.fromRange);
        if (cfg.toRange) setToRange(cfg.toRange);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadState();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bingo_called_numbers' && e.newValue) setCalledNumbers(JSON.parse(e.newValue));
      if (e.key === 'bingo_line_winner') setLineWinner(e.newValue ? JSON.parse(e.newValue) : null);
      if (e.key === 'bingo_bingo_winner') setBingoWinner(e.newValue ? JSON.parse(e.newValue) : null);
      if (e.key === 'bingo_name' && e.newValue) setBingoName(e.newValue);
      if (e.key === 'bingo_logo' && e.newValue) setBingoLogo(e.newValue);
      if (e.key === 'bingo_generator_config' && e.newValue) {
        try {
          const cfg = JSON.parse(e.newValue);
          if (cfg.fromRange) setFromRange(cfg.fromRange);
          if (cfg.toRange) setToRange(cfg.toRange);
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(loadState, 500);
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, []);

  // Detect new winners → confetti + modal/pause
  useEffect(() => {
    const currentLineId = lineWinner ? lineWinner.cardSerial + lineWinner.timestamp : null;
    const currentBingoId = bingoWinner ? bingoWinner.cardSerial + bingoWinner.timestamp : null;

    const isNewLine = currentLineId && currentLineId !== prevLineWinnerRef.current;
    const isNewBingo = currentBingoId && currentBingoId !== prevBingoWinnerRef.current;

    // Detect game reset: winners went from something to null
    if (!currentLineId && prevLineWinnerRef.current) {
      // Game was reset - clear everything
      setPausedForLine(false);
      setShowBingoModal(false);
      setBingoModalWinner(null);
      prevLineWinnerRef.current = null;
      prevBingoWinnerRef.current = null;
      return;
    }
    if (!currentBingoId && prevBingoWinnerRef.current) {
      setShowBingoModal(false);
      setBingoModalWinner(null);
      prevBingoWinnerRef.current = null;
      return;
    }

    if (isNewLine) {
      setPausedForLine(true);
      // Confetti for line
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      const end = Date.now() + 4000;
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
      const frame = () => {
        confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    if (isNewBingo) {
      setPausedForLine(false);
      setBingoModalWinner(bingoWinner);
      setShowBingoModal(true);
      // Big confetti for bingo
      confetti({ particleCount: 300, spread: 140, origin: { y: 0.45 } });
      const end = Date.now() + 6000;
      const colors = ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
      const frame = () => {
        confetti({ particleCount: 5, angle: 60, spread: 65, origin: { x: 0, y: 0.6 }, colors });
        confetti({ particleCount: 5, angle: 120, spread: 65, origin: { x: 1, y: 0.6 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      setTimeout(() => confetti({ particleCount: 250, spread: 160, origin: { y: 0.35 }, colors }), 800);
      setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { y: 0.5 }, colors }), 2000);
    }

    prevLineWinnerRef.current = currentLineId;
    prevBingoWinnerRef.current = currentBingoId;
  }, [lineWinner, bingoWinner]);

  const totalRange = toRange - fromRange + 1;
  const lastNumber = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null;

  const getBallLetter = (num: number) => {
    const colSize = Math.max(5, Math.floor(totalRange / 5));
    if (num <= fromRange + colSize - 1) return 'B';
    if (num <= fromRange + 2 * colSize - 1) return 'I';
    if (num <= fromRange + 3 * colSize - 1) return 'N';
    if (num <= fromRange + 4 * colSize - 1) return 'G';
    return 'O';
  };

  const getBallColor = (num: number) => {
    const letter = getBallLetter(num);
    switch (letter) {
      case 'B': return 'from-purple-500 to-purple-700';
      case 'I': return 'from-blue-500 to-blue-700';
      case 'N': return 'from-green-500 to-green-700';
      case 'G': return 'from-orange-500 to-orange-700';
      case 'O': return 'from-pink-500 to-pink-700';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  // Render card grid inline
  const renderCardGrid = (winner: WinnerEvent, colorScheme: 'green' | 'gold') => {
    const calledSet = new Set<number>(calledNumbers);
    calledSet.add(0);
    return (
      <div className="grid grid-cols-5 gap-1 w-full max-w-[280px] mx-auto">
        {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
          <div key={i} className={`h-8 flex items-center justify-center text-white font-black text-sm rounded ${
            colorScheme === 'gold' ? 'bg-amber-500/30' : 'bg-emerald-500/30'
          }`}>{letter}</div>
        ))}
        {winner.card.grid.map((row, rIdx) =>
          row.map((val, cIdx) => {
            const isCalled = val === 0 || calledSet.has(val as number);
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`h-10 flex items-center justify-center rounded font-mono font-bold text-xs border transition-all ${
                  isCalled
                    ? colorScheme === 'gold'
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-300 shadow-sm'
                      : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-300 shadow-sm'
                    : 'bg-white/5 text-white/30 border-white/10'
                }`}
              >
                {val === 0 ? <Star className="w-3 h-3 fill-current" /> : val}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#0a0020] via-[#170040] to-[#1a0050] text-white flex flex-col overflow-hidden relative">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header - compact */}
      <header className="relative z-10 shrink-0 flex justify-between items-center px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {bingoLogo && !bingoLogo.startsWith('http') ? (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-base shadow-lg">
              {bingoLogo.slice(0, 2)}
            </div>
          ) : bingoLogo && bingoLogo.startsWith('http') ? (
            <img src={bingoLogo} alt="Logo" className="w-10 h-10 rounded-lg object-cover border-2 border-white/20" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-base shadow-lg">B</div>
          )}
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{bingoName}</h1>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">En Vivo</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="ml-1">EN VIVO</span>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Bolillas</p>
            <p className="text-2xl font-black font-mono text-white">{calledNumbers.length}<span className="text-white/30 text-sm">/{totalRange}</span></p>
          </div>
        </div>
      </header>

      {/* Main Content - fills remaining space */}
      <div className="flex-1 relative z-10 flex flex-col lg:flex-row gap-4 p-4 min-h-0 overflow-hidden">
        
        {/* Left Column: Ball + Recent + Line Winner */}
        <div className="lg:w-[30%] flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Current Ball */}
          <div className="shrink-0 flex flex-col items-center py-4">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Última Bolilla</span>
            {lastNumber !== null ? (
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getBallColor(lastNumber)} flex flex-col items-center justify-center shadow-2xl border-4 border-white/30 animate-bounce`} style={{ animationDuration: '2s' }}>
                <span className="text-base font-black text-white/70">{getBallLetter(lastNumber)}</span>
                <span className="text-5xl font-black text-white font-mono">{String(lastNumber).padStart(2, '0')}</span>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-white/5 border-4 border-white/10 flex items-center justify-center">
                <span className="text-4xl font-black text-white/20">--</span>
              </div>
            )}
          </div>

          {/* Recent Balls */}
          <div className="shrink-0 bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Últimas Bolillas</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {calledNumbers.slice(-6, -1).reverse().map((num, i) => (
                <div
                  key={`${num}-${i}`}
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${getBallColor(num)} flex flex-col items-center justify-center shadow-md border-2 border-white/20`}
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <span className="text-[7px] font-bold text-white/60">{getBallLetter(num)}</span>
                  <span className="text-sm font-black text-white font-mono">{String(num).padStart(2, '0')}</span>
                </div>
              ))}
              {calledNumbers.length <= 1 && (
                <p className="text-white/20 text-xs font-bold text-center w-full py-2">Esperando...</p>
              )}
            </div>
          </div>

          {/* Line Winner Card (inline, not modal) */}
          {lineWinner && (
            <div className="shrink-0 bg-emerald-500/10 rounded-xl p-4 border border-emerald-400/30 animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Ganador Línea</span>
                </div>
                <span className="text-xs font-black text-white font-mono">#{lineWinner.cardSerial}</span>
              </div>
              {renderCardGrid(lineWinner, 'green')}
              <p className="text-center text-white/40 text-[10px] mt-2 font-bold">{lineWinner.calledCount} bolillas</p>
              
              {/* "Continuar a Bingo" button - shown when paused for line */}
              {pausedForLine && !bingoWinner && (
                <button
                  onClick={() => setPausedForLine(false)}
                  className="w-full mt-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs rounded-lg shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  Continuar a Bingo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Number Board + Bingo Winner */}
        <div className="lg:w-[70%] flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Number Board */}
          <div className="shrink-0 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Tablero ({fromRange} - {toRange})</h3>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(Math.ceil(Math.sqrt(totalRange * 1.5)), 15)}, minmax(0, 1fr))` }}>
              {Array.from({ length: totalRange }).map((_, idx) => {
                const num = idx + fromRange;
                const isCalled = calledNumbers.includes(num);
                const isLast = num === lastNumber;
                return (
                  <div
                    key={num}
                    className={`aspect-square flex items-center justify-center rounded text-[10px] font-bold transition-all ${
                      isLast
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black ring-1 ring-amber-300 shadow-md scale-105 font-black'
                        : isCalled
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm font-mono'
                          : 'bg-white/5 text-white/15 border border-white/5'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bingo Winner inline */}
          {bingoWinner && !showBingoModal && (
            <div className="shrink-0 bg-amber-500/10 rounded-xl p-4 border border-amber-400/30 animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">Ganador Bingo</span>
                </div>
                <span className="text-xs font-black text-white font-mono">#{bingoWinner.cardSerial}</span>
              </div>
              {renderCardGrid(bingoWinner, 'gold')}
              <p className="text-center text-white/40 text-[10px] mt-2 font-bold">{bingoWinner.calledCount} bolillas</p>
            </div>
          )}

          {/* No winners message */}
          {!lineWinner && !bingoWinner && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2 opacity-30">
                <Trophy className="w-12 h-12 mx-auto text-white/20" />
                <p className="text-white/30 font-bold text-sm">Esperando ganadores...</p>
                <p className="text-white/20 text-[10px]">Primero LÍNEA, luego BINGO</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 shrink-0 px-6 py-2 border-t border-white/10 flex justify-between items-center">
        <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Bingo Admin • Pantalla Secundaria</p>
        <p className="text-[9px] text-white/20 font-mono">{new Date().toLocaleDateString('es-ES')}</p>
      </footer>

      {/* BINGO Winner Modal (only for bingo, full celebration) */}
      {showBingoModal && bingoModalWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-md w-full mx-4 animate-bounce-in">
            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 animate-pulse" />
            <div className="bg-gradient-to-b from-[#1a0050] to-[#0a0020] rounded-2xl border border-amber-400/30 shadow-2xl p-6 space-y-5">
              
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center">
                  <div className="p-3 rounded-full shadow-xl bg-gradient-to-tr from-amber-500 to-yellow-300">
                    <Trophy className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="inline-block px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  🏆 ¡BINGO COMPLETO! 🏆
                </div>
                <h2 className="text-4xl font-extrabold text-white tracking-tight">¡BINGO!</h2>
                <p className="text-white/50 text-xs font-bold">
                  Cartón <span className="text-white font-mono">#{bingoModalWinner.cardSerial}</span> • {bingoModalWinner.calledCount} bolillas
                </p>
              </div>

              {/* Card Grid */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                {renderCardGrid(bingoModalWinner, 'gold')}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowBingoModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  🏆 Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
