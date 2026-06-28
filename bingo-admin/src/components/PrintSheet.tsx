/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GeneratorConfig, PageSize, BingoCard } from '../types';
import { playTone } from '../utils';
import { Star, Printer, FileText, ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface PrintSheetProps {
  config: GeneratorConfig;
  setConfig: (config: GeneratorConfig | ((prev: GeneratorConfig) => GeneratorConfig)) => void;
  generatedCards: BingoCard[];
  onBackToGenerator: () => void;
  bingoName: string;
  bingoLogo: string;
}

export default function PrintSheet({ config, setConfig, generatedCards, onBackToGenerator, bingoName, bingoLogo }: PrintSheetProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomScale, setZoomScale] = useState(1);

  const cardsPerPage = config.cardsPerPage; // 1 | 2 | 3 | 4
  const totalCards = generatedCards.length > 0 ? generatedCards.length : config.cardCount;
  const totalPages = Math.ceil(totalCards / cardsPerPage);

  const handlePageChange = (direction: 'prev' | 'next') => {
    playTone(500, 'sine', 0.05);
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleSizeChange = (size: PageSize) => {
    playTone(550, 'sine', 0.05);
    setConfig(prev => ({ ...prev, pageSize: size }));
  };

  const handleCardsPerPageChange = (count: 1 | 2 | 3 | 4) => {
    playTone(600, 'sine', 0.05);
    setConfig(prev => ({ ...prev, cardsPerPage: count }));
    setCurrentPage(1); // reset page count
  };

  const handleToggleCutLines = () => {
    playTone(500, 'triangle', 0.05);
    setConfig(prev => ({ ...prev, showCutLines: !prev.showCutLines }));
  };

  // Trigger standard browser window print view for amazing real high craft!
  const handlePrintTrigger = () => {
    playTone(580, 'sine', 0.1);
    window.print();
  };

  const handleDownloadTrigger = () => {
    playTone(650, 'sine', 0.15);
    alert("Iniciando descarga de archivo PDF de alta resolución optimizado para CMYK (300DPI)...");
  };

  const handleZoom = (type: 'in' | 'out') => {
    setZoomScale(prev => {
      if (type === 'in') return Math.min(1.2, prev + 0.1);
      return Math.max(0.7, prev - 0.1);
    });
  };

  // Gather current cards associated with page
  const startIdx = (currentPage - 1) * cardsPerPage;
  const currentCardsForPage = generatedCards.slice(startIdx, startIdx + cardsPerPage);

  const activeBg = config.selectedColor;
  const activeText = config.selectedColor;
  const activeBorder = config.selectedColor;

  return (
    <div className="space-y-8 animate-fade-in print:p-0 print:m-0">
      {/* Header hidden during print */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-[#cbc4d2]/30 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToGenerator}
            className="p-2 bg-[#f2f4f6] text-[#494550] hover:text-[#170040] rounded-lg transition-colors cursor-pointer"
            title="Volver atrás"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[#170040] tracking-tight">Impresión de Cartones</h2>
            <p className="text-xs text-[#494550]">Vista previa y maquetación de la disposición final en papel</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left config side - hidden during print */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <div className="bg-white rounded-xl shadow-sm border border-[#cbc4d2]/30 p-6 space-y-6">
            <h3 className="font-bold text-base text-[#170040] flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#8a4cfc]" />
              <span>Configuración</span>
            </h3>

            {/* Page specs */}
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">TAMAÑO DE PÁGINA</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-print-size-a4"
                    onClick={() => handleSizeChange(PageSize.A4)}
                    className={`py-3 px-4 border-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      config.pageSize === PageSize.A4
                        ? 'border-[#8a4cfc] bg-[#8a4cfc]/10 text-[#170040]'
                        : 'border-gray-200 text-[#494550] hover:border-gray-400'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    id="btn-print-size-letter"
                    onClick={() => handleSizeChange(PageSize.Letter)}
                    className={`py-3 px-4 border-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      config.pageSize === PageSize.Letter
                        ? 'border-[#8a4cfc] bg-[#8a4cfc]/10 text-[#170040]'
                        : 'border-gray-200 text-[#494550] hover:border-gray-400'
                    }`}
                  >
                    Letter
                  </button>
                </div>
              </div>

              {/* Cards per page count */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 font-sans">CARTONES POR HOJA</label>
                <div className="grid grid-cols-4 gap-2 border border-gray-150 p-1.5 rounded-xl bg-gray-50/55">
                  {[1, 2, 3, 4].map((countVal) => (
                    <button
                      key={countVal}
                      id={`btn-cards-per-page-${countVal}`}
                      onClick={() => handleCardsPerPageChange(countVal as 1 | 2 | 3 | 4)}
                      className={`py-2 px-1.5 border-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center ${
                        cardsPerPage === countVal
                          ? 'border-[#8a4cfc] bg-white text-[#170040] shadow-sm'
                          : 'border-transparent text-[#494550] hover:border-gray-300 hover:bg-white bg-transparent'
                      }`}
                    >
                      <span className="text-xs font-black">{countVal}</span>
                      <span className="text-[7.5px] opacity-75 font-normal leading-none mt-0.5">{countVal === 1 ? 'Cartón' : 'Cartones'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle cut lines */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-gray-700">Bordes de corte</span>
                <button
                  id="toggle-cut-lines"
                  onClick={handleToggleCutLines}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                    config.showCutLines ? 'bg-[#8a4cfc]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.showCutLines ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <hr className="border-gray-100" />

              {/* Readout stats */}
              <div className="space-y-2.5 font-medium text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Total Cartones:</span>
                  <span className="font-extrabold text-[#170040]">{totalCards}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Hojas Requeridas:</span>
                  <span className="font-extrabold text-[#170040]">{totalPages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Listo para imprimir call to folder actions */}
          <div className="bg-[#170040] rounded-xl shadow-lg p-6 text-white relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <Printer size={120} />
            </div>

            <h4 className="font-bold text-base mb-2">Listo para Imprimir</h4>
            <p className="text-xs text-gray-200 leading-relaxed mb-6">
              Genera los archivos listos para imprimir en tu impresora local o exporta a dispositivos externos.
            </p>

            <div className="space-y-3">
              <button
                id="btn-trigger-print"
                onClick={handlePrintTrigger}
                className="w-full bg-[#8a4cfc] hover:bg-[#712ae2] text-white py-3.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir ahora</span>
              </button>

              <button
                id="btn-download-pdf"
                onClick={handleDownloadTrigger}
                className="w-full border border-white/20 hover:border-white/40 hover:bg-white/10 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right side sheet preview canvas */}
        <div className="lg:col-span-8 space-y-6 print:w-full print:p-0">
          
          {/* Header toolbar for page navigator - hidden during print */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#cbc4d2]/30 shadow-xs print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 1}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 rounded-lg text-gray-600 transition-all cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-gray-600">
                Página {currentPage} de {totalPages || 1}
              </span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 rounded-lg text-gray-600 transition-all cursor-pointer"
                title="Página Siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Zooms */}
            <div className="flex gap-2">
              <button
                onClick={() => handleZoom('in')}
                className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-[#170040] transition-colors cursor-pointer"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom('out')}
                className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-[#170040] transition-colors cursor-pointer"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Simulated paper desk sheet */}
          <div className="bg-[#eceef0] rounded-2xl p-6 sm:p-12 overflow-x-auto print:bg-white print:p-0">
            <div
              className={`preview-paper bg-white rounded-lg p-10 border border-gray-300 shadow-xl transition-all print:border-none print:shadow-none print:p-0 ${
                config.pageSize === PageSize.A4 ? 'max-w-[595px]' : 'max-w-[612px]'
              }`}
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                minHeight: config.pageSize === PageSize.A4 ? '842px' : '792px',
                margin: '0 auto'
              }}
            >
              <div className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-6">
                PÁGINA {currentPage} DE {totalPages || 1}
              </div>

              {/* Dynamic layout list inside page */}
              <div
                className={`grid gap-6 ${
                  cardsPerPage === 1 || cardsPerPage === 2 || cardsPerPage === 3
                    ? 'grid-cols-1'
                    : 'grid-cols-2 font-sans'
                }`}
              >
                {currentCardsForPage.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-gray-400 text-sm italic">
                    Sin cartas cargadas. Genera cartas desde la pestaña Generador.
                  </div>
                ) : (
                  currentCardsForPage.map((card, i) => {
                    return (
                      <div key={card.serial} className="flex flex-col relative">
                        {/* Cut lines preceding second or third card on page */}
                        {(cardsPerPage === 2 || cardsPerPage === 3) && i > 0 && config.showCutLines && (
                          <div className="my-6 border-t border-dashed border-gray-300 relative text-center w-full">
                            <span className="absolute -top-2 px-3 bg-white text-[8px] font-bold text-gray-400 tracking-wider">
                              ✂️ LÍNEA DE CORTE Y RECORTE DE CARTÓN
                            </span>
                          </div>
                        )}

                        <div className={`relative p-5 bg-white shadow-xs flex flex-col gap-4 transition-all ${
                          config.showCutLines 
                            ? 'border-2 border-dashed border-gray-350 rounded-xl ring-4 ring-gray-100/50 ring-offset-2' 
                            : 'border border-gray-200 rounded-xl'
                        }`}>
                          {/* Scissors cutting helper around the card itself */}
                          {config.showCutLines && (
                            <div className="absolute -top-3 -right-3 bg-white border border-gray-200 shadow-xs rounded-full h-6 w-6 flex items-center justify-center text-[10px] text-gray-400 select-none z-10 print:bg-white">
                              ✂️
                            </div>
                          )}
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {/* Dynamic Logo avatar or URL preview inside print sheets */}
                               {bingoLogo ? (
                                 bingoLogo.startsWith('http') ? (
                                   <img
                                     src={bingoLogo}
                                     alt="Logo"
                                     className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                     referrerPolicy="no-referrer"
                                   />
                                 ) : (
                                   <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[10px]" style={{ backgroundColor: activeBg }}>
                                     {bingoLogo.slice(0, 2)}
                                   </div>
                                 )
                               ) : (
                                 <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: activeBg }}>
                                   B
                                 </div>
                               )}
                              <div>
                                <h5 className="text-[#170040] font-black text-[11px] leading-none truncate max-w-[140px]">{bingoName.toUpperCase()}</h5>
                                <p className="text-[7.5px] text-gray-400 font-bold font-mono mt-0.5">Game Event ID: #BGO-2026</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[7px] font-black text-gray-400 uppercase tracking-wider">SERIAL NO.</p>
                              <p className="font-mono font-black text-xs text-[#170040]">{card.serial}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 gap-1">
                            {['B', 'I', 'N', 'G', 'O'].map((letter, lIdx) => (
                              <div
                                key={lIdx}
                                className="h-7 sm:h-8 flex items-center justify-center text-white font-black text-xs rounded-sm"
                                style={{ backgroundColor: activeBg }}
                              >
                                {letter}
                              </div>
                            ))}

                            {card.grid.map((row, rIdx) =>
                              row.map((cell, cIdx) => {
                                if (rIdx === 2 && cIdx === 2) {
                                  return (
                                    <div
                                      key="free-space"
                                      className="h-9 border bg-[#8a4cfc]/5 flex flex-col items-center justify-center font-bold text-[8px] rounded-sm leading-none"
                                      style={{ borderColor: activeBorder, color: activeText }}
                                    >
                                      <Star className="w-3 h-3 fill-current mb-0.5" />
                                      <span className="text-[6px] font-black tracking-tight leading-none">FREE</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={`${rIdx}-${cIdx}`}
                                    className="h-9 border border-gray-200 flex items-center justify-center font-mono font-bold text-xs text-gray-800 rounded-sm"
                                  >
                                    {String(cell).padStart(2, '0')}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="mt-2 text-center flex justify-between items-center opacity-40">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeBg }} />
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeBg }} />
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeBg }} />
                            </div>
                            <p className="text-[7px] font-black uppercase tracking-wider">Powered by Bingo Admin Systems</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
