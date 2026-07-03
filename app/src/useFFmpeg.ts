import { useState } from 'react';

export type VideoResolution = '480' | '720' | '1080' | 'original';

export const useFFmpeg = () => {
  const [isLoaded, setIsLoaded] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadFFmpeg = async () => {
    setIsLoaded(true);
    console.log('🎬 Modo nativo del navegador activado');
  };

  const processVideo = async (
    file: File,
    fps: number = 2,
    resolution: VideoResolution = '720'
  ): Promise<string[]> => {
    setIsProcessing(true);
    setProgress(0);
    const frames: string[] = [];

    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('No se pudo cargar el video'));
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });

      const duration = video.duration;
      const interval = 1 / fps;
      const totalFrames = Math.ceil(duration * fps);

      // Calcular dimensiones según resolución elegida
      const canvas = document.createElement('canvas');
      const srcW = video.videoWidth;
      const srcH = video.videoHeight;
      const aspectRatio = srcW / srcH;

      const targetHeights: Record<VideoResolution, number | null> = {
        '480': 480,
        '720': 720,
        '1080': 1080,
        'original': null,
      };

      const targetH = targetHeights[resolution];
      if (targetH === null || srcH <= targetH) {
        // Sin escalar (original o ya es menor)
        canvas.width = srcW;
        canvas.height = srcH;
      } else {
        canvas.height = targetH;
        canvas.width = Math.round(targetH * aspectRatio);
      }

      const ctx = canvas.getContext('2d')!;
      let currentTime = 0;
      let frameCount = 0;

      console.log(`🎬 ${totalFrames} frames | ${fps} FPS | ${canvas.width}×${canvas.height} | ${duration.toFixed(1)}s`);

      while (currentTime <= duration) {
        video.currentTime = currentTime;

        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          setTimeout(resolve, 500);
        });

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.93));

        frameCount++;
        setProgress(Math.min((frameCount / totalFrames) * 100, 99));
        currentTime += interval;
      }

      URL.revokeObjectURL(video.src);
      setProgress(100);
      setIsProcessing(false);
      console.log(`✅ ${frames.length} frames extraídos`);
      return frames;

    } catch (error) {
      console.error('Error extrayendo frames:', error);
      setIsProcessing(false);
      return [];
    }
  };

  return { loadFFmpeg, processVideo, isLoaded, isProcessing, progress };
};
