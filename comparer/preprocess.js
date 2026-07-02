import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const inputDir = './echoes';
const outputDir = './echoes_listo';
const BG_COLOR = '#0a121b'; // Color exacto del fondo del juego

async function processEchoes() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    
    const files = await fs.readdir(inputDir);
    
    console.log(`Iniciando procesamiento de ${files.length} archivos...`);

    for (const file of files) {
      if (!file.match(/\.(webp|png|jpg)$/i)) continue;

      const inputPath = path.join(inputDir, file);
      const cleanName = file.replace(/\*/g, '');
      const outputPath = path.join(outputDir, cleanName);

      const metadata = await sharp(inputPath).metadata();
      
      // 1. Definir el área útil (ignorando el 30% superior)
      const usefulHeight = Math.floor(metadata.height * 0.70);
      const topIgnore = metadata.height - usefulHeight; 

      // 2. Calcular el tamaño del cuadrado perfecto (el lado más pequeño)
      const size = Math.min(metadata.width, usefulHeight);

      // 3. Calcular las coordenadas X e Y para centrar el cuadrado dentro del área útil
      const leftOffset = Math.floor((metadata.width - size) / 2);
      const topOffset = topIgnore + Math.floor((usefulHeight - size) / 2);

      await sharp(inputPath)
        // Extraemos el cuadrado perfecto directamente de las coordenadas calculadas
        .extract({ 
          left: leftOffset, 
          top: topOffset, 
          width: size, 
          height: size 
        })
        // Matamos la transparencia con el color de la UI
        .flatten({ background: BG_COLOR }) 
        // Redimensionamos al estándar de ONNX. 
        // Como ya es un cuadrado perfecto, no habrá deformación ni bandas negras.
        .resize(224, 224) 
        .toFormat('webp')
        .toFile(outputPath);

      console.log(`Procesado: ${file} -> ${cleanName}`);
    }
    
    console.log('¡Pre-procesamiento optimizado completado!');
    
  } catch (error) {
    console.error('Error procesando las imágenes:', error);
  }
}

processEchoes();
