import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
const BG_COLOR = '#0a121b'; 

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct; 
}

async function testMatcher() {
  try {
    console.log('Cargando datos...');
    
    // 1. Cargar firmas
    const signaturesRaw = await fs.readFile('./sonatas_signatures.json', 'utf-8');
    const signatures = JSON.parse(signaturesRaw);

    // 2. Cargar el JSON de nombres para traducir el resultado
    const namesRaw = await fs.readFile('./sonatas/names.json', 'utf-8');
    const sonataNames = JSON.parse(namesRaw);

    // 3. Cargar el modelo
    const extractor = await pipeline('image-feature-extraction', 'Xenova/resnet-50');
    console.log('¡Modelo y base de datos listos!\n');

    // 4. Tus coordenadas (45x45 píxeles reales)
    const boundingBox = { 
      left: 1864, 
      top: 225,   
      width: 45, 
      height: 45 
    };

    const capturesDir = './capturaDeEjemplo';
    const tempProcessedPath = './temp_sonata_target.webp';
    const files = await fs.readdir(capturesDir);

    for (const file of files) {
      if (!file.match(/\.(png|jpg|jpeg|webp)$/i)) continue;

      const capturePath = path.join(capturesDir, file);
      console.log(`--- Analizando Sonata en captura: ${file} ---`);

      // Extraer y estandarizar
      const croppedBuffer = await sharp(capturePath)
        .extract(boundingBox)
        .toBuffer();

      await sharp(croppedBuffer)
        .flatten({ background: BG_COLOR })
        .resize(224, 224) 
        .toFormat('webp')
        .toFile(tempProcessedPath);

      // Inferencia
      const output = await extractor(tempProcessedPath);
      const vector = Array.from(output.data);
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const targetSignature = vector.map(val => val / magnitude);

      // Comparar
      const results = [];
      for (const [filename, signature] of Object.entries(signatures)) {
        const similarity = cosineSimilarity(targetSignature, signature);
        
        // Convertir .webp de vuelta a .png para buscarlo en names.json
        const originalPngName = filename.replace('.webp', '.png');
        const readableName = sonataNames[originalPngName] || filename;

        results.push({ name: readableName, similarity });
      }

      results.sort((a, b) => b.similarity - a.similarity);

      const bestMatch = results[0];
      const secondMatch = results[1];
      
      console.log(`✅ Set: ${bestMatch.name} (${(bestMatch.similarity * 100).toFixed(2)}%)`);
      console.log(`   (Segundo más cercano: ${secondMatch.name} con ${(secondMatch.similarity * 100).toFixed(2)}%)\n`);
    }

    console.log('¡Análisis de Sonatas por lotes completado!');

  } catch (error) {
    console.error('Error durante la inferencia:', error);
  }
}

testMatcher();
