import fs from 'fs/promises';
import path from 'path';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

const inputDir = './sonatas_listo';
const outputFile = './sonatas_signatures.json';

async function generateSignatures() {
  console.log('Cargando el modelo ResNet-50...');
  const extractor = await pipeline('image-feature-extraction', 'Xenova/resnet-50');
  
  const files = await fs.readdir(inputDir);
  const signatures = {};

  for (const file of files) {
    if (!file.match(/\.webp$/i)) continue;

    const inputPath = path.join(inputDir, file);
    try {
      const output = await extractor(inputPath);
      const vector = Array.from(output.data);
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      
      signatures[file] = vector.map(val => val / magnitude);
      console.log(`Firma extraída para: ${file}`);
    } catch (error) {
      console.error(`Error procesando ${file}:`, error.message);
    }
  }

  await fs.writeFile(outputFile, JSON.stringify(signatures, null, 2));
  console.log(`\n¡Éxito! Firmas guardadas en ${outputFile}`);
}

generateSignatures();
