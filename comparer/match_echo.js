import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
const BG_COLOR = '#0a121b'; 

// Matemática pura: Calcula qué tan parecidos son dos vectores (-1 a 1)
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct; 
}

async function testMatcher() {
  try {
    // 1. Cargar nuestra base de datos de firmas (Una sola vez)
    console.log('Cargando base de datos de firmas...');
    const signaturesRaw = await fs.readFile('./echo_signatures.json', 'utf-8');
    const signatures = JSON.parse(signaturesRaw);

    // 2. Cargar el modelo de IA (Una sola vez para que sea rápido)
    console.log('Cargando modelo ResNet-50 en memoria...');
    const extractor = await pipeline('image-feature-extraction', 'Xenova/resnet-50');
    console.log('¡Modelo y base de datos listos!\n');

    // 3. Coordenadas exactas 
    const boundingBox = { 
      left: 2158, 
      top: 200,   
      width: 212, 
      height: 209 
    };

    const capturesDir = './capturaDeEjemplo';
    const tempProcessedPath = './temp_target.webp';

    // 4. Leer todos los archivos de la carpeta
    const files = await fs.readdir(capturesDir);

    for (const file of files) {
      // Ignorar archivos que no sean imágenes
      if (!file.match(/\.(png|jpg|jpeg|webp)$/i)) continue;

      const capturePath = path.join(capturesDir, file);
      console.log(`--- Analizando captura: ${file} ---`);

      // Extraer exactamente lo marcado y estandarizar
      const croppedBuffer = await sharp(capturePath)
        .extract(boundingBox)
        .toBuffer();

      await sharp(croppedBuffer)
        .flatten({ background: BG_COLOR })
        .resize(224, 224, { fit: 'contain', background: BG_COLOR }) 
        .toFormat('webp')
        .toFile(tempProcessedPath);

      // Extraer la firma del recorte temporal
      const output = await extractor(tempProcessedPath);
      
      const vector = Array.from(output.data);
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const targetSignature = vector.map(val => val / magnitude); // Normalizar

      // Comparar contra todos los Echoes de la base de datos
      const results = [];
      for (const [name, signature] of Object.entries(signatures)) {
        const similarity = cosineSimilarity(targetSignature, signature);
        results.push({ name, similarity });
      }

      // Ordenar de mayor a menor similitud
      results.sort((a, b) => b.similarity - a.similarity);

      // Imprimir la mejor coincidencia para este archivo
      const bestMatch = results[0];
      const secondMatch = results[1];
      
      console.log(`✅ Resultado: ${bestMatch.name} (${(bestMatch.similarity * 100).toFixed(2)}%)`);
      console.log(`   (Segundo más cercano: ${secondMatch.name} con ${(secondMatch.similarity * 100).toFixed(2)}%)\n`);
    }

    console.log('¡Análisis por lotes completado!');

  } catch (error) {
    console.error('Error durante la inferencia:', error);
  }
}

testMatcher();
