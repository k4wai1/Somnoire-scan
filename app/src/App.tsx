import { useState } from 'react';
import { useFFmpeg } from './useFFmpeg';
import { useScanner } from './useScanner';
import { CropperModal } from './components/CropperModal';
import type { CropArea } from './imageUtils';
import './App.css';

interface ScanResult { 
  frame: number; 
  images: Record<string, string>;
  texts: Record<string, string>;
  debugData: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[];
}

function App() {
  const { loadFFmpeg, processVideo, isLoaded, isProcessing, progress: ffmpegProgress } = useFFmpeg();
  const { initScanner, processFrames, isScannerLoaded, scanProgress } = useScanner();
  const [frames, setFrames] = useState<string[]>([]);
  const [showCropper, setShowCropper] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);

  const bootEngines = async () => { await loadFFmpeg(); await initScanner(); };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResults([]);
    const extractedFrames = await processVideo(file);
    if (extractedFrames.length > 0) { setFrames(extractedFrames); setShowCropper(true); }
  };

  const handleCropConfirm = async (area: any) => { 
    setShowCropper(false);
    setIsScanning(true);
    const scanResults = await processFrames(frames, area);
    setResults(scanResults);
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-10 border-b border-gray-800 pb-6">
        <h1 className="text-4xl font-bold text-blue-400">Somnoire Scan</h1>
      </header>
      <main className="max-w-7xl mx-auto grid gap-6">
        {(!isLoaded || !isScannerLoaded) ? (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 text-center">
            <button onClick={bootEngines} className="px-6 py-3 bg-blue-600 rounded text-white font-bold hover:bg-blue-500 transition-colors">
              Inicializar Motores Estándar
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <input type="file" accept="video/*" onChange={handleFileUpload} disabled={isProcessing || isScanning} className="text-gray-300" />
          </div>
        )}
        
        {isProcessing && <p className="text-blue-400 font-mono">🎞️ Procesando video con FFmpeg: {ffmpegProgress.toFixed(0)}%</p>}
        {isScanning && <p className="text-emerald-400 font-mono">🤖 Ejecutando lectura Tesseract: {scanProgress.toFixed(0)}%</p>}
        
        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
             {results.map((res, idx) => (
                <div key={idx} className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
                  <div className="border-b border-gray-800 pb-2 mb-2">
                    <span className="text-gray-500 font-mono text-sm">Fotograma #{res.frame}</span>
                  </div>

                  {/* Título y Nivel */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Nombre del Echo</span>
                      <img src={res.images.title} className="w-full h-8 object-contain bg-black rounded border border-gray-800" />
                      <p className="text-emerald-400 font-mono text-xs mt-1 truncate">{res.texts.title || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Nivel</span>
                      <img src={res.images.level} className="w-full h-8 object-contain bg-black rounded border border-gray-800" />
                      <p className="text-emerald-400 font-mono text-xs mt-1 text-center">+{res.texts.level || '-'}</p>
                    </div>
                  </div>

                  {/* Panel de Main Stats Corregido */}
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                    <span className="text-[10px] uppercase tracking-wider text-blue-400 mb-2 block">Estadísticas Principales</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <img src={res.images.mainPercent} className="w-full h-8 object-contain bg-black rounded border border-gray-800" />
                        <p className="text-blue-400 font-mono text-xs mt-1 text-center truncate">{res.texts.mainPercent || '-'}</p>
                      </div>
                      <div>
                        <img src={res.images.mainFlat} className="w-full h-8 object-contain bg-black rounded border border-gray-800" />
                        <p className="text-blue-400 font-mono text-xs mt-1 text-center truncate">{res.texts.mainFlat || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Panel de Debug de Substats con las Coordenadas BBox de las Líneas */}
                  <div className="bg-gray-950 p-3 rounded-lg border border-red-900/50">
                     <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold mb-2 block">Líneas en Cuadrícula Debug 11x10.5</span>
                     <img src={res.images.debug} className="w-full h-24 object-contain bg-black rounded mb-3 border border-red-900/30" />
                     
                     <div className="flex flex-col gap-2">
                       {res.debugData.length === 0 ? (
                          <p className="text-gray-600 text-xs italic">Ninguna línea segmentada en este frame.</p>
                       ) : (
                          res.debugData.map((line, lIdx) => (
                            <div key={lIdx} className="flex flex-col border-l-2 border-red-500/30 pl-2">
                              <span className="text-emerald-300 font-mono text-xs">"{line.text}"</span>
                              <span className="text-gray-500 font-mono text-[9px] mt-0.5">
                                Región BBox: [X₀: {Math.round(line.bbox.x0)} Y₀: {Math.round(line.bbox.y0)}] → [X₁: {Math.round(line.bbox.x1)} Y₁: {Math.round(line.bbox.y1)}]
                              </span>
                            </div>
                          ))
                       )}
                     </div>
                  </div>

                </div>
             ))}
          </div>
        )}
      </main>
      {showCropper && <CropperModal imageSrc={frames[0]} onConfirm={handleCropConfirm} onCancel={() => { setShowCropper(false); setFrames([]); }} />}
    </div>
  );
}

export default App;
