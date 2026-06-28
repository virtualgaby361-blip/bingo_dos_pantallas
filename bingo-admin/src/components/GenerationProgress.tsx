/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GeneratorConfig, BingoCard } from '../types';
import { playTone, generateBulkCards } from '../utils';
import { Sparkles, CheckCircle2, XCircle, ArrowRight, Loader2, Download } from 'lucide-react';

interface GenerationProgressProps {
  config: GeneratorConfig;
  onCancel: () => void;
  onComplete: (generatedCards: BingoCard[]) => void;
}

export default function GenerationProgress({ config, onCancel, onComplete }: GenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [generatedBatch, setGeneratedBatch] = useState<BingoCard[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(12); // seconds simulated countdown
  const startTimeStr = "09:41:02";

  // Simulate real-time progress calculations
  useEffect(() => {
    // Generate initial small cache of cards first
    const cards = generateBulkCards(config.cardCount, config.fromRange, config.toRange, 40592, config.freeSpaces ?? 1);
    setGeneratedBatch(cards);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        
        let increment = Math.floor(Math.random() * 8) + 6; // random steady steps
        let nextPercent = Math.min(100, prev + increment);
        
        // Play tick sounds on active progress increments
        playTone(700 + nextPercent * 3, 'sine', 0.05);

        const currentProcessed = Math.floor((nextPercent / 100) * config.cardCount);
        setProcessedCount(currentProcessed);
        
        const remainingSim = Math.max(0, Math.ceil(((100 - nextPercent) / 100) * 12));
        setTimeRemaining(remainingSim);

        if (nextPercent === 100) {
          clearInterval(interval);
          
          // Complete noise
          setTimeout(() => {
            playTone(440, 'sine', 0.15); // A4
            setTimeout(() => playTone(554.37, 'sine', 0.15), 100); // C#5
            setTimeout(() => playTone(659.25, 'sine', 0.25), 200); // E5
          }, 200);

          // Invoke callback with all generated cards
          onComplete(cards);
        }
        
        return nextPercent;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [config]);

  // Map chosen hex colors to readable names
  const getColorName = (hex: string) => {
    switch (hex) {
      case '#170040': return 'Dark Indigo';
      case '#8a4cfc': return 'Vibrant Purple';
      case '#00a06f': return 'Teal Green';
      case '#ba1a1a': return 'Crimson Red';
      case '#ea6c00': return 'Vibrant Orange';
      default: return 'Custom Tint';
    }
  };

  // Divide the batch to show active visible preview thumbnails
  // We'll show the thumbnails dynamically checking off as we reach their indices.
  const previewLimit = 12;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Active Generation Card banner with stats */}
      <section className="bg-white rounded-2xl shadow-sm border border-[#cbc4d2]/30 p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-black text-[#170040] flex items-center gap-2">
              <span>{progress < 100 ? 'Generando Cartones...' : 'Generación Completa!'}</span>
            </h2>
            <p className="text-sm text-[#494550]">
              {progress < 100
                ? 'El sistema está creando combinaciones garantizadas únicas para tu evento.'
                : 'Se han creado todas las combinaciones de manera exitosa.'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-extrabold text-[#170040] block">{progress}%</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              PROCESANDO {processedCount} DE {config.cardCount} CARTONES
            </span>
          </div>
        </div>

        {/* Progress Fill bar container */}
        <div className="relative w-full h-4 bg-[#eceef0] rounded-full overflow-hidden mb-4">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#170040] via-[#8a4cfc] to-[#6ffbbe] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs font-mono text-gray-400">
          <span>INICIO: {startTimeStr}</span>
          <span className="flex items-center gap-2">
            {progress < 100 ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>TIEMPO RESTANTE ESTIMADO: {timeRemaining}s</span>
              </>
            ) : (
              <span className="text-[#00a06f] font-bold">PROCESO FINALIZADO</span>
            )}
          </span>
        </div>
      </section>

      {/* Grid containing generation summaries on side, real time grid on other */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side summaries */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm flex flex-col justify-between h-full min-h-[400px]">
            <div>
              <h3 className="font-bold text-base text-[#170040] mb-6">Resumen de Generación</h3>
              <div className="space-y-4 font-medium text-sm">
                <div className="flex justify-between items-center py-2.5 border-b border-[#eceef0]">
                  <span className="text-gray-400">Total de Cartones</span>
                  <span className="font-bold text-[#170040]">{config.cardCount} Unidades</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-[#eceef0]">
                  <span className="text-gray-400">Rango de Números</span>
                  <span className="font-bold text-[#170040]">{config.fromRange} - {config.toRange}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-[#eceef0]">
                  <span className="text-gray-400">Tema de Color</span>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: config.selectedColor }} />
                    <span className="font-bold text-[#170040]">{getColorName(config.selectedColor)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-gray-400">Formato</span>
                  <span className="font-bold text-[#170040]">PDF High-Res (CMYK)</span>
                </div>
              </div>
            </div>

            {/* Actions sticky bottom */}
            <div className="space-y-3 mt-8">
              {progress === 100 ? (
                <button
                  id="btn-goto-printing"
                  onClick={() => onComplete(generatedBatch)}
                  className="w-full py-4 bg-[#8a4cfc] hover:bg-[#712ae2] text-white font-bold rounded-lg flex items-center justify-center gap-2.5 shadow-lg shadow-[#8a4cfc]/20 transition-all cursor-pointer"
                >
                  <span>Ir a Impresión</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-full h-[52px] bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-400 rounded-lg border border-dashed border-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Procesando combinaciones...</span>
                </div>
              )}

              <button
                id="btn-cancel-generation"
                onClick={onCancel}
                className="w-full py-3.5 border-2 border-red-200 hover:border-red-400 bg-white hover:bg-red-50 text-red-600 font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancelar Proceso</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side live miniature grid */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-base text-[#170040]">Vista Previa en Tiempo Real</h3>
              <span className="bg-[#e6e8ea] px-3.5 py-1.5 rounded-full text-[10px] font-black text-[#170040]/80">
                MOSTRANDO ÚLTIMOS {previewLimit}
              </span>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: previewLimit }).map((_, i) => {
                const targetPercentageStep = (i / previewLimit) * 100;
                const isGenerated = progress > targetPercentageStep;
                const isSpinning = progress >= targetPercentageStep - 4 && progress <= targetPercentageStep + 4;
                const cardIndex = Math.min(generatedBatch.length - 1, i);
                const card = generatedBatch[cardIndex];

                if (!isGenerated) {
                  // Skeleton state representing not generated yet
                  return (
                    <div key={i} className="bg-[#f2f4f6]/50 p-3 rounded-lg border border-dashed border-gray-200 flex flex-col justify-between h-[115px] opacity-40">
                      <div className="grid grid-cols-5 gap-1 opacity-20">
                        {Array.from({ length: 15 }).map((_, s) => (
                          <div key={s} className="h-2 bg-gray-400 rounded-sm" />
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-gray-400">
                        <span>#---</span>
                      </div>
                    </div>
                  );
                }

                if (isSpinning) {
                  // Active generation load item with spinner
                  return (
                    <div key={i} className="bg-white p-3 rounded-lg border-2 border-[#8a4cfc] flex flex-col justify-between h-[115px] relative overflow-hidden group">
                      <div className="grid grid-cols-5 gap-1 opacity-10">
                        {Array.from({ length: 15 }).map((_, s) => (
                          <div key={s} className="h-2 bg-[#8a4cfc] rounded-sm" />
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="w-5 h-5 text-[#8a4cfc] animate-spin" />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-[#8a4cfc]">
                        <span>#---</span>
                      </div>
                    </div>
                  );
                }

                // Checked solid generated card thumbnail
                return (
                  <div key={i} className="bg-[#f2f4f6] p-3 rounded-lg border border-gray-200 flex flex-col justify-between h-[115px] hover:border-[#8a4cfc] transition-colors">
                    {/* Tiny representation of the grid numbers */}
                    <div className="grid grid-cols-5 gap-0.5 text-[5px] font-bold font-mono text-gray-500 text-center select-none leading-none">
                      {card?.grid?.slice(0, 3)?.map((row, rIdx) =>
                        row.map((cell, cIdx) => (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className={`p-0.5 rounded-sm ${rIdx === 2 && cIdx === 2 ? 'bg-[#8a4cfc] text-white' : 'bg-white'}`}
                          >
                            {rIdx === 2 && cIdx === 2 ? '★' : cell}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#170040]">#{card?.serial || 'A-40500'}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00a06f]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic download banner shown at the bottom of thumbnail list */}
            <div className="mt-8 p-4 bg-[#eceef0] rounded-xl flex items-center gap-4 border border-[#cbc4d2]/30">
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Download className="w-5 h-5 text-[#8a4cfc]" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-[#170040]">
                  {progress < 100 ? 'Empaquetando Lote Final...' : 'Lote de Cartones Listo'}
                </h4>
                <div className="w-full h-1 bg-white/60 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full bg-[#8a4cfc] transition-all duration-300 ${progress < 100 ? 'animate-pulse' : ''}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <button
                disabled={progress < 100}
                onClick={() => onComplete(generatedBatch)}
                className="text-xs font-black text-[#8a4cfc] hover:underline disabled:opacity-40 disabled:hover:no-underline uppercase cursor-pointer"
              >
                Ver Carpeta
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
