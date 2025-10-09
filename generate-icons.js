const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 64, 80, 96, 128];
const svgPath = path.join(__dirname, 'public', 'assets', 'icon.svg');
const outputDir = path.join(__dirname, 'public', 'assets');

async function generateIcons() {
  console.log('📐 Generating icons from SVG...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
      
      const stats = fs.statSync(outputPath);
      console.log(`✅ Generated icon-${size}.png (${stats.size} bytes)`);
    } catch (error) {
      console.error(`❌ Failed to generate icon-${size}.png:`, error.message);
    }
  }
  
  console.log('\n🎉 All icons generated successfully!');
  console.log('\n📊 Icon sizes:');
  sizes.forEach(size => {
    const filePath = path.join(outputDir, `icon-${size}.png`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`   ${size}x${size}: ${(stats.size / 1024).toFixed(2)} KB`);
    }
  });
}

generateIcons().catch(console.error);
