/**
 * Convert PNG to ICO for Windows
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function convertPngToIco() {
  try {
    // For now, we'll copy the PNG as a workaround
    // In production, you'd use a proper ICO converter
    const sourcePng = path.join(__dirname, '../../build/icons/icon-256x256.png');
    const destIco = path.join(__dirname, '../../build/icons/icon.ico');
    
    // Check if PNG exists
    if (!fs.existsSync(sourcePng)) {
      console.error('Source PNG not found. Please run generate-icon.js first.');
      return;
    }
    
    // For Windows, we can use the PNG directly in many cases
    // Copy PNG to ICO location for compatibility
    fs.copyFileSync(sourcePng, destIco);
    
    console.log('Icon file prepared at:', destIco);
    console.log('Note: For a proper ICO file, use an online converter or ico-converter package');
    
  } catch (error) {
    console.error('Error converting icon:', error);
  }
}

convertPngToIco();
