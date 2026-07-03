import { useState, useRef } from 'react';
import { createWorker, type Worker } from 'tesseract.js';
import { extractGridRegion, extractGridRegionSmall, type CropArea, type GridRegion } from './imageUtils';

const COLORS = {
  yellows: ['#ede3a9', '#fffdb2', '#ede3ab'],
  grayBlue: ['#a3b5b9'],
  white: ['#f8fefe']
};

const ECHO_GRID: Record<string, GridRegion> = {
  title:         { x1: 0,    y1: 0,    x2: 13.5, y2: 1.5,  targetHexes: COLORS.yellows,  tolerance: 60 },
  level:         { x1: 0,    y1: 1.5,  x2: 2,    y2: 3,    targetHexes: COLORS.grayBlue, tolerance: 60 },
  cost:          { x1: 0,    y1: 3,    x2: 4,    y2: 4,    targetHexes: COLORS.yellows,  tolerance: 60 },
  mainPercent:   { x1: 0,    y1: 8,    x2: 14,   y2: 9.3,  targetHexes: COLORS.white,    tolerance: 90 },
  mainFlat:      { x1: 0,    y1: 9.4,  x2: 14,   y2: 10.5, targetHexes: COLORS.white,    tolerance: 90 },
  subStatsDebug: { x1: 11,   y1: 10.5, x2: 14,   y2: 18,   targetHexes: COLORS.white,    tolerance: 90 },
  equipped:      { x1: 0,    y1: 18,   x2: 14,   y2: 20,   targetHexes: [...COLORS.yellows, ...COLORS.grayBlue], tolerance: 60 }
};

const WHITELISTS = {
  text:    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .:-',
  numbers: '0123456789.%+-',
  mixed:   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%.:-+ '
};

// Crea un worker completamente independiente con sus propios parámetros
const createIndependentWorker = async (): Promise<Worker> => {
  return await createWorker('eng', 1, {
    corePath: 'https://unpkg.com/tesseract.js-core@v6.0.0/tesseract-core.wasm.js',
  });
};

// Procesa un solo frame con un worker dedicado
const processSingleFrame = async (
  frameUrl: string,
  cropArea: CropArea,
  frameIndex: number,
  worker: Worker
) => {
  // Cada llamada configura su propio PSM/whitelist de forma secuencial
  // dentro del mismo worker, sin interferir con otros workers
  const setParams = async (psm: string, whitelist: string) => {
    await worker.setParameters({
      tessedit_pageseg_mode: psm as any,
      tessedit_char_whitelist: whitelist,
    });
  };

  const imgs = {
    title:       await extractGridRegion(frameUrl, cropArea, ECHO_GRID.title),
    level:       await extractGridRegionSmall(frameUrl, cropArea, ECHO_GRID.level),
    cost:        await extractGridRegionSmall(frameUrl, cropArea, ECHO_GRID.cost),
    mainPercent: await extractGridRegion(frameUrl, cropArea, ECHO_GRID.mainPercent),
    mainFlat:    await extractGridRegion(frameUrl, cropArea, ECHO_GRID.mainFlat),
    debug:       await extractGridRegion(frameUrl, cropArea, ECHO_GRID.subStatsDebug),
    equipped:    await extractGridRegion(frameUrl, cropArea, ECHO_GRID.equipped),
  };

  await setParams('6', WHITELISTS.text);
  const titleR = await worker.recognize(imgs.title);

  await setParams('3', WHITELISTS.numbers);
  const levelR = await worker.recognize(imgs.level);

  await setParams('3', WHITELISTS.numbers);
  const costR = await worker.recognize(imgs.cost);

  await setParams('6', WHITELISTS.mixed);
  const mainPR = await worker.recognize(imgs.mainPercent);
  const mainFR = await worker.recognize(imgs.mainFlat);

  await setParams('6', WHITELISTS.numbers);
  const debugR = await worker.recognize(imgs.debug);

  await setParams('6', WHITELISTS.text);
  const equipR = await worker.recognize(imgs.equipped);

  const clean = (res: any) => res.data.text.replace(/\n+/g, ' ').trim();

  let debugLines: { text: string; bbox: any }[] = [];
  if (debugR.data.lines?.length > 0) {
    debugLines = debugR.data.lines
      .map((l: any) => ({ text: l.text.trim(), bbox: l.bbox }))
      .filter((l: any) => l.text !== '');
  } else if (debugR.data.text) {
    debugLines = debugR.data.text
      .split('\n')
      .map((t: string) => t.trim())
      .filter((t: string) => t !== '')
      .map((t: string) => ({ text: t, bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } }));
  }

  const rawTitle = clean(titleR);
  const rawLevel = clean(levelR);

  if (!rawTitle && debugLines.length === 0) return null;

  return {
    frame: frameIndex,
    images: imgs,
    texts: {
      title:       rawTitle,
      level:       rawLevel,
      cost:        clean(costR),
      mainPercent: clean(mainPR),
      mainFlat:    clean(mainFR),
      equipped:    clean(equipR),
    },
    debugData: debugLines,
  };
};

export const useScanner = () => {
  const [isScannerLoaded, setIsScannerLoaded] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  const initScanner = async () => {
    try {
      console.log('Iniciando motor OCR...');
      workerRef.current = await createIndependentWorker();
      setIsScannerLoaded(true);
      console.log('✅ Motor OCR listo.');
    } catch (error) {
      console.error('Error al inicializar Tesseract:', error);
    }
  };

  const processFrames = async (
    frames: string[],
    cropArea: CropArea,
    numWorkers: number = 1
  ) => {
    if (!workerRef.current) throw new Error('OCR no inicializado');

    // Crear pool de workers INDEPENDIENTES
    const pool: Worker[] = [workerRef.current];
    const actualWorkers = Math.min(numWorkers, frames.length);

    if (actualWorkers > 1) {
      console.log(`🔧 Creando ${actualWorkers - 1} workers adicionales...`);
      for (let i = 1; i < actualWorkers; i++) {
        pool.push(await createIndependentWorker());
      }
    }

    console.log(`🚀 Pool de ${pool.length} workers listo para ${frames.length} frames`);

    const results: any[] = [];
    let processed = 0;

    // Distribuir frames en batches por worker
    // Worker 0 procesa frames 0, N, 2N...
    // Worker 1 procesa frames 1, N+1, 2N+1...
    // Cada worker procesa sus frames de forma SECUENCIAL (sin race conditions)
    const workerTasks = pool.map(async (worker, workerIdx) => {
      const myFrames = frames
        .map((url, idx) => ({ url, idx }))
        .filter((_, i) => i % pool.length === workerIdx);

      for (const { url, idx } of myFrames) {
        try {
          const result = await processSingleFrame(url, cropArea, idx, worker);
          if (result) results.push(result);
        } catch (e) {
          console.error(`❌ Frame ${idx}:`, e);
        }
        processed++;
        setScanProgress((processed / frames.length) * 100);
      }
    });

    // Ejecutar todos los workers en PARALELO (cada uno con su propio batch)
    await Promise.all(workerTasks);

    // Limpiar workers adicionales
    for (let i = 1; i < pool.length; i++) {
      await pool[i].terminate();
      console.log(`🗑️ Worker ${i} terminado`);
    }

    results.sort((a, b) => a.frame - b.frame);
    console.log(`\n✅ Completado: ${results.length}/${frames.length} frames con datos`);
    return results;
  };

  return { initScanner, processFrames, isScannerLoaded, scanProgress };
};
