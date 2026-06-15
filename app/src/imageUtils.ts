export interface CropArea {
  unit: '%' | 'px';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridRegion {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  targetHexes: string[]; 
  tolerance?: number; 
}

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return { 
    r: (bigint >> 16) & 255, 
    g: (bigint >> 8) & 255, 
    b: bigint & 255 
  };
};

const isPixelMatching = (r: number, g: number, b: number, hexColors: string[], tolerance = 35) => {
  for (const hex of hexColors) {
    const target = hexToRgb(hex);
    if (
      Math.abs(r - target.r) <= tolerance &&
      Math.abs(g - target.g) <= tolerance &&
      Math.abs(b - target.b) <= tolerance
    ) {
      return true; 
    }
  }
  return false;
};

export const extractGridRegion = (
  imageSrc: string,
  userCrop: CropArea,
  grid: GridRegion
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      // --- PASO 1: CÁLCULO DE COORDENADAS ORIGINALES ---
      const echoX = (userCrop.x / 100) * img.width;
      const echoY = (userCrop.y / 100) * img.height;
      const echoW = (userCrop.width / 100) * img.width;
      const echoH = (userCrop.height / 100) * img.height;

      const targetX = echoX + (grid.x1 / 14) * echoW;
      const targetY = echoY + (grid.y1 / 20) * echoH;
      const targetW = ((grid.x2 - grid.x1) / 14) * echoW;
      const targetH = ((grid.y2 - grid.y1) / 20) * echoH;

      // --- PASO 2: CANVAS 1 - BINARIZACIÓN INVERSA ---
      const canvas1 = document.createElement("canvas");
      canvas1.width = targetW;
      canvas1.height = targetH;
      const ctx1 = canvas1.getContext("2d", { willReadFrequently: true });
      
      if (!ctx1) return reject(new Error("Error Canvas 1 2D"));

      // Forzamos fondo blanco opaco inicial
      ctx1.fillStyle = "#FFFFFF";
      ctx1.fillRect(0, 0, targetW, targetH);

      // Dibujamos el recorte original
      ctx1.drawImage(img, targetX, targetY, targetW, targetH, 0, 0, targetW, targetH);

      const imageData = ctx1.getImageData(0, 0, targetW, targetH);
      const data = imageData.data;

      // Binarización: Tinta negra, Papel blanco (Opaco)
      for (let i = 0; i < data.length; i += 4) {
        if (isPixelMatching(data[i], data[i + 1], data[i + 2], grid.targetHexes, grid.tolerance || 35)) {
          // Letra -> NEGRO OPACO
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
        } else {
          // Fondo -> BLANCO OPACO
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255; 
        }
      }
      ctx1.putImageData(imageData, 0, 0);

      // --- PASO 3: CANVAS 2 - PADDING Y UPSCALE ---
      const paddingRaw = 15; 
      const scale = 2;

      const finalW = (targetW + (2 * paddingRaw)) * scale;
      const finalH = (targetH + (2 * paddingRaw)) * scale;
      
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = finalW;
      finalCanvas.height = finalH;
      const finalCtx = finalCanvas.getContext("2d");
      
      if (!finalCtx) return reject(new Error("Error Final Canvas 2D"));

      // Fondo blanco opaco
      finalCtx.fillStyle = "#FFFFFF";
      finalCtx.fillRect(0, 0, finalW, finalH);

      // Desactivar suavizado
      finalCtx.imageSmoothingEnabled = false;

      // Estampar canvas1 centrado con padding y escalado
      const destX = paddingRaw * scale;
      const destY = paddingRaw * scale;
      const destW = targetW * scale;
      const destH = targetH * scale;

      finalCtx.drawImage(
        canvas1,
        0, 0, targetW, targetH,
        destX, destY, destW, destH
      );

      // Exportar como JPEG (sin transparencia)
      resolve(finalCanvas.toDataURL("image/jpeg", 0.9));
    };
    
    img.onerror = () => reject(new Error("Error cargando el frame de video."));
    img.src = imageSrc;
  });
};

// Variante especializada para regiones muy pequeñas (nivel, costo)
export const extractGridRegionSmall = (
  imageSrc: string,
  userCrop: CropArea,
  grid: GridRegion
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const echoX = (userCrop.x / 100) * img.width;
      const echoY = (userCrop.y / 100) * img.height;
      const echoW = (userCrop.width / 100) * img.width;
      const echoH = (userCrop.height / 100) * img.height;

      const targetX = echoX + (grid.x1 / 14) * echoW;
      const targetY = echoY + (grid.y1 / 20) * echoH;
      const targetW = ((grid.x2 - grid.x1) / 14) * echoW;
      const targetH = ((grid.y2 - grid.y1) / 20) * echoH;

      // Canvas 1: Binarización
      const canvas1 = document.createElement("canvas");
      canvas1.width = targetW;
      canvas1.height = targetH;
      const ctx1 = canvas1.getContext("2d", { willReadFrequently: true });
      
      if (!ctx1) return reject(new Error("Error Canvas 1 2D"));

      ctx1.fillStyle = "#FFFFFF";
      ctx1.fillRect(0, 0, targetW, targetH);
      ctx1.drawImage(img, targetX, targetY, targetW, targetH, 0, 0, targetW, targetH);

      const imageData = ctx1.getImageData(0, 0, targetW, targetH);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        if (isPixelMatching(data[i], data[i + 1], data[i + 2], grid.targetHexes, grid.tolerance || 35)) {
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
        } else {
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255; 
        }
      }
      ctx1.putImageData(imageData, 0, 0);

      // Canvas 2: PADDING AGRESIVO Y UPSCALE 4X PARA REGIONES PEQUEÑAS
      const paddingRaw = 30; // ⭐ 30px en lugar de 15px
      const scale = 4;        // ⭐ 4x en lugar de 2x

      const finalW = (targetW + (2 * paddingRaw)) * scale;
      const finalH = (targetH + (2 * paddingRaw)) * scale;
      
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = finalW;
      finalCanvas.height = finalH;
      const finalCtx = finalCanvas.getContext("2d");
      
      if (!finalCtx) return reject(new Error("Error Final Canvas 2D"));

      finalCtx.fillStyle = "#FFFFFF";
      finalCtx.fillRect(0, 0, finalW, finalH);
      finalCtx.imageSmoothingEnabled = false;

      const destX = paddingRaw * scale;
      const destY = paddingRaw * scale;
      const destW = targetW * scale;
      const destH = targetH * scale;

      finalCtx.drawImage(canvas1, 0, 0, targetW, targetH, destX, destY, destW, destH);
      resolve(finalCanvas.toDataURL("image/jpeg", 0.9));
    };
    
    img.onerror = () => reject(new Error("Error cargando el frame de video."));
    img.src = imageSrc;
  });
};
