import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Minus, Plus } from 'lucide-react';
import gridOverlay from '../assets/7x10.png';

interface CropperModalProps {
  imageSrc: string;
  onConfirm: (cropArea: { x: number; y: number; width: number; height: number; unit: '%' }) => void;
  onCancel: () => void;
}

export const CropperModal = ({ imageSrc, onConfirm, onCancel }: CropperModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, _croppedAreaPixels: Area) => {
    setCroppedAreaPercent(_croppedArea);
  }, []);

  const handleConfirm = () => {
    if (croppedAreaPercent) {
      onConfirm({
        x: croppedAreaPercent.x,
        y: croppedAreaPercent.y,
        width: croppedAreaPercent.width,
        height: croppedAreaPercent.height,
        unit: '%',
      });
    }
  };

  // Función auxiliar para manejar el zoom de los botones evitando errores de coma flotante en JS
  const handleZoomButton = (delta: number) => {
    setZoom(prev => {
      const newZoom = Number((prev + delta).toFixed(2));
      return Math.min(3, Math.max(1, newZoom));
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl flex flex-col h-[95vh] sm:h-[85vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-800 shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Calibración del Área de Escaneo</h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Ajusta la imagen para que el panel del Echo encaje perfectamente en la <span className="text-blue-400 font-bold">cuadrícula 7×10</span>.
          </p>
        </div>

        {/* Tips / Controles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 shrink-0 text-xs text-gray-400 bg-gray-950/50 items-center">
          <div className="bg-gray-800/50 rounded p-2 text-center flex items-center justify-center gap-2 h-full">
            🖐️ <span className="text-white">Arrastra</span> para mover
          </div>
          <div className="bg-gray-800/50 rounded p-2 text-center flex items-center justify-center gap-2 h-full">
            🔍 <span className="text-white">Rueda / Pellizco</span> para Zoom
          </div>
          
          {/* Contenedor de la barra de Zoom unificada a 0.01 */}
          <div className="col-span-2 flex items-center gap-2 px-2 sm:px-4 w-full">
            <span className="font-medium text-gray-300 shrink-0 min-w-[42px]">Zoom:</span>
            
            <button
              type="button"
              onClick={() => handleZoomButton(-0.01)}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700 shrink-0 select-none touch-manipulation"
              title="Reducir zoom"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.01}
              aria-label="Control de Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mx-1"
            />

            <button
              type="button"
              onClick={() => handleZoomButton(0.01)}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors border border-gray-700 shrink-0 select-none touch-manipulation"
              title="Aumentar zoom"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Área de trabajo */}
        <div className="relative flex-1 bg-black overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={7 / 10}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            style={{
              containerStyle: {
                backgroundColor: '#000',
              },
              cropAreaStyle: {
                backgroundImage: `url(${gridOverlay})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                border: '2px solid rgba(59, 130, 246, 0.9)',
                boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.85)',
                opacity: 0.9,
              },
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-800 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-gray-500 font-mono text-center sm:text-left">
            Resolución nativa manejada por react-easy-crop.<br/>
            Zoom actual: {zoom.toFixed(2)}x
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-6 py-3 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors"
            >
              Confirmar Área ✓
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
