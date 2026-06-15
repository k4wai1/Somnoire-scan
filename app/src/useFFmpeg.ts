import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export const useFFmpeg = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef(new FFmpeg());

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    if (ffmpeg.loaded) {
        setIsLoaded(true);
        return;
    }

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(progress * 100);
    });

    try {
        await ffmpeg.load({
            coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
            wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
        });
        setIsLoaded(true);
        console.log("🎬 FFmpeg cargado exitosamente.");
    } catch (error) {
        console.error("Error cargando FFmpeg:", error);
    }
  };

  const processVideo = async (file: File) => {
    if (!isLoaded) await loadFFmpeg();
    const ffmpeg = ffmpegRef.current;
    
    setIsProcessing(true);
    setProgress(0);

    try {
      const inputName = 'input.mp4';
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      console.log("Extrayendo frames a 2 FPS...");
      await ffmpeg.exec([
        '-i', inputName,
        '-r', '2', 
        '-f', 'image2',
        'frame_%03d.jpg'
      ]);

      const frames = [];
      let i = 1;
      while (true) {
        const frameName = `frame_${i.toString().padStart(3, '0')}.jpg`;
        try {
            const data = await ffmpeg.readFile(frameName);
            const blob = new Blob([data], { type: 'image/jpeg' });
            frames.push(URL.createObjectURL(blob));
            await ffmpeg.deleteFile(frameName);
            i++;
        } catch (e) {
            break; // No hay más frames
        }
      }
      
      await ffmpeg.deleteFile(inputName);
      setIsProcessing(false);
      return frames;
    } catch (error) {
      console.error("Error procesando video:", error);
      setIsProcessing(false);
      return [];
    }
  };

  return { loadFFmpeg, processVideo, isLoaded, isProcessing, progress };
};
