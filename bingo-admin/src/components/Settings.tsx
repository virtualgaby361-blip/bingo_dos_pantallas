/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { playTone } from '../utils';
import { Save, Volume2, ShieldCheck, Database, Sliders, Info, Trophy, Plus, Trash2, HelpCircle, DollarSign, Percent, Download, Upload, FileJson, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GeneratorConfig, Prize, BingoCard } from '../types';

interface SettingsProps {
  onClearAllData: () => void;
  bingoName: string;
  setBingoName: (val: string) => void;
  bingoLogo: string;
  setBingoLogo: (val: string) => void;
  config: GeneratorConfig;
  setConfig: (config: GeneratorConfig | ((prev: GeneratorConfig) => GeneratorConfig)) => void;
  calledNumbers: number[];
  setCalledNumbers: (nums: number[]) => void;
  generatedCards: BingoCard[];
  setGeneratedCards: (cards: BingoCard[]) => void;
}

export default function Settings({ 
  onClearAllData, 
  bingoName, 
  setBingoName, 
  bingoLogo, 
  setBingoLogo,
  config,
  setConfig,
  calledNumbers,
  setCalledNumbers,
  generatedCards,
  setGeneratedCards
}: SettingsProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [operatorName, setOperatorName] = useState("Admin User");
  const [eventTitle, setEventTitle] = useState("Gran Bingo de Fin de Año");
  const [autoVerify, setAutoVerify] = useState(true);

  // States for import feedback
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export State to JSON file
  const handleExportState = () => {
    try {
      playTone(520, 'sine', 0.1);
      setTimeout(() => playTone(650, 'sine', 0.1), 80);

      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        bingoName,
        bingoLogo,
        calledNumbers,
        generatedCards,
        config
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `bingo_respaldo_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Error al exportar:", e);
      setImportError("No se pudo exportar el estado actual del juego. Inténtalo de nuevo.");
      setTimeout(() => setImportError(null), 5000);
    }
  };

  // Import State from JSON file
  const handleImportState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const resultString = e.target?.result as string;
        const backupData = JSON.parse(resultString);

        // Basic validation
        if (!backupData || typeof backupData !== 'object') {
          throw new Error("El archivo no contiene un objeto JSON válido.");
        }

        // Validate structure or apply safe fallbacks
        const importedName = typeof backupData.bingoName === 'string' ? backupData.bingoName : 'Bingo Admin';
        const importedLogo = typeof backupData.bingoLogo === 'string' ? backupData.bingoLogo : 'B';
        const importedCalled = Array.isArray(backupData.calledNumbers) ? backupData.calledNumbers : [];
        const importedCards = Array.isArray(backupData.generatedCards) ? backupData.generatedCards : [];
        const importedConfig = backupData.config && typeof backupData.config === 'object' ? backupData.config : null;

        // Perform validation of called numbers (must be list of numbers)
        if (importedCalled.some((n: any) => typeof n !== 'number')) {
          throw new Error("El historial de bolillas contiene valores no numéricos.");
        }

        // Apply state updates
        setBingoName(importedName);
        setBingoLogo(importedLogo);
        setCalledNumbers(importedCalled);
        setGeneratedCards(importedCards);
        
        if (importedConfig) {
          setConfig(importedConfig);
          if (importedConfig.prizes) {
            setLocalPrizes(importedConfig.prizes);
          }
        }

        // Overwrite localStorage values explicitly to ensure immediate persistent overwrite
        localStorage.setItem('bingo_name', importedName);
        localStorage.setItem('bingo_logo', importedLogo);
        localStorage.setItem('bingo_called_numbers', JSON.stringify(importedCalled));
        localStorage.setItem('bingo_generated_cards', JSON.stringify(importedCards));
        if (importedConfig) {
          localStorage.setItem('bingo_generator_config', JSON.stringify(importedConfig));
        }

        // Positive feedback sounds
        playTone(600, 'sine', 0.1);
        setTimeout(() => playTone(800, 'sine', 0.12), 100);
        setTimeout(() => playTone(1000, 'sine', 0.15), 200);

        setImportSuccess(`¡Respaldo importado con éxito! Se cargaron ${importedCards.length} cartones y ${importedCalled.length} bolillas llamadas.`);
        setImportError(null);
        setTimeout(() => setImportSuccess(null), 6000);

        // Reset input value so same file can be uploaded again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err: any) {
        console.error("Error al importar:", err);
        playTone(220, 'sawtooth', 0.35);
        setImportError(`Error de importación: ${err.message || "Estructura de JSON inválida o corrupta."}`);
        setImportSuccess(null);
        setTimeout(() => setImportError(null), 6000);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      playTone(220, 'sawtooth', 0.35);
      setImportError("Error al leer el archivo de copia de seguridad.");
      setTimeout(() => setImportError(null), 5000);
    };

    reader.readAsText(file);
  };

  // Load prizes state locally so user can configure and hit "Save Configuration"
  const [localPrizes, setLocalPrizes] = useState<Prize[]>(config.prizes || []);

  const handleToggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      playTone(440, 'sine', 0.1);
    }
  };

  const handleAddField = () => {
    const newPrize: Prize = {
      id: String(Date.now()),
      name: `Premio ${localPrizes.length + 1}`,
      description: 'Premio al completar la condición',
      type: 'any_line',
      percentage: 15,
      isFixed: false,
      fixedAmount: 100
    };
    setLocalPrizes(prev => [...prev, newPrize]);
    playTone(600, 'sine', 0.1);
  };

  const handleDeletePrize = (id: string) => {
    setLocalPrizes(prev => prev.filter(p => p.id !== id));
    playTone(200, 'triangle', 0.15);
  };

  const handleUpdatePrize = (id: string, field: keyof Prize, value: any) => {
    setLocalPrizes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleRestoreDefaultPrizes = () => {
    if (confirm("¿Deseas restaurar la lista de premios predeterminada?")) {
      const defaultList: Prize[] = [
        {
          id: '1',
          name: 'Cartón Lleno (Completo)',
          description: 'Premio inmediato al primer cartón con todos los números tachados.',
          type: 'full_card',
          percentage: 40,
          isFixed: false,
          fixedAmount: 100
        },
        {
          id: '2',
          name: 'Palabra BINGO (Columna Completa)',
          description: 'Al completar una columna vertical entera (alguna letra de B-I-N-G-O).',
          type: 'palabra_bingo',
          percentage: 30,
          isFixed: false,
          fixedAmount: 70
        },
        {
          id: '3',
          name: 'Línea Horizontal',
          description: 'Al completar cualquier línea horizontal de 5 celdas.',
          type: 'horizontal_line',
          percentage: 20,
          isFixed: false,
          fixedAmount: 50
        },
        {
          id: '4',
          name: 'Cualquier Línea',
          description: 'Al completar cualquier fila, columna o diagonal.',
          type: 'any_line',
          percentage: 10,
          isFixed: false,
          fixedAmount: 20
        }
      ];
      setLocalPrizes(defaultList);
      playTone(500, 'sine', 0.12);
    }
  };

  const handleSave = () => {
    setConfig(prev => ({
      ...prev,
      prizes: localPrizes
    }));
    playTone(520, 'sine', 0.12);
    setTimeout(() => playTone(650, 'sine', 0.18), 80);
    alert("¡Configuración de sesión y premios guardada correctamente!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#170040] tracking-tight">Configuración Administrativa</h2>
          <p className="text-xs text-[#494550]">Parámetros globales y configuración de tabla de premios del sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-black text-emerald-600 uppercase tracking-widest font-mono">Cajero Activo (Sin login)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Side settings */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-[#170040] flex items-center gap-2 border-b border-gray-100 pb-3">
              <Sliders className="w-5 h-5 text-[#16a34a]" />
              <span>Ajustes Generales de la Sala</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Nombre del Bingo</label>
                <input
                  type="text"
                  value={bingoName}
                  onChange={(e) => setBingoName(e.target.value)}
                  className="w-full bg-[#f2f4f6] border border-gray-200 focus:border-[#16a34a] focus:bg-white text-sm font-bold text-[#170040] px-3.5 py-2.5 rounded-lg outline-none transition-all"
                  placeholder="Por ejemplo: Bingo Familiar, Bingo de la Amistad, Gran Bingo"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5 font-sans">Símbolo o Logo del Bingo</label>
                <input
                  type="text"
                  value={bingoLogo}
                  onChange={(e) => setBingoLogo(e.target.value)}
                  className="w-full bg-[#f2f4f6] border border-gray-200 focus:border-[#16a34a] focus:bg-white text-sm font-bold text-[#170040] px-3.5 py-2.5 rounded-lg outline-none transition-all"
                  placeholder="Ej. B, 🎯 o un enlace de imagen (https://...)"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Nombre del Operador</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-[#f2f4f6] border border-gray-200 focus:border-[#16a34a] focus:bg-white text-sm font-bold text-[#170040] px-3.5 py-2.5 rounded-lg outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Título del Evento por Defecto</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-[#f2f4f6] border border-gray-200 focus:border-[#16a34a] focus:bg-white text-sm font-bold text-[#170040] px-3.5 py-2.5 rounded-lg outline-none transition-all"
                />
              </div>

              {/* Configure ball spin speed slider/buttons */}
              <div className="md:col-span-2 pt-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 font-sans">Velocidad de Giro de la Esfera (Bolillero)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: 'Rápido (150ms)', value: 150 },
                    { label: 'Normal (300ms)', value: 300 },
                    { label: 'Lento (550ms)', value: 550 },
                    { label: 'Muy Lento (900ms)', value: 900 }
                  ].map((speedOpt) => (
                    <button
                      key={speedOpt.value}
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, spinDuration: speedOpt.value }));
                        playTone(speedOpt.value === 150 ? 600 : speedOpt.value === 300 ? 500 : 400, 'sine', 0.08);
                      }}
                      className={`py-2.5 px-3 border-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        (config.spinDuration || 300) === speedOpt.value
                          ? 'border-[#16a34a] bg-[#16a34a]/10 text-[#170040]'
                          : 'border-gray-200 text-[#494550] hover:border-gray-400 bg-white'
                      }`}
                    >
                      {speedOpt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  Ajusta la velocidad de rotación y el tiempo que tarda la esfera digital en detenerse para simular la tensión ideal en el sorteo de cada bolilla.
                </p>
              </div>

              {/* Auto-draw interval setting */}
              <div className="md:col-span-2 pt-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 font-sans">Intervalo de Tirado Automático (segundos)</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { label: 'Desactivado', value: 0 },
                    { label: '3 seg', value: 3 },
                    { label: '5 seg', value: 5 },
                    { label: '8 seg', value: 8 },
                    { label: '10 seg', value: 10 },
                    { label: '15 seg', value: 15 },
                    { label: '20 seg', value: 20 },
                    { label: '30 seg', value: 30 },
                    { label: '45 seg', value: 45 },
                    { label: '60 seg', value: 60 }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, autoDrawInterval: opt.value }));
                        playTone(opt.value === 0 ? 300 : 550, 'sine', 0.08);
                      }}
                      className={`py-2.5 px-3 border-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        (config.autoDrawInterval || 0) === opt.value
                          ? 'border-[#16a34a] bg-[#16a34a]/10 text-[#170040]'
                          : 'border-gray-200 text-[#494550] hover:border-gray-400 bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  Activa el tirado automático de bolillas. El sistema sacará una bolilla cada X segundos sin necesidad de hacer clic. Configura 0 para desactivar.
                </p>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span>Efectos de Sonido</span>
                  </span>
                  <p className="text-xs text-gray-400">Reproduce sonidos sintetizados al cantar balillas y ganar.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                    soundEnabled ? 'bg-[#16a34a]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <span>Auto-verificación</span>
                  </span>
                  <p className="text-xs text-gray-400">Verifica dinámicamente las combinaciones en segundo plano.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoVerify(!autoVerify)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                    autoVerify ? 'bg-[#16a34a]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoVerify ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* PRIZES MANAGEMENT IN SETTINGS */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#f2f4f6] p-4 rounded-xl border border-gray-150">
                <div>
                  <h4 className="text-sm font-black text-[#170040] uppercase tracking-wide flex items-center gap-2">
                    <Trophy className="w-4.5 h-4.5 text-yellow-500" />
                    Configuración de Premios (Premios 1, 2, 3...)
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">Define los premios que se mostrarán en la pizarra de control y sus montos.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultPrizes}
                    className="py-1.5 px-3 border border-gray-300 hover:border-gray-400 text-[#494550] bg-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Restaurar 3 Premios
                  </button>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="py-1.5 px-3 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir Premio
                  </button>
                </div>
              </div>

              {localPrizes.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-500">No hay premios configurados.</p>
                  <p className="text-xs text-gray-400 mt-1">Los premios aparecerán vacíos en el bolillero. Añade uno con el botón de arriba.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localPrizes.map((prize, idx) => (
                    <div 
                      key={prize.id} 
                      className="bg-[#fcfdfd] border border-gray-200 rounded-xl p-4 shadow-xs relative hover:border-[#16a34a]/30 transition-all space-y-4"
                    >
                      {/* Prize Header / Index and Delete */}
                      <div className="flex justify-between items-center bg-[#f2f4f6]/50 -mx-4 -mt-4 px-4 py-2.5 rounded-t-xl border-b border-gray-100">
                        <span className="text-xs font-black text-[#16a34a] uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-[#16a34a]/15 text-[#16a34a] flex items-center justify-center font-bold">{idx + 1}°</span>
                          Premio de la Sesión
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePrize(prize.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Eliminar Premio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Prize form rows */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Nombre del Premio</label>
                          <input
                            type="text"
                            value={prize.name}
                            onChange={(e) => handleUpdatePrize(prize.id, 'name', e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-[#16a34a] text-xs font-bold text-[#170040] px-3 py-2 rounded-lg outline-none transition-all"
                            placeholder="Ej. Cartón Lleno (Bingo), Línea Horizontal"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Tipo de Match</label>
                          <select
                            value={prize.type}
                            onChange={(e) => handleUpdatePrize(prize.id, 'type', e.target.value as any)}
                            className="w-full bg-white border border-gray-200 focus:border-[#16a34a] text-xs font-bold text-[#170040] px-3 py-2 rounded-lg outline-none transition-all"
                          >
                            <option value="full_card">Cartón Lleno (Completo)</option>
                            <option value="palabra_bingo">Palabra BINGO (Columna Completa)</option>
                            <option value="horizontal_line">Línea Horizontal (5 Celdas)</option>
                            <option value="any_line">Cualquier Línea (V, H o Diagonal)</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Descripción</label>
                          <input
                            type="text"
                            value={prize.description}
                            onChange={(e) => handleUpdatePrize(prize.id, 'description', e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-[#16a34a] text-xs font-semibold text-[#494550] px-3 py-2 rounded-lg outline-none transition-all"
                            placeholder="Instrucciones o detalles de ganar"
                          />
                        </div>

                        {/* Amount setup */}
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/50 p-2.5 rounded-lg border border-gray-150">
                          {/* Percent vs Fixed Toggle */}
                          <div className="space-y-1">
                            <span className="block text-[9px] font-black uppercase tracking-wider text-gray-400">Modo de Pago</span>
                            <div className="inline-flex rounded-lg p-0.5 bg-gray-250 border border-gray-200">
                              <button
                                type="button"
                                onClick={() => handleUpdatePrize(prize.id, 'isFixed', false)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${
                                  !prize.isFixed 
                                    ? 'bg-[#16a34a] text-white shadow-xs' 
                                    : 'text-[#494550] hover:text-[#170040]'
                                }`}
                              >
                                Porcentaje de Caja (Ventas)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdatePrize(prize.id, 'isFixed', true)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${
                                  prize.isFixed 
                                    ? 'bg-[#16a34a] text-white shadow-xs' 
                                    : 'text-[#494550] hover:text-[#170040]'
                                }`}
                              >
                                Monto Fijo (USD)
                              </button>
                            </div>
                          </div>

                          {/* The Value Box based on toggle */}
                          <div>
                            {!prize.isFixed ? (
                              <div>
                                <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                                  Porcentaje de Facturado (%)
                                  <Percent className="w-3 h-3 text-emerald-600" />
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={prize.percentage}
                                    onChange={(e) => handleUpdatePrize(prize.id, 'percentage', Math.max(1, Math.min(100, Number(e.target.value))))}
                                    className="w-full bg-white border border-gray-200 focus:border-[#16a34a] text-xs font-black text-[#170040] pl-3 pr-8 py-2 rounded-lg outline-none transition-all"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                                  Monto Fijo de Caja (USD)
                                  <DollarSign className="w-3 h-3 text-[#16a34a]" />
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={prize.fixedAmount || 0}
                                    onChange={(e) => handleUpdatePrize(prize.id, 'fixedAmount', Math.max(0, Number(e.target.value)))}
                                    className="w-full bg-white border border-gray-200 focus:border-[#16a34a] text-xs font-black text-[#170040] pl-6 pr-3 py-2 rounded-lg outline-none transition-all"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="py-3 px-6 bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-xs rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer transform active:scale-95 duration-100"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Configuración y Premios</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side instructions */}
        <div className="space-y-6">
          {/* Backup, Export & Import Game State section */}
          <div className="bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#170040] flex items-center gap-2 border-b border-gray-100 pb-2">
              <FileJson className="w-4.5 h-4.5 text-[#16a34a]" />
              <span>Copia de Seguridad</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Exporta toda la sesión actual (historial del bolillero, cartones generados y configuración) a un archivo o impórtalo para reanudar el juego en cualquier momento.
            </p>

            {/* Display feedback status messages if any */}
            {importSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{importSuccess}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-start gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{importError}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportState}
                className="w-full py-2.5 px-4 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer transform active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Respaldo (.json)</span>
              </button>

              {/* Import Trigger File selector */}
              <div className="relative">
                <input
                  type="file"
                  id="import-backup-file-input"
                  ref={fileInputRef}
                  onChange={handleImportState}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 border-2 border-dashed border-gray-200 hover:border-gray-400 text-[#494550] bg-gray-50 hover:bg-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span>Importar Respaldo (.json)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#170040] flex items-center gap-2 border-b border-gray-100 pb-2">
              <Database className="w-4 h-4 text-red-610" />
              <span>Zona de Peligro</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              La eliminación de base de datos local restablecerá el historial del bolillero, los precios configurados y revocará todos los cartones impresos.
            </p>
            <button
              type="button"
              onClick={() => {
                if(confirm("¿Estás seguro de que deseas restablecer el sistema? Esto borrará el bolillero actual y revocará todos los cartones generados de forma definitiva.")) {
                  onClearAllData();
                }
              }}
              className="w-full py-3 border-2 border-red-200 hover:border-red-400 font-bold text-xs text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
            >
              Restaurar Valores por Defecto
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm space-y-3">
            <h3 className="font-bold text-[#170040] text-xs uppercase tracking-wider flex items-center gap-2 mb-1 border-b border-gray-100 pb-2">
              <Info className="w-4 h-4 text-[#16a34a]" />
              <span>Sesión Cajero Admin</span>
            </h3>
            <div className="text-[11px] text-gray-500 space-y-2">
              <p>Bingo Admin Suite: <span className="font-bold text-[#170040]">v2.5.0</span></p>
              <p>Estado de Caja: <span className="text-emerald-600 font-bold">ABIERTO (S/ LOGEO)</span></p>
              <p>Ingresos Base: <span className="font-semibold text-gray-750">Recaudación guardada en local storage</span></p>
              <p className="text-[10px] text-gray-400 leading-snug">Para tu seguridad y rapidez operativa, no hay logins persistentes en esta pantalla. Todas tus configuraciones se guardan directamente en el navegador.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
