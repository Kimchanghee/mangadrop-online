// Creates the gate-fixture cover image (excluded from the site build). Run once: node scripts/make-fixture-image.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const dir = 'src/content/posts/_examples/public/images/examples';
mkdirSync(dir, { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#eeebe2"/><rect x="120" y="170" width="360" height="60" rx="30" fill="#1e6b4f"/><text x="300" y="330" font-family="Consolas" font-size="22" text-anchor="middle" fill="#17201c">GATE FIXTURE IMAGE</text></svg>`;
await sharp(Buffer.from(svg)).png().toFile(`${dir}/fixture-cover.png`);
console.log('fixture image written');
