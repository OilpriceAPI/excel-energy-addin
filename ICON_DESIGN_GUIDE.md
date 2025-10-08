# Icon Design Guide - Excel Energy Price Comparison Add-in

## Required Icon Sizes

Microsoft AppSource requires icons in the following sizes:

| Size | Usage | Required |
|------|-------|----------|
| 16x16 | Ribbon button (small) | ✅ Yes |
| 32x32 | Ribbon button, manifest | ✅ Yes |
| 64x64 | High-res ribbon, manifest | ✅ Yes |
| 80x80 | Ribbon button (large) | ✅ Yes |
| 96x96 | AppSource store listing | ✅ Yes |
| 128x128 | Store listing | ✅ Yes |

## Design Concept

### Primary Concept: Oil Drop + Spreadsheet
- **Visual**: An oil drop shape with spreadsheet grid lines inside
- **Colors**: Blue (#3498db) for professional tech feel, with energy industry accents
- **Style**: Modern, flat design, Microsoft Office aesthetic

### Alternative Concepts:
1. **Barrel + Chart**: Oil barrel silhouette with price chart line
2. **Flame + Data**: Flame icon (energy) with data points/graph
3. **Globe + Oil**: Global energy markets representation

## Color Palette

```
Primary Blue:   #3498db (Microsoft Office blue)
Accent Orange:  #e67e22 (Energy/oil industry)
Dark Slate:     #2c3e50 (Text/borders)
White:          #ffffff (Background)
Green Success:  #27ae60 (Optional accent)
```

## Design Requirements

### Microsoft AppSource Guidelines:
- ✅ Clear and recognizable at small sizes (16x16)
- ✅ No text (icons should be visual only)
- ✅ Transparent background (PNG with alpha channel)
- ✅ Centered design with 10% padding on all sides
- ✅ High contrast for accessibility
- ✅ Consistent style across all sizes

### Technical Specifications:
- **Format**: PNG with alpha transparency
- **Color Mode**: RGB
- **Resolution**: 72 DPI minimum
- **Max File Size**: 50 KB per icon
- **Compression**: Use PNG-8 or PNG-24 with optimization

## Design Tools

### Option 1: AI Image Generation (Fastest)
Use ChatGPT, DALL-E, or Midjourney with this prompt:

```
Create a professional app icon for an Excel add-in that compares energy commodity prices. 
Design concept: A modern oil drop shape with a subtle spreadsheet grid pattern inside. 
Style: Flat design, Microsoft Office aesthetic, blue (#3498db) and orange (#e67e22) colors. 
Icon should be clear at small sizes. No text. Transparent background. 
Sizes needed: 16x16, 32x32, 64x64, 80x80, 96x96, 128x128 pixels.
```

### Option 2: Figma (Professional)
1. Create a new Figma project
2. Use the provided color palette
3. Design at 512x512, then export at required sizes
4. Use Figma's export presets: PNG with transparency

### Option 3: Canva (Easy)
1. Go to Canva.com → Create a Design → Custom Size (512x512)
2. Search for oil/energy icons in Canva's library
3. Combine with spreadsheet/data elements
4. Download as PNG (transparent background)
5. Resize using the script below

### Option 4: Icon Font Converter
Use Font Awesome or similar icon fonts:
1. Find suitable icons (fa-oil-can, fa-chart-line)
2. Use https://icomoon.io to convert to PNG
3. Customize colors in the tool

## Automated Icon Generation Script

Once you have a 512x512 master icon, use this script to generate all sizes:

```bash
#!/bin/bash
# Requires ImageMagick: sudo apt install imagemagick

MASTER="master-icon-512.png"

# Generate all required sizes
convert $MASTER -resize 16x16   public/assets/icon-16.png
convert $MASTER -resize 32x32   public/assets/icon-32.png
convert $MASTER -resize 64x64   public/assets/icon-64.png
convert $MASTER -resize 80x80   public/assets/icon-80.png
convert $MASTER -resize 96x96   public/assets/icon-96.png
convert $MASTER -resize 128x128 public/assets/icon-128.png

echo "✅ All icons generated successfully!"
```

## Current Icon Status

The add-in currently has placeholder icons:
- icon-16.png (212 bytes) ❌ Placeholder
- icon-32.png (231 bytes) ❌ Placeholder  
- icon-64.png (273 bytes) ❌ Placeholder
- icon-80.png (291 bytes) ❌ Placeholder

**Action needed**: Replace with professional designs

## Testing Icons

### Visual Test
1. Load the add-in in Excel
2. Check ribbon button appearance
3. Icons should be crisp and recognizable
4. Test on both light and dark Office themes

### Technical Validation
```bash
# Check file sizes
ls -lh public/assets/*.png

# Verify PNG format
file public/assets/*.png

# Check dimensions
identify public/assets/*.png
```

## Quick Win: Use Existing Stock Icons

If you need icons immediately, use these free resources:

1. **Flaticon**: https://www.flaticon.com
   - Search "oil" + "data" or "chart"
   - Download in multiple sizes
   - Free with attribution (Pro removes attribution)

2. **Icons8**: https://icons8.com
   - Search "oil barrel" or "energy chart"
   - Download PNG with transparency
   - Free up to 100 icons/month

3. **Noun Project**: https://thenounproject.com
   - High-quality professional icons
   - Search "petroleum" + "analytics"
   - Free with attribution

## Example Icon Concepts (Text Description)

### Concept 1: Oil Drop + Grid
```
╭─────╮
│ ●▒▒ │  Blue oil drop
│ ░■■░ │  with grid lines
│ ░■■░ │  inside
╰─────╯
```

### Concept 2: Barrel + Chart
```
╭─────╮
│ ┌─┐ │  Oil barrel
│ │ │╱│  with price
│ └─┘ │  chart line
╰─────╯
```

### Concept 3: Flame + Data
```
╭─────╮
│  ●  │  Energy flame
│ ● ● │  with data
│ ●•● │  points
╰─────╯
```

## Action Items

1. [ ] Choose design concept
2. [ ] Create 512x512 master icon
3. [ ] Generate all required sizes
4. [ ] Replace placeholder icons in public/assets/
5. [ ] Test icons in Excel
6. [ ] Commit and deploy
7. [ ] Update manifest.xml if needed

## Resources

- [Microsoft Office Add-in Icons Guidelines](https://docs.microsoft.com/en-us/office/dev/add-ins/design/add-in-icons)
- [AppSource Icon Requirements](https://docs.microsoft.com/en-us/office/dev/store/craft-effective-appsource-store-images)
- [Figma Icon Design Tutorial](https://www.figma.com/resources/learn-design/icons/)

