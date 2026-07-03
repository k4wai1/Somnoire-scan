import { Settings } from 'lucide-react';
import type { VideoResolution } from '../useFFmpeg';

interface SettingsPanelProps {
  fps: number;
  onFpsChange: (fps: number) => void;
  threads: number;
  onThreadsChange: (threads: number) => void;
  resolution: VideoResolution;
  onResolutionChange: (r: VideoResolution) => void;
}

const RESOLUTIONS: { value: VideoResolution; label: string; desc: string }[] = [
  { value: '480',      label: '480p',     desc: 'Rápido, poca memoria' },
  { value: '720',      label: '720p',     desc: 'Recomendado' },
  { value: '1080',     label: '1080p',    desc: 'Mayor detalle' },
  { value: 'original', label: 'Original', desc: 'Sin cambios' },
];

export const SettingsPanel = ({
  fps, onFpsChange,
  threads, onThreadsChange,
  resolution, onResolutionChange
}: SettingsPanelProps) => {
  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 mb-5">
        <Settings className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-blue-400">Configuración de Procesamiento</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* FPS */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Video Seek Rate
          </label>
          <input
            type="range" min="1" max="30" value={fps}
            onChange={(e) => onFpsChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 FPS</span>
            <span className="text-blue-400 font-bold">{fps} FPS</span>
            <span>30 FPS</span>
          </div>
        </div>

        {/* Threads */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Workers OCR Paralelos
          </label>
          <input
            type="range" min="1" max="10" value={threads}
            onChange={(e) => onThreadsChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span className="text-emerald-400 font-bold">{threads} Workers</span>
            <span>10</span>
          </div>
        </div>

        {/* Resolución */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Resolución de Extracción
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => onResolutionChange(r.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  resolution === r.value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="font-bold">{r.label}</div>
                <div className="text-[10px] opacity-70">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
