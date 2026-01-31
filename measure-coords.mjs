#!/usr/bin/env node
/**
 * Utility to help measure PDF coordinates
 * Creates a grid overlay or outputs page dimensions
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";

const inputPath = process.argv[2] || "input_flat.pdf";
const outputPath = process.argv[3] || "measured.pdf";

async function main() {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();

  console.log(`PDF has ${pages.length} page(s)\n`);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    console.log(`Page ${i + 1}:`);
    console.log(`  Width: ${width} points`);
    console.log(`  Height: ${height} points`);
    console.log(`  Origin: bottom-left (PDF standard)`);
    console.log("");

    // Draw coordinate grid every 50 points
    const gridSpacing = 50;

    // Vertical lines with x-coordinate labels
    for (let x = 0; x <= width; x += gridSpacing) {
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.5,
      });
      // Label at bottom
      page.drawText(String(x), {
        x: x + 2,
        y: 5,
        size: 6,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Horizontal lines with y-coordinate labels
    for (let y = 0; y <= height; y += gridSpacing) {
      page.drawLine({
        start: { x: 0, y },
        end: { x: width, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.5,
      });
      // Label at left
      page.drawText(String(y), {
        x: 2,
        y: y + 2,
        size: 6,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      // Also show top-left equivalent
      const topLeftY = Math.round(height - y);
      page.drawText(`(tl:${topLeftY})`, {
        x: 25,
        y: y + 2,
        size: 5,
        font,
        color: rgb(0.3, 0.3, 0.8),
      });
    }
  }

  const modifiedBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, modifiedBytes);
  console.log(`Grid overlay written to: ${outputPath}`);
  console.log("\nNote: 'tl:' values show top-left origin y-coordinates");
}

main().catch(console.error);
