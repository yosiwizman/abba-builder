/**
 * Generate Superman-style icon for Abba app
 * Creates an icon with a diamond/shield shape featuring the letter 'A'
 */

const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// Icon sizes for different platforms
const ICON_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

function generateSupermanIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Clear canvas with transparency
  ctx.clearRect(0, 0, size, size);

  // Create gradient background (red to darker red like Superman's cape)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#DC143C"); // Crimson red
  gradient.addColorStop(0.5, "#B22222"); // Firebrick red
  gradient.addColorStop(1, "#8B0000"); // Dark red

  // Draw diamond/shield shape
  const centerX = size / 2;
  const centerY = size / 2;
  const shieldSize = size * 0.85;

  ctx.save();
  ctx.translate(centerX, centerY);

  // Create shield path (pentagon-like Superman shield)
  ctx.beginPath();
  ctx.moveTo(0, -shieldSize * 0.5); // Top point
  ctx.lineTo(shieldSize * 0.45, -shieldSize * 0.2); // Top right
  ctx.lineTo(shieldSize * 0.45, shieldSize * 0.25); // Bottom right
  ctx.lineTo(0, shieldSize * 0.5); // Bottom point
  ctx.lineTo(-shieldSize * 0.45, shieldSize * 0.25); // Bottom left
  ctx.lineTo(-shieldSize * 0.45, -shieldSize * 0.2); // Top left
  ctx.closePath();

  // Fill with gradient
  ctx.fillStyle = gradient;
  ctx.fill();

  // Add golden/yellow border
  ctx.strokeStyle = "#FFD700"; // Gold color
  ctx.lineWidth = size * 0.04;
  ctx.stroke();

  // Draw the letter 'A' in the center
  ctx.restore();

  // Configure text
  ctx.fillStyle = "#FFD700"; // Gold color for the letter
  ctx.font = `bold ${size * 0.5}px 'Arial', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Add shadow to the letter
  ctx.shadowColor = "#8B0000";
  ctx.shadowBlur = size * 0.02;
  ctx.shadowOffsetX = size * 0.01;
  ctx.shadowOffsetY = size * 0.01;

  // Draw stylized 'A' with serif-like styling
  ctx.fillText("A", centerX, centerY + size * 0.02);

  // Add subtle inner glow effect
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255, 215, 0, 0.2)";
  ctx.fillText("A", centerX, centerY + size * 0.02);

  return canvas;
}

function generateAllIcons() {
  const outputDir = path.join(__dirname, "../../build/icons");

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate icons for each size
  ICON_SIZES.forEach((size) => {
    const canvas = generateSupermanIcon(size);
    const buffer = canvas.toBuffer("image/png");

    // Save PNG files
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`Generated ${filename}`);
  });

  // Generate ICO file for Windows (using 256x256 as base)
  const icoCanvas = generateSupermanIcon(256);
  const icoBuffer = icoCanvas.toBuffer("image/png");
  const icoPath = path.join(outputDir, "icon.ico");

  // For simplicity, save as PNG (you'd need ico library for proper ICO)
  fs.writeFileSync(icoPath.replace(".ico", ".png"), icoBuffer);
  console.log("Generated icon.png (use online converter for .ico)");

  // Generate ICNS file for macOS (placeholder)
  console.log("Note: Use iconutil on macOS to generate .icns from PNG files");

  console.log("\nAll icons generated successfully!");
  console.log(`Output directory: ${outputDir}`);
}

// Run the generation
if (require.main === module) {
  generateAllIcons();
}

module.exports = { generateSupermanIcon, generateAllIcons };
