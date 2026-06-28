/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GeneratorConfig, PageSize } from '../types';
import { playTone, generateBingoCard } from '../utils';
import { Star, Settings2, Printer, Sparkles, BookOpen, Layers } from 'lucide-react';

interface CardGeneratorProps {
  config: GeneratorConfig;
  setConfig: (config: GeneratorConfig | ((prev: GeneratorConfig) => GeneratorConfig)) => void;
  onStartGeneration: () => void;
  bingoName: string;
  bingoLogo: string;
}

export default function CardGenerator({ config, setConfig, onStartGeneration, bingoName, bingoLogo }: CardGeneratorProps) {
  const [localFrom, setLocalFrom] = useState(String(config.fromRange));
  const [localTo, setLocalTo] = useState(String(config.toRange));
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Local temporary preview card
  const [previewCard, setPreviewCard] = useState(() => generateBingoCard(config.fromRange, config.toRange, 'A-248-A9', config.freeSpaces ?? 1));

  const colorOptions = [
    { name: 'Verde (Clásico)', value: '#22c55e', textClass: 'text-[#22c55e]', bgClass: 'bg-[#22c55e]', borderClass: 'border-[#22c55e]' },
    { name: 'Verde Claro', value: '#4edea5', textClass: 'text-[#4edea5]', bgClass: 'bg-[#4edea5]', borderClass: 'border-[#4edea5]' },
    { name: 'Dark Purple', value: '#170040', textClass: 'text-[#170040]', bgClass: 'bg-[#170040]', borderClass: 'border-[#170040]' },
    { name: 'Vibrant Purple', value: '#8a4cfc', textClass: 'text-[#8a4cfc]', bgClass: 'bg-[#8a4cfc]', borderClass: 'border-[#8a4cfc]' },
    { name: 'Teal Green', value: '#00a06f', textClass: 'text-[#00a06f]', bgClass: 'bg-[#00a06f]', borderClass: 'border-[#00a06f]' },
    { name: 'Crimson Red', value: '#ba1a1a', textClass: 'text-[#ba1a1a]', bgClass: 'bg-[#ba1a1a]', borderClass: 'border-[#ba1a1a]' },
    { name: 'Vibrant Orange', value: '#ea6c00', textClass: 'text-[#ea6c00]', bgClass: 'bg-[#ea6c00]', borderClass: 'border-[#ea6c00]' }
  ];

  const handleColorChange = (colorValue: string) => {
    setConfig(prev => ({ ...prev, selectedColor: colorValue }));
    playTone(550, 'sine', 0.08);
  };

  const handleConfigChange = (key: keyof GeneratorConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleLocalRangeChange = (field: 'from' | 'to', value: string) => {
    if (field === 'from') {
      setLocalFrom(value);
      const parsedFrom = parseInt(value, 10);
      const parsedTo = parseInt(localTo, 10);
      if (!isNaN(parsedFrom) && !isNaN(parsedTo) && parsedFrom > 0 && parsedTo >= parsedFrom + 24) {
        setRangeError(null);
        setConfig(prev => ({ ...prev, fromRange: parsedFrom, toRange: parsedTo }));
        try {
          setPreviewCard(generateBingoCard(parsedFrom, parsedTo, 'A-248-A9', config.freeSpaces ?? 1));
        } catch(e) {}
      } else {
        if (isNaN(parsedFrom)) {
          setRangeError("Indica un número válido.");
        } else if (parsedFrom < 1) {
          setRangeError("El rango DESDE debe ser como mínimo 1.");
        } else if (parsedTo < parsedFrom + 24) {
          setRangeError(`Rango insuficiente para bingo (mínimo 25 números, actual: ${parsedTo - parsedFrom + 1}).`);
        }
      }
    } else {
      setLocalTo(value);
      const parsedFrom = parseInt(localFrom, 10);
      const parsedTo = parseInt(value, 10);
      if (!isNaN(parsedFrom) && !isNaN(parsedTo) && parsedFrom > 0 && parsedTo >= parsedFrom + 24) {
        setRangeError(null);
        setConfig(prev => ({ ...prev, fromRange: parsedFrom, toRange: parsedTo }));
        try {
          setPreviewCard(generateBingoCard(parsedFrom, parsedTo, 'A-248-A9', config.freeSpaces ?? 1));
        } catch(e) {}
      } else {
        if (isNaN(parsedTo)) {
          setRangeError("Indica un número válido.");
        } else if (parsedTo < parsedFrom + 24) {
          setRangeError(`Rango insuficiente para bingo (mínimo 25 números, actual: ${parsedTo - parsedFrom + 1}).`);
        }
      }
    }
  };

  const handleRangeBlur = () => {
    let fVal = parseInt(localFrom, 10);
    let tVal = parseInt(localTo, 10);

    if (isNaN(fVal) || fVal < 1) {
      fVal = 1;
    }
    if (isNaN(tVal) || tVal < fVal + 24) {
      tVal = fVal + 74; // Default standard range
    }

    setLocalFrom(String(fVal));
    setLocalTo(String(tVal));
    setRangeError(null);
    setConfig(prev => ({ ...prev, fromRange: fVal, toRange: tVal }));
    try {
      setPreviewCard(generateBingoCard(fVal, tVal, 'A-248-A9', config.freeSpaces ?? 1));
    } catch(e) {}
  };

  const handleInitiate = () => {
    let fVal = parseInt(localFrom, 10);
    let tVal = parseInt(localTo, 10);

    if (isNaN(fVal) || fVal < 1 || isNaN(tVal) || tVal < fVal + 24) {
      alert("Por favor establece un rango numérico de bingo válido de al menos 25 números de diferencia.");
      return;
    }

    setConfig(prev => ({ ...prev, fromRange: fVal, toRange: tVal }));
    playTone(600, 'sine', 0.1);
    setTimeout(() => playTone(800, 'sine', 0.2), 100);
    onStartGeneration();
  };

  const activeColorObj = colorOptions.find(c => c.value === config.selectedColor) || null;
  const selectedColor = config.selectedColor;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header with Output Type */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm">
        <div>
          <h2 className="text-3xl font-extrabold text-[#170040] tracking-tight">Generador de Cartones</h2>
          <p className="text-sm text-[#494550] max-w-2xl mt-1">
            Diseña y personaliza tus cartones de bingo profesionales. Ajusta los rangos numéricos y la estética visual antes de generar el archivo de impresión de alta calidad.
          </p>
        </div>

        {/* Small output type badge box */}
        <div className="flex items-center gap-3 bg-[#f2f4f6] px-5 py-3 rounded-xl border border-gray-100">
          <div className="p-2.5 rounded-lg bg-[#8a4cfc] text-white">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#494550]">TIPO DE SALIDA</p>
            <p className="text-xs font-bold text-[#170040]">PDF Alta Resolución</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column configuration */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#cbc4d2]/30 p-6 space-y-6">
            <h3 className="font-bold text-base text-[#170040] flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#8a4cfc]" />
              <span>Configuración</span>
            </h3>

            <div className="space-y-5">
              {/* Range settings DESDE / HASTA */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">DESDE</label>
                    <input
                      id="input-range-from"
                      type="number"
                      value={localFrom}
                      onChange={(e) => handleLocalRangeChange('from', e.target.value)}
                      onBlur={handleRangeBlur}
                      className="w-full bg-[#f2f4f6] border border-gray-200 focus:border-[#8a4cfc] focus:bg-white text-sm font-bold text-[#170040] px-3.5 py-2.5 rounded-lg outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">HASTA</label>
                    <input
                      id="input-range-to"
                      type="number"
                      value={localTo}
                      onChange={(e) => handleLocalRangeChange('to', e.target.value)}
                      onBlur={handleRangeBlur}
                      className="w-full bg-[#f2f4f6] border border-gray-200 focus:border-[#8a4cfc] focus:bg-white text-sm font-bold text-[#170040] px-3.5 py-2.5 rounded-lg outline-none transition-all"
                    />
                  </div>
                </div>
                {rangeError && (
                  <p className="text-[10px] text-red-500 font-bold tracking-tight bg-red-50 border border-red-200 text-center rounded-md py-1 px-2.5 mt-1">
                    {rangeError}
                  </p>
                )}
              </div>

              {/* Color selection circles row */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">SELECCIONAR COLOR</label>
                <div className="flex items-center gap-3">
                  {colorOptions.map((c, i) => {
                    const isSelected = config.selectedColor === c.value;
                    return (
                      <button
                        key={i}
                        id={`btn-color-select-${i}`}
                        onClick={() => handleColorChange(c.value)}
                        className={`w-8 h-8 rounded-full ${c.bgClass} cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-4 ring-offset-2 ring-[#8a4cfc] scale-110'
                            : 'hover:scale-[1.08] focus:outline-none'
                        }`}
                        title={c.name}
                      />
                    );
                  })}
                  {/* Custom color picker */}
                  <label
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all border-2 border-dashed border-gray-300 hover:border-gray-500 flex items-center justify-center overflow-hidden relative ${
                      !colorOptions.some(c => c.value === config.selectedColor)
                        ? 'ring-4 ring-offset-2 ring-[#8a4cfc] scale-110'
                        : 'hover:scale-[1.08]'
                    }`}
                    title="Color personalizado"
                    style={{
                      backgroundColor: !colorOptions.some(c => c.value === config.selectedColor) ? config.selectedColor : undefined
                    }}
                  >
                    <input
                      type="color"
                      value={config.selectedColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {colorOptions.some(c => c.value === config.selectedColor) && (
                      <span className="text-gray-400 text-xs font-bold">+</span>
                    )}
                  </label>
                </div>
              </div>

              {/* Dropdown for bulk counts */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">CANTIDAD DE CARTONES</label>
                <select
                  id="select-card-count"
                  value={config.cardCount}
                  onChange={(e) => handleConfigChange('cardCount', Number(e.target.value))}
                  className="w-full bg-[#f2f4f6] border border-gray-200 focus:border-[#8a4cfc] focus:bg-white text-sm font-bold text-[#170040] px-3.5 py-3 rounded-lg outline-none transition-all cursor-pointer"
                >
                  <option value={10}>10 Cartones</option>
                  <option value={20}>20 Cartones</option>
                  <option value={30}>30 Cartones</option>
                  <option value={50}>50 Cartones</option>
                  <option value={100}>100 Cartones</option>
                  <option value={120}>120 Cartones</option>
                  <option value={200}>200 Cartones</option>
                  <option value={500}>500 Cartones</option>
                </select>
              </div>

              {/* Free spaces (comodines) per card */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">COMODINES POR CARTÓN</label>
                <select
                  id="select-free-spaces"
                  value={config.freeSpaces ?? 1}
                  onChange={(e) => handleConfigChange('freeSpaces', Number(e.target.value))}
                  className="w-full bg-[#f2f4f6] border border-gray-200 focus:border-[#8a4cfc] focus:bg-white text-sm font-bold text-[#170040] px-3.5 py-3 rounded-lg outline-none transition-all cursor-pointer"
                >
                  <option value={0}>0 - Sin comodines</option>
                  <option value={1}>1 - Centro (clásico)</option>
                  <option value={2}>2 - Comodines</option>
                  <option value={3}>3 - Comodines</option>
                  <option value={4}>4 - Comodines</option>
                  <option value={5}>5 - Comodines</option>
                </select>
                <p className="text-[9px] text-gray-400 mt-1">Casillas marcadas gratis al inicio. El clásico tiene 1 (centro).</p>
              </div>

              {/* Action trigger button */}
              <button
                id="btn-generate-cards"
                onClick={handleInitiate}
                className="w-full py-4 mt-2 bg-[#8a4cfc] hover:bg-[#712ae2] text-white font-bold rounded-lg flex items-center justify-center gap-2.5 shadow-lg shadow-[#8a4cfc]/20 transition-all duration-200 active:scale-[0.98] cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>Generar e Imprimir</span>
              </button>
            </div>
          </div>

          {/* TRUCO PRO card styled exactly like the original mockup */}
          <div className="rounded-xl shadow-lg p-6 bg-gradient-to-br from-[#170040] via-[#2e1065] to-[#8a4cfc] text-white relative overflow-hidden group">
            {/* Ambient vector detail */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <Star className="w-full h-full fill-current" />
            </div>

            <div className="relative z-10 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#d1bcff]">TRUCO PRO</span>
              <h4 className="text-base font-bold tracking-tight">Impresión en Cartulina</h4>
              <p className="text-xs text-gray-300 leading-relaxed font-normal">
                Para una experiencia premium, utiliza papel de <strong>200g/m² con acabado mate</strong>. Esto evita molestos reflejos bajo las luces intensas del evento de juego.
              </p>
            </div>
          </div>
        </div>

        {/* Right column preview card */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#eceef0]/60 p-8 sm:p-12 rounded-2xl border border-[#cbc4d2]/30 flex flex-col items-center justify-center">
            
            {/* The single grand preview bingo card */}
            <div className="w-full max-w-[380px] bg-white rounded-2xl p-6 shadow-xl border border-gray-200 transition-all transform hover:scale-[1.01]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {/* Styled Bingo Token Logo element or image link */}
                  {bingoLogo ? (
                    bingoLogo.startsWith('http') ? (
                      <img
                        src={bingoLogo}
                        alt="Logo"
                        className="w-8 h-8 rounded-full object-cover border border-gray-250 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: selectedColor }}>
                        {bingoLogo.slice(0, 2)}
                      </div>
                    )
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: selectedColor }}>
                      B
                    </div>
                  )}
                  <div>
                    <h5 className="text-[#170040] font-black tracking-tight text-xs truncate max-w-[160px]">{bingoName.toUpperCase()}</h5>
                    <p className="text-[9px] text-gray-400 font-bold font-mono">Game Event ID: #BGO-2026</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">SERIAL</p>
                  <p className="text-xs font-mono font-black text-gray-700">#248-A9</p>
                </div>
              </div>

              {/* 5x5 Bingo Grid representation */}
              <div className="grid grid-cols-5 gap-1.5">
                {/* Header columns */}
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                  <div
                    key={i}
                    className="h-9 flex items-center justify-center text-white font-black text-base rounded-md tracking-tight"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {letter}
                  </div>
                ))}

                {/* Grid Numbers Cells */}
                {previewCard.grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    if (rowIndex === 2 && colIndex === 2) {
                      // FREE star element in center
                      return (
                        <div
                          key="free"
                          className="h-11 sm:h-12 border-2 bg-gradient-to-tr from-white to-[#f2f4f6] flex flex-col items-center justify-center font-extrabold text-[9px] rounded-md text-center leading-none"
                          style={{ borderColor: selectedColor, color: selectedColor }}
                        >
                          <Star className="w-3.5 h-3.5 fill-current mb-0.5" />
                          <span className="text-[7px] font-black tracking-tighter uppercase">FREE</span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="h-11 sm:h-12 border border-gray-200 flex items-center justify-center font-bold text-sm text-gray-800 rounded-md font-mono"
                      >
                        {String(cell).padStart(2, '0')}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Card Footer nodes */}
              <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex justify-between items-center opacity-70">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedColor }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedColor }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedColor }} />
                </div>
                <p className="text-[7px] font-black uppercase tracking-widest text-gray-400">PREMIUM BINGO ENGINE V2.4</p>
                <p className="text-[7px] font-black uppercase tracking-widest text-[#170040]">LICENSED TO BINGO ADMIN</p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Soporte de Papel node */}
            <div className="bg-white p-5 rounded-xl border border-[#cbc4d2]/30 flex items-center gap-4 shadow-sm">
              <div className="shrink-0 w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#170040]" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#170040]">Soporte de Papel</h4>
                <p className="text-xs text-[#494550] mt-0.5 leading-relaxed">
                  Nuestros archivos de salida generados están optimizados para el formato <strong>CMYK</strong> y sangrado de 3mm listo para imprentas profesionales.
                </p>
              </div>
            </div>

            {/* Pre-procesamiento node */}
            <div className="bg-white p-5 rounded-xl border border-[#cbc4d2]/30 flex items-center gap-4 shadow-sm">
              <div className="shrink-0 w-12 h-12 rounded-lg bg-[#eceef0] flex items-center justify-center text-emerald-600">
                <Layers className="w-6 h-6 text-[#00a06f]" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#170040]">Pre-procesamiento</h4>
                <p className="text-xs text-[#494550] mt-0.5 leading-relaxed">
                  Cada cartón es estrictamente único. Nuestro riguroso algoritmo evita duplicados de orden aleatorio en un <strong>100% de los casos</strong>.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
