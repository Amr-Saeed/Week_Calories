// Generates PNG icons from an inline SVG. Run: node scripts/make-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

const glyph = (size, pad) => {
  const s = size - pad * 2;
  return `<g transform="translate(${pad} ${pad}) scale(${s / 512})" fill="none" stroke="#fff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"><circle cx="256" cy="270" r="140" opacity=".35"/><path d="M256 130a140 140 0 0 1 140 140"/><path d="M200 270l40 40 80-90"/></g>`;
};
const svg = (size, { rx, pad }) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${rx}" fill="#10b981"/>${glyph(size, pad)}</svg>`);

const jobs = [
  ['icon-192.png', 192, { rx: 192 * 0.22, pad: 0 }],
  ['icon-512.png', 512, { rx: 512 * 0.22, pad: 0 }],
  // Maskable: full-bleed background, glyph kept inside the central safe zone (~80%).
  ['icon-maskable-512.png', 512, { rx: 0, pad: 60 }],
  ['apple-touch-icon.png', 180, { rx: 0, pad: 14 }],
];
for (const [name, size, opts] of jobs) {
  await sharp(svg(size, opts)).png().toFile(`public/icons/${name}`);
  console.log('wrote', name);
}
