import { useState } from 'react';

export const useImageLoader = () => {
  const [isLoading, setIsLoading] = useState(false);

  const loadImages = async (files: FileList): Promise<string[]> => {
    setIsLoading(true);
    const frames: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        frames.push(url);
      }
    }

    setIsLoading(false);
    return frames.sort();
  };

  return { loadImages, isLoading };
};
