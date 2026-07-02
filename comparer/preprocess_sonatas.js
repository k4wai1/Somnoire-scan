import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const inputDir = './sonatas';
const outputDir = './sonatas_listo';
const BG_COLOR = '#0a121b'; // Mismo fondo del juego

async function processSonatas() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    const files = await fs.readdir(inputDir);
    
    console.log(`Iniciando procesamiento de Sonatas...`);

    for (const file of files) {
      if (!file.match(/\.png$/i)) continue;

      const inputPath = path.join(inputDir, file);
      // Guardamos como .webp para mantener consistencia
      const outputPath = path.join(outputDir, file.replace('.png', '.webp'));

      await sharp(inputPath)
        // Las sonatas originales son de 128x128 con fondo transparente. Lo aplanamos.
        .flatten({ background: BG_COLOR })
        // Redimensionamos a 224x224 (El tamaño que le gusta a ResNet-50)
        .resize(224, 224)
        .toFormat('webp')
        .toFile(outputPath);

      console.log(`Procesada: ${file}`);
    }
    console.log('¡Pre-procesamiento de Sonatas completado!');
  } catch (error) {
    console.error('Error procesando las sonatas:', error);
  }
}

processSonatas();
