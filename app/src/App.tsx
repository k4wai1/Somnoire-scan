import { useState } from 'react';
import { Video, Image as ImageIcon } from 'lucide-react';
import { useFFmpeg } from './useFFmpeg';
import { useImageLoader } from './useImageLoader';
import { useScanner } from './useScanner';
import { CropperModal } from './components/CropperModal';
import { LoadingScreen } from './components/LoadingScreen';
import { SettingsPanel } from './components/SettingsPanel';
import type { VideoResolution } from './useFFmpeg';
import type { CropArea } from './imageUtils';
import './App.css';

interface ScanResult {
  frame: number;
  images: Record<string, string>;
  texts: Record<string, string>;
  debugData: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[];
}

type SourceMode = 'video' | 'images' | null;

function App() {
  // Estados de configuración
  const [fps, setFps] = useState(5);
  const [threads, setThreads] = useState(1);
  const [resolution, setResolution] = useState<VideoResolution>('720');
  const [sourceMode, setSourceMode] = useState<SourceMode>(null);

  // Hooks de procesamiento
  const { loadFFmpeg, processVideo, isLoaded: isFFmpegLoaded, isProcessing: isFFmpegProcessing, progress: ffmpegProgress } = useFFmpeg();
  const { loadImages, isLoading: isLoadingImages } = useImageLoader();
  const { initScanner, processFrames, isScannerLoaded, scanProgress } = useScanner();

  // Estados de datos
  const [frames, setFrames] = useState<string[]>([]);
  const [showCropper, setShowCropper] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);

  // Estado de carga inicial
  const [isInitializing, setIsInitializing] = useState(false);

  const bootEngines = async () => {
    setIsInitializing(true);
    await Promise.all([loadFFmpeg(), initScanner()]);
    setIsInitializing(false);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResults([]);
    const extractedFrames = await processVideo(file, fps, resolution);
    if (extractedFrames.length > 0) {
      setFrames(extractedFrames);
      setShowCropper(true);
    }
  };

  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setResults([]);
    const loadedFrames = await loadImages(files);
    if (loadedFrames.length > 0) {
      setFrames(loadedFrames);
      setShowCropper(true);
    }
  };

  const handleCropConfirm = async (area: CropArea) => {
    setShowCropper(false);
    setIsScanning(true);
    const scanResults = await processFrames(frames, area, threads);
    setResults(scanResults);
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      {/* Loading Screen */}
      {isInitializing && <LoadingScreen message="Inicializando motores FFmpeg y Tesseract..." />}
      {isFFmpegProcessing && <LoadingScreen message="Extrayendo fotogramas del video..." progress={ffmpegProgress} />}
      {isLoadingImages && <LoadingScreen message="Cargando imágenes..." />}
      {isScanning && <LoadingScreen message="Ejecutando OCR en fotogramas..." progress={scanProgress} />}

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10 border-b border-gray-800 pb-6">
        <h1 className="text-5xl font-bold text-blue-400 mb-2">Somnoire Scan</h1>
        <p className="text-gray-400">Wuthering Waves - Echo Statistics Scanner</p>
      </header>

      <main className="max-w-7xl mx-auto grid gap-6">
        {/* Panel de inicialización */}
        {(!isFFmpegLoaded || !isScannerLoaded) && !isInitializing && (
          <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 text-center">
            <h2 className="text-2xl font-bold mb-4">Bienvenido</h2>
            <p className="text-gray-400 mb-6">Inicializa los motores de procesamiento para comenzar</p>
            <button
              onClick={bootEngines}
              className="px-8 py-4 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-500 transition-colors text-lg"
            >
              Iniciar Motores
            </button>
          </div>
        )}

        {/* Panel de selección de fuente */}
        {isFFmpegLoaded && isScannerLoaded && !sourceMode && (
          <>
			<SettingsPanel
			  fps={fps}
			  onFpsChange={setFps}
			  threads={threads}
			  onThreadsChange={setThreads}
			  resolution={resolution}
			  onResolutionChange={setResolution}
			/>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Opción: Video */}
              <label className="bg-gray-900 p-8 rounded-xl border-2 border-gray-800 hover:border-blue-500 cursor-pointer transition-all group">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    setSourceMode('video');
                    handleVideoUpload(e);
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-4">
                  <Video className="w-16 h-16 text-blue-400 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold">Subir Video</h3>
                  <p className="text-sm text-gray-400 text-center">
                    Extrae fotogramas automáticamente a {fps} FPS
                  </p>
                </div>
              </label>

              {/* Opción: Imágenes */}
              <label className="bg-gray-900 p-8 rounded-xl border-2 border-gray-800 hover:border-emerald-500 cursor-pointer transition-all group">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    setSourceMode('images');
                    handleImagesUpload(e);
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-4">
                  <ImageIcon className="w-16 h-16 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold">Subir Imágenes</h3>
                  <p className="text-sm text-gray-400 text-center">
                    Carga múltiples capturas de pantalla (misma resolución)
                  </p>
                </div>
              </label>
            </div>
          </>
        )}

        {/* Resultados */}
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
                    <img src={res.images.title} className="w-full h-8 object-contain bg-black rounded border border-gray-800" alt="Título" />
                    <p className="text-emerald-400 font-mono text-xs mt-1 truncate">{res.texts.title || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Nivel</span>
                    <img src={res.images.level} className="w-full h-8 object-contain bg-black rounded border border-gray-800" alt="Nivel" />
                    <p className="text-emerald-400 font-mono text-xs mt-1 text-center">{res.texts.level || '-'}</p>
                  </div>
                </div>

                {/* Main Stats */}
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                  <span className="text-[10px] uppercase tracking-wider text-blue-400 mb-2 block">Estadísticas Principales</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <img src={res.images.mainPercent} className="w-full h-8 object-contain bg-black rounded border border-gray-800" alt="Main %" />
                      <p className="text-blue-400 font-mono text-xs mt-1 text-center truncate">{res.texts.mainPercent || '-'}</p>
                    </div>
                    <div>
                      <img src={res.images.mainFlat} className="w-full h-8 object-contain bg-black rounded border border-gray-800" alt="Main Flat" />
                      <p className="text-blue-400 font-mono text-xs mt-1 text-center truncate">{res.texts.mainFlat || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Substats */}
                <div className="bg-gray-950 p-3 rounded-lg border border-emerald-900/50">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-2 block">Substats Detectados</span>
                  <img src={res.images.debug} className="w-full h-24 object-contain bg-black rounded mb-3 border border-emerald-900/30" alt="Substats" />
                  
                  <div className="flex flex-col gap-1">
                    {res.debugData.length === 0 ? (
                      <p className="text-gray-600 text-xs italic">Sin datos en este frame</p>
                    ) : (
                      res.debugData.map((line, lIdx) => (
                        <div key={lIdx} className="bg-gray-900/50 px-2 py-1 rounded border-l-2 border-emerald-500/30">
                          <span className="text-emerald-300 font-mono text-xs">{line.text}</span>
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

      {/* Cropper Modal */}
      {showCropper && (
        <CropperModal
          imageSrc={frames[0]}
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setShowCropper(false);
            setFrames([]);
            setSourceMode(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
