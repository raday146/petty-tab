// Run: node --test test/*.test.mjs   (no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArt, standalone, ORDER, FACES, POSES, ARMS, STICKERS, ICONS, SPECIES } from '../index.js';

const ids = (svg) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const refs = (svg) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
function wellFormed(svg) {
  assert.match(svg, /^<svg class="d/);
  assert.ok(!/undefined|NaN/.test(svg), 'no undefined or NaN in the markup');
  for (const tag of ['svg', 'g', 'clipPath', 'text']) {
    const open = (svg.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (svg.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(open, close, `<${tag}> opened ${open} times, closed ${close}`);
  }
  const own = new Set(ids(svg));
  assert.equal(own.size, ids(svg).length, 'ids are unique inside one drawing');
  for (const r of refs(svg)) assert.ok(own.has(r), `url(#${r}) resolves inside the drawing`);
}

test('nine animals, each with copy, a tint and an avatar frame', () => {
  assert.equal(ORDER.length, 9);
  for (const sp of ORDER) {
    const a = SPECIES[sp];
    assert.ok(a.name && a.tag && a.trait && /^#[0-9a-f]{6}$/i.test(a.bg) && a.vb.split(' ').length === 4, sp);
  }
});

test('every species renders every face, the portrait and every pose and arm', () => {
  for (const sp of ORDER) {
    for (const f of FACES) { wellFormed(createArt({ idPrefix: `h${sp}${f}` }).headSVG(sp, f, 1)); wellFormed(createArt({ idPrefix: `a${sp}${f}` }).avatar(sp, f)); }
    wellFormed(createArt({ idPrefix: `p${sp}` }).portrait(sp));
    for (const pose of POSES) for (const arms of ARMS) wellFormed(createArt({ idPrefix: `f${sp}${pose}${arms}` }).figureSVG(sp, 'smug', -1, pose, { arms }));
  }
});

test('stickers, icons and scenes render', () => {
  const art = createArt({ idPrefix: 's' });
  for (const k of STICKERS) wellFormed(art.sticker(k));
  for (const k of ICONS) wellFormed(art.icon(k));
  wellFormed(art.lumpSVG()); wellFormed(art.cupCrownSVG()); wellFormed(art.scenes.hero()); wellFormed(art.scenes.seal());
  for (const w of ORDER) {
    const l = w === 'bear' ? 'cat' : 'bear';
    wellFormed(createArt({ idPrefix: `v${w}` }).scenes.verdict({ winner: w, loser: l, tokens: ['burrito', 'clock', 'dish'] }));
  }
});

test('story layers are complete and never reuse an id', () => {
  const L = createArt({ idPrefix: 'reel' }).scenes.story({ winner: 'lion', loser: 'sheep', tokens: ['sip', 'trash', 'pan'] });
  const svgs = ['floor', 'sofa', 'winner', 'winnerWink', 'sparkles', 'loserIn', 'loserBuried', 'basket', 'laundry', 'plates', 'orbit'].map((k) => L[k]).concat(L.tokens);
  assert.equal(svgs.length, 14);
  svgs.forEach(wellFormed);
  const all = svgs.flatMap(ids);
  assert.equal(new Set(all).size, all.length);
  assert.equal(L.geometry.unit, 4);
});

test('the same prefix gives identical markup (safe for server rendering)', () => {
  assert.equal(createArt({ idPrefix: 'x' }).portrait('raccoon'), createArt({ idPrefix: 'x' }).portrait('raccoon'));
});

test('different prefixes never collide, React useId values are cleaned', () => {
  const a = new Set(ids(createArt({ idPrefix: 'a' }).avatar('cat')));
  for (const id of ids(createArt({ idPrefix: 'b' }).avatar('cat'))) assert.ok(!a.has(id));
  assert.ok(ids(createArt({ idPrefix: ':r1f:' }).avatar('pup')).every((id) => id.startsWith('r1f-')));
});

test('labels make an accessible image and are escaped; no label means decorative', () => {
  const art = createArt({ idPrefix: 'l' });
  assert.match(art.avatar('cat', 'plain', 'Maya <the Cat>'), /role="img" aria-label="Maya &lt;the Cat&gt;"/);
  assert.match(art.avatar('cat'), /aria-hidden="true"/);
});

test('unknown values fail loudly', () => {
  const art = createArt();
  assert.throws(() => art.avatar('dog'), /Unknown species/);
  assert.throws(() => art.headSVG('cat', 'angry'), /Unknown face/);
  assert.throws(() => art.sticker('nope'), /Unknown sticker/);
  assert.throws(() => art.scenes.verdict({ winner: 'cat', loser: 'dog', tokens: [] }), /Unknown species/);
});

test('scene tokens must be sticker keys, not crime keys', () => {
  const art = createArt();
  assert.throws(() => art.scenes.verdict({ winner: 'cat', loser: 'bear', tokens: ['dj'] }), /Unknown sticker: dj/);
  assert.throws(() => art.scenes.story({ winner: 'cat', loser: 'bear', tokens: ['sip', 'dj'] }), /Unknown sticker: dj/);
  assert.doesNotThrow(() => art.scenes.story({ winner: 'cat', loser: 'bear', tokens: ['sip', 'tape'] }));
});

test('standalone() makes a self-contained file', () => {
  const s = standalone(createArt({ idPrefix: 'z' }).sticker('sip'));
  assert.match(s, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(s, /<style>[^<]*\.d \.o\{stroke:#1b2440/);
});
