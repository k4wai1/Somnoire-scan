import { useState, useRef } from 'react';
import ReactCrop, { type Crop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import gridOverlay from '../assets/7x10.png'; // Asegúrate de que esta imagen exista

interface CropperModalProps {
  imageSrc: string;
  onConfirm: (cropArea: PercentCrop) => void;
  onCancel: () => void;
}

export const CropperModal = ({ imageSrc, onConfirm, onCancel }: CropperModalProps) => {
  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 25, y: 15, width: 50, height: 71.4 });
  const [completedCrop, setCompletedCrop] = useState<PercentCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleConfirm = () => {
    if (completedCrop) onConfirm(completedCrop);
    else onConfirm(crop as PercentCrop);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full p-6 flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">Calibración del Escáner</h2>
        <div className="relative flex-1 bg-black rounded-lg flex justify-center min-h-[50vh]">
          <ReactCrop
            crop={crop}
            onChange={(c, percentCrop) => setCrop(percentCrop)}
            onComplete={(c, percentCrop) => setCompletedCrop(percentCrop)}
            aspect={7 / 10}
          >
            <div className="relative">
              <img ref={imgRef} src={imageSrc} alt="Frame 0" className="max-h-[60vh] object-contain" />
              <img src={gridOverlay} alt="grid" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none mix-blend-overlay" />
            </div>
          </ReactCrop>
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onCancel} className="px-6 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700">Cancelar</button>
          <button onClick={handleConfirm} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500">Confirmar Área</button>
        </div>
      </div>
    </div>
  );
};
