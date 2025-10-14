#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require('@prisma/client');

const OUTPUT_DIR = path.join(__dirname, "..", "..", "tests", "fixtures", "images");

const IMAGE_PRESETS = [
  {
    filename: "test-landscape.png",
    width: 1920,
    height: 1080,
    title: "Test Landscape",
    subtitle: "Warm dusk gradient",
    gradient: ["#1d4ed8", "#38bdf8"],
    accent: "#fcd34d",
    overlay: "rgba(15, 23, 42, 0.35)",
  },
  {
    filename: "test-portrait.png",
    width: 1080,
    height: 1600,
    title: "Test Portrait",
    subtitle: "Bold sunset hues",
    gradient: ["#f97316", "#facc15"],
    accent: "#2563eb",
    overlay: "rgba(76, 29, 149, 0.3)",
  },
  {
    filename: "test-square.png",
    width: 1280,
    height: 1280,
    title: "Test Square",
    subtitle: "Fresh meadow tones",
    gradient: ["#0f766e", "#34d399"],
    accent: "#f472b6",
    overlay: "rgba(6, 78, 59, 0.28)",
  },
  {
    filename: "test-editorial.png",
    width: 2048,
    height: 1365,
    title: "Test Editorial",
    subtitle: "Muted studio style",
    gradient: ["#0f172a", "#334155"],
    accent: "#e2e8f0",
    overlay: "rgba(15, 23, 42, 0.45)",
  },
];

function buildSvg({ width, height, title, subtitle, gradient, accent, overlay }) {
  const gradientId = `grad-${Math.random().toString(36).slice(2, 8)}`;
  const patternId = `pattern-${Math.random().toString(36).slice(2, 8)}`;
  const fontSize = Math.round(Math.min(width, height) * 0.08);
  const subtitleSize = Math.round(fontSize * 0.45);
  const padding = Math.round(Math.min(width, height) * 0.08);
  const circleRadius = Math.round(Math.min(width, height) * 0.18);
  const stripeWidth = Math.round(Math.max(width, height) * 0.12);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${subtitle}</desc>
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradient[0]}" />
      <stop offset="100%" stop-color="${gradient[1]}" />
    </linearGradient>
    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${stripeWidth}" height="${stripeWidth}">
      <rect width="${stripeWidth}" height="${stripeWidth}" fill="transparent" />
      <path d="M 0 ${stripeWidth} L ${stripeWidth} 0" stroke="rgba(255, 255, 255, 0.18)" stroke-width="${Math.max(4, Math.round(stripeWidth * 0.08))}" />
    </pattern>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#${gradientId})" />
  <rect x="${-stripeWidth / 2}" y="0" width="${width + stripeWidth}" height="${height}" fill="url(#${patternId})" opacity="0.45" />
  <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.24)}" r="${circleRadius}" fill="${accent}" opacity="0.85" />
  <rect x="0" y="${height - padding * 2}" width="${width}" height="${padding * 2}" fill="${overlay}" />
  <text x="${padding}" y="${height - padding * 0.85}" fill="#f8fafc" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="${fontSize}" font-weight="700">
    ${title}
  </text>
  <text x="${padding}" y="${height - padding * 0.25}" fill="#e2e8f0" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="${subtitleSize}" font-weight="400">
     ${subtitle} | ${width}×${height}px
  </text>
</svg>`;
}

async function ensureOutputDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeMetadataFile(dirPath, presets) {
  const metadata = presets.map((preset) => ({
    filename: preset.filename,
    width: preset.width,
    height: preset.height,
    title: preset.title,
    subtitle: preset.subtitle,
    accent: preset.accent,
    gradient: preset.gradient,
  }));

  const metadataPath = path.join(dirPath, "metadata.json");
  await fs.writeFile(metadataPath, JSON.stringify({ generatedAt: new Date().toISOString(), images: metadata }, null, 2));
}

async function generateImages() {
  const { default: sharp } = await import("sharp");

  await ensureOutputDir(OUTPUT_DIR);

  const results = [];
  for (const preset of IMAGE_PRESETS) {
    const svg = buildSvg(preset);
    const svgBuffer = Buffer.from(svg, "utf-8");
    const outputPath = path.join(OUTPUT_DIR, preset.filename);

    await sharp(svgBuffer)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);

    results.push({ filename: preset.filename, path: outputPath });
    console.log(`✅ Generated ${preset.filename}`);
  }

  await writeMetadataFile(OUTPUT_DIR, IMAGE_PRESETS);

  return results;
}

async function main() {
  try {
    console.log("Generating high-quality test images…");
    const created = await generateImages();
    console.log("\nAll images ready! ✨\n");
    created.forEach((file) => {
      console.log(`• ${path.relative(process.cwd(), file.path)}`);
    });
  } catch (error) {
    console.error("Failed to generate test images:", error);
    process.exitCode = 1;
  }
}

main();
