/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppScreen } from '../types';
import { LayoutDashboard, Layers, Settings, Plus, Monitor } from 'lucide-react';

interface SidebarProps {
  activeScreen: AppScreen;
  setActiveScreen: (screen: AppScreen) => void;
  onNewGame: () => void;
  bingoName: string;
  bingoLogo: string;
  onOpenSecondScreen: () => void;
}

export default function Sidebar({ activeScreen, setActiveScreen, onNewGame, bingoName, bingoLogo, onOpenSecondScreen }: SidebarProps) {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#f2f4f6] border-r border-[#cbc4d2]/30 flex flex-col p-8 z-50 justify-between">
      <div>
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            {bingoLogo ? (
              bingoLogo.startsWith('http') ? (
                <img
                  src={bingoLogo}
                  alt="Logo"
                  className="w-10 h-10 rounded-xl object-cover border border-[#cbc4d2]/40 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#16a34a] to-[#86efac] text-white font-black text-lg flex items-center justify-center shadow-xs">
                  {bingoLogo.slice(0, 2)}
                </div>
              )
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8a4cfc] to-[#6ffbbe] text-white font-black text-lg flex items-center justify-center shadow-xs">
                B
              </div>
            )}
            <div>
              <h1 className="text-xl font-extrabold text-[#170040] tracking-tight leading-snug line-clamp-1">{bingoName}</h1>
              <p className="text-[10px] text-[#494550] opacity-70 font-bold uppercase tracking-wider">Premium Suite</p>
            </div>
          </div>
        </div>
        
        <nav className="flex flex-col space-y-2">
          <button
            id="nav-control-panel"
            onClick={() => setActiveScreen(AppScreen.ControlPanel)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeScreen === AppScreen.ControlPanel
                ? 'bg-[#16a34a] text-[#fffbff] shadow-sm shadow-[#16a34a]/20'
                : 'text-[#494550] hover:bg-[#e6e8ea] hover:text-[#170040]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Control Panel</span>
          </button>
          
          <button
            id="nav-card-generator"
            onClick={() => setActiveScreen(AppScreen.CardGenerator)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeScreen === AppScreen.CardGenerator || activeScreen === AppScreen.GenerationProgress || activeScreen === AppScreen.PrintSheet
                ? 'bg-[#16a34a] text-[#fffbff] shadow-sm shadow-[#16a34a]/20'
                : 'text-[#494550] hover:bg-[#e6e8ea] hover:text-[#170040]'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Card Generator</span>
          </button>
          
          <button
            id="nav-settings"
            onClick={() => setActiveScreen(AppScreen.Settings)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeScreen === AppScreen.Settings
                ? 'bg-[#16a34a] text-[#fffbff] shadow-sm shadow-[#16a34a]/20'
                : 'text-[#494550] hover:bg-[#e6e8ea] hover:text-[#170040]'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>

          <button
            id="nav-second-screen"
            onClick={onOpenSecondScreen}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeScreen === AppScreen.SecondScreen
                ? 'bg-[#8a4cfc] text-[#fffbff] shadow-sm shadow-[#8a4cfc]/20'
                : 'text-[#494550] hover:bg-[#e6e8ea] hover:text-[#170040]'
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span>Pantalla 2</span>
          </button>
        </nav>
      </div>

      <div className="border-t border-[#cbc4d2] pt-6 space-y-6">
        {/* Apertura Cajero Admin (Sin Login) info panel with Animated Non-Person Avatar */}
        <div className="bg-white/50 border border-gray-250 p-3 rounded-xl shadow-xs">
          <div className="flex items-center gap-3">
            {/* Animated game-token/bolilla vector avatar - No Person */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#16a34a] to-[#4edea5] flex items-center justify-center text-white shrink-0 border border-white shadow-sm relative overflow-hidden animate-float">
              {/* Shining ray filters */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white animate-spin-slow" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
                <path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3H11a1.5 1.5 0 0 0 0 3h5" />
              </svg>
            </div>
            <div>
              <p className="font-extrabold text-xs text-[#170040] leading-tight">Caja Administrativa</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 font-mono leading-none">Turno Activo</span>
              </div>
            </div>
          </div>
        </div>
        
        <button
          id="btn-sidebar-new-game"
          onClick={onNewGame}
          className="w-full bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white hover:opacity-90 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-md hover:shadow-lg shadow-[#16a34a]/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Game</span>
        </button>
      </div>
    </aside>
  );
}
