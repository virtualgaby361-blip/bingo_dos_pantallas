/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AppScreen, GeneratorConfig, PageSize, BingoCard, Prize, WinnerEvent } from './types';
import Sidebar from './components/Sidebar';
import ControlPanel from './components/ControlPanel';
import CardGenerator from './components/CardGenerator';
import GenerationProgress from './components/GenerationProgress';
import PrintSheet from './components/PrintSheet';
import Settings from './components/Settings';
import SecondScreen from './components/SecondScreen';
import { playTone, generateBulkCards } from './utils';

const DEFAULT_PRIZES: Prize[] = [
  {
    id: '1',
    name: 'Línea (Horizontal)',
    description: 'Premio al completar cualquier línea horizontal de 5 casillas. Se gana primero que el Bingo.',
    type: 'horizontal_line',
    percentage: 40,
    isFixed: false,
    fixedAmount: 50
  },
  {
    id: '2',
    name: 'Bingo (Cartón Lleno)',
    description: 'Premio inmediato al primer cartón con todas las 24 casillas marcadas. Se gana después de la línea.',
    type: 'full_card',
    percentage: 60,
    isFixed: false,
    fixedAmount: 100
  }
];

export default function App() {
  // Detect if this instance is the secondary screen (opened via ?screen=second)
  const isSecondScreen = new URLSearchParams(window.location.search).get('screen') === 'second';

  // If this is the second screen window, render only SecondScreen
  if (isSecondScreen) {
    return <SecondScreen />;
  }

  return <MainApp />;
}

function MainApp() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>(AppScreen.ControlPanel);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [generatedCards, setGeneratedCards] = useState<BingoCard[]>([]);
  const [bingoName, setBingoName] = useState<string>('Bingo Admin');
  const [bingoLogo, setBingoLogo] = useState<string>('B');

  // Winner tracking state for mandatory game flow: LINE first, then BINGO
  const [lineWinner, setLineWinner] = useState<WinnerEvent | null>(null);
  const [bingoWinner, setBingoWinner] = useState<WinnerEvent | null>(null);

  const [config, setConfig] = useState<GeneratorConfig>({
    fromRange: 1,
    toRange: 99,
    selectedColor: '#170040',
    cardCount: 120,
    pageSize: PageSize.A4,
    cardsPerPage: 2,
    showCutLines: true,
    cardPrice: 10,
    prizes: DEFAULT_PRIZES,
    spinDuration: 300,
    freeSpaces: 1,
    autoDrawInterval: 0,
  });

  // Load state from local storage on startup for excellent persistence
  useEffect(() => {
    try {
      const cachedCalled = localStorage.getItem('bingo_called_numbers');
      if (cachedCalled) {
        setCalledNumbers(JSON.parse(cachedCalled));
      }
      const cachedConfig = localStorage.getItem('bingo_generator_config');
      if (cachedConfig) {
        const parsed = JSON.parse(cachedConfig) as GeneratorConfig;
        if (!parsed.prizes || parsed.prizes.length === 0 || parsed.prizes.length > 2 || parsed.prizes.some(p => p.type !== 'full_card' && p.type !== 'horizontal_line')) {
          parsed.prizes = DEFAULT_PRIZES;
        }
        setConfig(parsed);
      }
      const cachedCards = localStorage.getItem('bingo_generated_cards');
      if (cachedCards) {
        setGeneratedCards(JSON.parse(cachedCards));
      }
      const cachedName = localStorage.getItem('bingo_name');
      if (cachedName) {
        setBingoName(cachedName);
      }
      const cachedLogo = localStorage.getItem('bingo_logo');
      if (cachedLogo) {
        setBingoLogo(cachedLogo);
      }
    } catch (e) {
      // Ignore cache restore issues
    }
  }, []);

  // Save changes to local storage on operations updates
  useEffect(() => {
    try {
      localStorage.setItem('bingo_called_numbers', JSON.stringify(calledNumbers));
    } catch(e) {}
  }, [calledNumbers]);

  useEffect(() => {
    try {
      localStorage.setItem('bingo_generator_config', JSON.stringify(config));
    } catch(e) {}
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('bingo_generated_cards', JSON.stringify(generatedCards));
    } catch(e) {}
  }, [generatedCards]);

  useEffect(() => {
    try {
      localStorage.setItem('bingo_name', bingoName);
    } catch(e) {}
  }, [bingoName]);

  useEffect(() => {
    try {
      localStorage.setItem('bingo_logo', bingoLogo);
    } catch(e) {}
  }, [bingoLogo]);

  // Persist winner state to localStorage so the secondary screen can read it
  useEffect(() => {
    try {
      if (lineWinner) {
        localStorage.setItem('bingo_line_winner', JSON.stringify(lineWinner));
      } else {
        localStorage.removeItem('bingo_line_winner');
      }
    } catch(e) {}
  }, [lineWinner]);

  useEffect(() => {
    try {
      if (bingoWinner) {
        localStorage.setItem('bingo_bingo_winner', JSON.stringify(bingoWinner));
      } else {
        localStorage.removeItem('bingo_bingo_winner');
      }
    } catch(e) {}
  }, [bingoWinner]);

  const handleResetGame = () => {
    playTone(300, 'sine', 0.25);
    setTimeout(() => playTone(200, 'sine', 0.35), 150);
    setCalledNumbers([]);
    setLineWinner(null);
    setBingoWinner(null);
  };

  const handleClearAllData = () => {
    playTone(180, 'sawtooth', 0.5);
    setCalledNumbers([]);
    setGeneratedCards([]);
    setBingoName('Bingo Admin');
    setBingoLogo('B');
    setLineWinner(null);
    setBingoWinner(null);
    setConfig({
      fromRange: 1,
      toRange: 99,
      selectedColor: '#170040',
      cardCount: 120,
      pageSize: PageSize.A4,
      cardsPerPage: 2,
      showCutLines: true,
      cardPrice: 10,
      prizes: DEFAULT_PRIZES,
      spinDuration: 300,
      freeSpaces: 1,
      autoDrawInterval: 0,
    });
    localStorage.clear();
    setActiveScreen(AppScreen.ControlPanel);
  };

  // Open second screen in a NEW browser window (for projector/secondary monitor)
  const handleOpenSecondScreen = () => {
    const url = `${window.location.origin}${window.location.pathname}?screen=second`;
    const newWindow = window.open(url, 'BingoSecondScreen', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    if (newWindow) {
      newWindow.focus();
    } else {
      alert('No se pudo abrir la ventana secundaria. Verifica que tu navegador no esté bloqueando popups.');
    }
  };

  const handleStartGeneration = () => {
    setActiveScreen(AppScreen.GenerationProgress);
  };

  const handleCompleteGeneration = (cards: BingoCard[]) => {
    setGeneratedCards(cards);
    setActiveScreen(AppScreen.PrintSheet);
  };

  const handleBackToGenerator = () => {
    setActiveScreen(AppScreen.CardGenerator);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] flex font-sans antialiased overflow-x-hidden print:bg-white print:text-black">
      {/* Structural Sidebar - Hidden during Print Mode */}
      <div className="print:hidden">
        <Sidebar
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          onNewGame={handleResetGame}
          bingoName={bingoName}
          bingoLogo={bingoLogo}
          onOpenSecondScreen={handleOpenSecondScreen}
        />
      </div>

      {/* Main viewport area */}
      <main className="flex-1 ml-64 p-8 min-h-screen print:ml-0 print:p-0">
        <div className="max-w-[1440px] mx-auto pb-16 print:p-0">
          
          {/* Active viewport component routing */}
          {activeScreen === AppScreen.ControlPanel && (
            <ControlPanel
              calledNumbers={calledNumbers}
              setCalledNumbers={setCalledNumbers}
              onResetGame={handleResetGame}
              generatedCards={generatedCards}
              config={config}
              setConfig={setConfig}
              lineWinner={lineWinner}
              setLineWinner={setLineWinner}
              bingoWinner={bingoWinner}
              setBingoWinner={setBingoWinner}
            />
          )}

          {activeScreen === AppScreen.CardGenerator && (
            <CardGenerator
              config={config}
              setConfig={setConfig}
              onStartGeneration={handleStartGeneration}
              bingoName={bingoName}
              bingoLogo={bingoLogo}
            />
          )}

          {activeScreen === AppScreen.GenerationProgress && (
            <GenerationProgress
              config={config}
              onCancel={handleBackToGenerator}
              onComplete={handleCompleteGeneration}
            />
          )}

          {activeScreen === AppScreen.PrintSheet && (
            <PrintSheet
              config={config}
              setConfig={setConfig}
              generatedCards={generatedCards}
              onBackToGenerator={handleBackToGenerator}
              bingoName={bingoName}
              bingoLogo={bingoLogo}
            />
          )}

          {activeScreen === AppScreen.Settings && (
            <Settings
              onClearAllData={handleClearAllData}
              bingoName={bingoName}
              setBingoName={setBingoName}
              bingoLogo={bingoLogo}
              setBingoLogo={setBingoLogo}
              config={config}
              setConfig={setConfig}
              calledNumbers={calledNumbers}
              setCalledNumbers={setCalledNumbers}
              generatedCards={generatedCards}
              setGeneratedCards={setGeneratedCards}
            />
          )}

        </div>
      </main>
    </div>
  );
}
