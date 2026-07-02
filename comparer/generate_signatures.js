import fs from 'fs/promises';
import path from 'path';
import { pipeline, env } from '@xenova/transformers';

// Desactivar el uso de modelos locales para que lo descargue de HuggingFace la primera vez
env.allowLocalModels = false;

const inputDir = './echoes_listo';
const outputFile = './echo_signatures.json';

async function generateSignatures() {
  console.log('Cargando el modelo ResNet-50 (esto puede tardar un poco la primera vez)...');
  
  // Cargamos un modelo de extracción de características de imágenes
  const extractor = await pipeline('image-feature-extraction', 'Xenova/resnet-50');
  
  console.log('¡Modelo cargado! Procesando imágenes...');

  const files = await fs.readdir(inputDir);
  const signatures = {};

  for (const file of files) {
    if (!file.match(/\.(webp|png|jpg)$/i)) continue;

    const inputPath = path.join(inputDir, file);
    
    try {
      // Pasamos la imagen por el modelo
      const output = await extractor(inputPath);
      
      // El output es un Tensor. Lo convertimos a un array normal de JavaScript.
      // ResNet-50 devuelve un vector, normalmente tomamos los datos planos (tolist o data).
      const vector = Array.from(output.data);
      
      // Normalizamos el vector (importante para calcular similitud del coseno después)
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const normalizedVector = vector.map(val => val / magnitude);

      // Guardamos la firma normalizada usando el nombre del archivo como clave
      signatures[file] = normalizedVector;
      
      console.log(`Firma extraída para: ${file}`);
    } catch (error) {
      console.error(`Error procesando ${file}:`, error.message);
    }
  }

  // Guardamos todo en nuestro JSON final
  await fs.writeFile(outputFile, JSON.stringify(signatures, null, 2));
  console.log(`\n¡Éxito! Todas las firmas han sido guardadas en ${outputFile}`);
}

generateSignatures();
