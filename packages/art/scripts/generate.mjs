// Writes static SVG exports and a preview gallery from the module. Run: node scripts/generate.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createArt, standalone, ORDER, FACES, STICKERS, ICONS, SPECIES } from '../index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p, s) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), s); };
let n = 0;
const art = () => createArt({ idPrefix: 'g' + (n++) });

for (const sp of ORDER) {
  for (const f of FACES) out(`svg/heads/${sp}-${f}.svg`, standalone(art().headSVG(sp, f, 1)));
  out(`svg/portraits/${sp}.svg`, standalone(art().portrait(sp)));
  out(`svg/figures/${sp}-sit.svg`, standalone(art().figureSVG(sp, 'sig', 1, 'sit')));
  out(`svg/figures/${sp}-lounge-smug.svg`, standalone(art().figureSVG(sp, 'smug', 1, 'lounge', { arms: 'bell' })));
  out(`svg/figures/${sp}-stand-strain.svg`, standalone(art().figureSVG(sp, 'strain', -1, 'stand', { arms: 'up' })));
}
out('svg/lump.svg', standalone(art().lumpSVG()));
out('svg/cup-crown.svg', standalone(art().cupCrownSVG()));
for (const k of STICKERS) out(`svg/stickers/${k}.svg`, standalone(art().sticker(k)));
for (const k of ICONS) out(`svg/icons/${k}.svg`, standalone(art().icon(k)));
out('svg/scenes/hero.svg', standalone(art().scenes.hero()));
out('svg/scenes/verdict-cat-vs-bear.svg', standalone(art().scenes.verdict({ winner: 'cat', loser: 'bear', tokens: ['burrito', 'movie', 'sip'] })));
out('svg/scenes/seal.svg', standalone(art().scenes.seal()));

// gallery: inline SVGs plus art.css, so the idle animations play
const cell = (svg, cap, w = 132, h = 132) => `<figure><div style="width:${w}px;height:${h}px">${svg}</div><figcaption>${cap}</figcaption></figure>`;
let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Petty Tab art</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;800&display=swap"><link rel="stylesheet" href="./art.css">
<style>body{margin:0;padding:24px 16px 48px;background:#f3ead9;color:#1b2440;font:15px/1.4 Rubik,system-ui,sans-serif}h1{font-weight:800;font-size:32px;letter-spacing:-.03em;margin:0 0 4px}h2{font-weight:800;font-size:20px;margin:32px 0 12px}p{margin:0;color:#5d6377}
.row{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;background:#fcf7ec;border-radius:18px;padding:8px}figure svg{width:100%;height:100%}figcaption{font-size:12.5px;color:#5d6377;text-align:center;margin-top:4px}</style></head><body>
<h1>Petty Tab art</h1><p>Generated from index.js by scripts/generate.mjs. Animations come from art.css.</p>`;
html += '<h2>Signature portraits</h2><div class="row">' + ORDER.map(sp => `<figure><div style="width:240px;height:171px;border-radius:12px;overflow:hidden;background:${SPECIES[sp].bg}">${art().portrait(sp)}</div><figcaption>${SPECIES[sp].name}</figcaption></figure>`).join('') + '</div>';
html += '<h2>Faces</h2>' + ORDER.map(sp => '<div class="row" style="margin-bottom:12px">' + FACES.map(f => cell(art().headSVG(sp, f, 1), `${sp} · ${f}`, 110, 110)).join('') + '</div>').join('');
html += '<h2>Figures</h2>' + ORDER.map(sp => '<div class="row" style="margin-bottom:12px">' + [['sig', 1, 'sit', 'rest'], ['smug', 1, 'lounge', 'bell'], ['strain', -1, 'stand', 'up'], ['dizzy', -1, 'sit', 'rest'], ['plain', 1, 'sit', 'crossed']].map(([f, d, p, a]) => cell(art().figureSVG(sp, f, d, p, { arms: a }), `${f} · ${p} · ${a}`, 100, 143)).join('') + '</div>').join('');
html += '<h2>Crime stickers</h2><div class="row">' + STICKERS.map(k => cell(art().sticker(k), k, 80, 80)).join('') + '</div>';
html += '<h2>Icons</h2><div class="row">' + ICONS.map(k => cell(art().icon(k), k, 56, 56)).join('') + '</div>';
html += '<h2>Scenes</h2><div class="row">' + cell(art().scenes.hero(), 'scenes.hero()', 390, 292) + cell(art().scenes.verdict({ winner: 'cat', loser: 'bear', tokens: ['burrito', 'movie', 'sip'] }), 'scenes.verdict()', 390, 218) + cell(art().lumpSVG(), 'lumpSVG()', 200, 190) + cell(art().scenes.seal(), 'scenes.seal()', 140, 140) + '</div>';
html += '</body></html>';
out('preview.html', html);
console.log('written');
