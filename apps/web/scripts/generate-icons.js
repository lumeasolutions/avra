#!/usr/bin/env node
/**
 * AVRA PWA Icon Generator
 * Génère toutes les tailles d'icônes PWA depuis nouveaulogochouette.png
 * Usage: node scripts/generate-icons.js
 */

const path = require('path');
const fs = require('fs');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('sharp n\'est pas installé. Installez-le avec: npm install --save-dev sharp');
    process.exit(1);
  }

  const sourceImage = path.join(__dirname, '../public/nouveaulogochouette.png');
  const outputDir = path.join(__dirname, '../public/icons');

  if (!fs.existsSync(sourceImage)) {
    console.error(`Source image introuvable: ${sourceImage}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const BG_COLOR = '#1e2b22';

  // Icônes standards (transparentes)
  const standardSizes = [72, 96, 128, 144, 152, 192, 384, 512];

  console.log('Génération des icônes standards...');
  for (const size of standardSizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(sourceImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);
    console.log(`  Créé: icon-${size}x${size}.png`);
  }

  // Apple Touch Icon (180x180)
  console.log('Génération de l\'Apple Touch Icon...');
  const appleTouchPath = path.join(outputDir, 'apple-touch-icon.png');
  // Convertir la couleur hex en RGB
  const bgR = parseInt(BG_COLOR.slice(1, 3), 16);
  const bgG = parseInt(BG_COLOR.slice(3, 5), 16);
  const bgB = parseInt(BG_COLOR.slice(5, 7), 16);

  await sharp(sourceImage)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: bgR, g: bgG, b: bgB, alpha: 1 },
    })
    .flatten({ background: { r: bgR, g: bgG, b: bgB } })
    .png()
    .toFile(appleTouchPath);
  console.log('  Créé: apple-touch-icon.png');

  // Icônes maskable (avec fond coloré + padding 20% safe zone)
  const maskableSizes = [192, 512];
  console.log('Génération des icônes maskable...');
  for (const size of maskableSizes) {
    const outputPath = path.join(outputDir, `icon-maskable-${size}x${size}.png`);
    // Safe zone: l'icône occupe 60% du canvas (40% de padding au total)
    const iconSize = Math.round(size * 0.6);
    const padding = Math.round((size - iconSize) / 2);

    const resizedIcon = await sharp(sourceImage)
      .resize(iconSize, iconSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: bgR, g: bgG, b: bgB, alpha: 255 },
      },
    })
      .composite([
        {
          input: resizedIcon,
          top: padding,
          left: padding,
        },
      ])
      .png()
      .toFile(outputPath);
    console.log(`  Créé: icon-maskable-${size}x${size}.png`);
  }

  console.log('\nToutes les icônes ont été générées dans /public/icons/');
}

generateIcons().catch((err) => {
  console.error('Erreur lors de la génération des icônes:', err);
  process.exit(1);
});
