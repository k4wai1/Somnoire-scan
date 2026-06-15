import { useState, useRef } from 'react';
import { createWorker, type Worker } from 'tesseract.js';
import { extractGridRegion, extractGridRegionSmall, type CropArea, type GridRegion } from './imageUtils';

const COLORS = {
  yellows: ['#ede3a9', '#fffdb2', '#ede3ab'],
  grayBlue: ['#a3b5b9'],
  white: ['#f8fefe']
};

const ECHO_GRID: Record<string, GridRegion> = {
  title:         { x1: 0,  y1: 0,    x2: 13.5, y2: 1.5,  targetHexes: COLORS.yellows, tolerance: 60 },
  level:         { x1: 0,  y1: 1.5,  x2: 2,    y2: 3,    targetHexes: COLORS.grayBlue, tolerance: 60 },
  cost:          { x1: 0,  y1: 3,    x2: 4,    y2: 4,    targetHexes: COLORS.yellows, tolerance: 60 },
  mainPercent:   { x1: 0,  y1: 8,    x2: 14,   y2: 9.3,  targetHexes: COLORS.white, tolerance: 90 },
  mainFlat:      { x1: 0,  y1: 9.4,  x2: 14,   y2: 10.5, targetHexes: COLORS.white, tolerance: 90 },
  subStatsDebug: { x1: 11, y1: 10.5, x2: 14,   y2: 18,   targetHexes: COLORS.white, tolerance: 90 },
  equipped:      { x1: 0,  y1: 18,   x2: 14,   y2: 20,   targetHexes: [...COLORS.yellows, ...COLORS.grayBlue], tolerance: 60 }
};

// Whitelists específicos por tipo de contenido
const WHITELISTS = {
  text:    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .:-',
  numbers: '0123456789.%+-',
  mixed:   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%.:-+ '
};

export const useScanner = () => {
  const [isScannerLoaded, setIsScannerLoaded] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  const initScanner = async () => {
    try {
      console.log("Iniciando motor OCR con modelo estable en inglés...");
      
      const worker = await createWorker('eng', 1, {
        corePath: 'https://unpkg.com/tesseract.js-core@v6.0.0/tesseract-core.wasm.js',
      });
      
      workerRef.current = worker;
      setIsScannerLoaded(true);
      console.log("✅ Modelo estable ENG cargado con éxito.");
    } catch (error) {
      console.error("Error al inicializar Tesseract:", error);
    }
  };

  // Helper que configura whitelist + PSM y luego ejecuta OCR
  const recognizeWith = async (
    worker: Worker,
    imageData: string,
    psm: string,
    whitelist: string
  ) => {
    await worker.setParameters({
      tessedit_pageseg_mode: psm as any,
      tessedit_char_whitelist: whitelist,
    });
    return await worker.recognize(imageData);
  };

  const processFrames = async (frames: string[], cropArea: CropArea) => {
    if (!workerRef.current) throw new Error("OCR no inicializado");
    const results = [];
    const worker = workerRef.current;
    
    for (let i = 0; i < frames.length; i++) {
      try {
        console.log(`\n🔍 Analizando fotograma ${i}...`);
        
        // Extracción de subregiones (esto se mantiene secuencial)
        const imgs = {
          title: await extractGridRegion(frames[i], cropArea, ECHO_GRID.title),
		  level: await extractGridRegionSmall(frames[i], cropArea, ECHO_GRID.level), // ⭐ Usar versión especializada
		  cost: await extractGridRegionSmall(frames[i], cropArea, ECHO_GRID.cost),   // ⭐ Usar versión especializada
          mainPercent: await extractGridRegion(frames[i], cropArea, ECHO_GRID.mainPercent),
          mainFlat: await extractGridRegion(frames[i], cropArea, ECHO_GRID.mainFlat),
          debug: await extractGridRegion(frames[i], cropArea, ECHO_GRID.subStatsDebug),
          equipped: await extractGridRegion(frames[i], cropArea, ECHO_GRID.equipped),
        };

        // CRÍTICO: OCR SECUENCIAL con whitelist + PSM óptimo por región
        // (NO usar Promise.all porque cada llamada cambia parámetros del worker)
        console.log(`🔍 Frame ${i} - Imagen del nivel:`, imgs.level.substring(0, 100) + '...');
        
        // 1. Título: texto puro
        const titleR = await recognizeWith(worker, imgs.title, '6', WHITELISTS.text);
        
        // 2. Nivel: solo números (palabra única)
        const levelR = await recognizeWith(worker, imgs.level, '3', WHITELISTS.numbers);
        
        // 3. Cost: número simple
        const costR = await recognizeWith(worker, imgs.cost, '8', WHITELISTS.numbers);
        
        // 4. Main stats: mezcla (ATK 150, Crit. DMG 44.0%)
        const mainPR = await recognizeWith(worker, imgs.mainPercent, '6', WHITELISTS.mixed);
        const mainFR = await recognizeWith(worker, imgs.mainFlat, '6', WHITELISTS.mixed);
        
        // 5. SUBSTATS: SOLO NÚMEROS, PSM 6 (lo mejor en Node) ⭐
        const debugR = await recognizeWith(worker, imgs.debug, '6', WHITELISTS.numbers);
        
        // 6. Equipped: texto
        const equipR = await recognizeWith(worker, imgs.equipped, '6', WHITELISTS.text);

        const clean = (res: any) => res.data.text.replace(/\n+/g, " ").trim();

        const rawTitle = clean(titleR);
        const rawLevel = clean(levelR); // Mantener el + intacto
        
        // DEBUG CRÍTICO: Imprimir texto crudo Y líneas detectadas
        console.log(`📋 Frame ${i} - Texto crudo del debug:`, JSON.stringify(debugR.data.text));
        console.log(`📋 Frame ${i} - Confianza:`, debugR.data.confidence);
        console.log(`📋 Frame ${i} - Líneas detectadas:`, debugR.data.lines?.length || 0);

        // Extraer líneas. Si no hay .lines, parsear el texto crudo
        let debugLines: { text: string; bbox: any }[] = [];
        
        if (debugR.data.lines && debugR.data.lines.length > 0) {
          debugLines = debugR.data.lines
            .map((line: any) => ({
              text: line.text.trim(),
              bbox: line.bbox
            }))
            .filter((l: any) => l.text !== "");
        } else if (debugR.data.text) {
          // Fallback: parsear el texto crudo separando por saltos de línea
          debugLines = debugR.data.text
            .split('\n')
            .map((t: string) => t.trim())
            .filter((t: string) => t !== "")
            .map((t: string) => ({
              text: t,
              bbox: { x0: 0, y0: 0, x1: 0, y1: 0 }
            }));
        }

        console.log(`✅ Frame ${i} - Substats finales:`, debugLines.map(l => l.text));

        if (rawTitle || debugLines.length > 0) {
          results.push({ 
            frame: i, 
            images: imgs,
            texts: {
              title: rawTitle,
              level: rawLevel,
              cost: clean(costR),
              mainPercent: clean(mainPR),
              mainFlat: clean(mainFR),
              equipped: clean(equipR)
            },
            debugData: debugLines
          });
        }
      } catch (e) {
        console.error(`❌ Error procesando fotograma ${i}:`, e);
      }
      setScanProgress(((i + 1) / frames.length) * 100);
    }
    return results;
  };

  return { initScanner, processFrames, isScannerLoaded, scanProgress };
};
