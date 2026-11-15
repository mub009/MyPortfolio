// The sky behind the portfolio: a flock of 90 low-poly birds that regroups into a
// different formation for every section of the page. Built with three.js.
// Build: esbuild src/birds.js --bundle --minify --format=esm --outfile=birds.min.js
import * as THREE from 'three';

const N = 90;
const sections = [...document.querySelectorAll('[data-form]')];
const skyEl = document.querySelector('.sky');
const sunEl = document.querySelector('.sun');
const moonEl = document.querySelector('.moon');
const starsEl = document.querySelector('.stars');
const canvas = document.getElementById('flock');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- sky colours, one keyframe per section (dawn to night) ---------- */
const SKY = [
  ['#a9cfe0', '#ffe6cf', 0],    // hero: dawn
  ['#8cc6e6', '#eaf5f3', 0],    // about
  ['#6fb9e8', '#dff2f8', 0],    // web
  ['#57abe6', '#d5ecfa', 0],    // api
  ['#4aa2e2', '#cfe8f9', 0],    // databases: noon
  ['#55a6de', '#dcf0f5', 0],    // healthcare
  ['#6d9fcb', '#f6e6c4', 0],    // servers: afternoon
  ['#5878b4', '#f9c58d', 0],    // ai: golden hour
  ['#4a5fa0', '#f5ab7c', 0.05], // mobile apps and games
  ['#3c4a8a', '#ef8f6c', 0.2],  // work: sunset
  ['#232b5c', '#a85478', 1],    // experience: dusk
  ['#0a1030', '#27305e', 1],    // contact: night
].map(([a, b, n]) => ({ top: new THREE.Color(a), bot: new THREE.Color(b), night: n }));

// glow night: the whole page under a dark, luminous sky
const SKYG = [
  ['#050b24', '#0b3550'], ['#06102c', '#0a3f55'], ['#071433', '#0b4a58'], ['#08183a', '#0d4f5c'],
  ['#0a1640', '#124a66'], ['#0d1445', '#1b3f70'], ['#120f44', '#2a3577'], ['#170d42', '#3a2d78'],
  ['#190d40', '#40297a'], ['#1a0c3c', '#462a6e'], ['#120a30', '#2d2360'], ['#080820', '#161a48'],
].map(([a, b]) => ({ top: new THREE.Color(a), bot: new THREE.Color(b), night: 1 }));
const isGlow = () => document.documentElement.classList.contains('glow');

const cTop = new THREE.Color(), cBot = new THREE.Color(), cMid = new THREE.Color();
let centers = [], idxF = 0, active = 0, night = 0;

function measure() {
  centers = sections.map(s => s.offsetTop + s.offsetHeight / 2);
}
function readScroll() {
  const y = scrollY + innerHeight / 2;
  let k = 0;
  while (k < centers.length - 2 && y > centers[k + 1]) k++;
  const f = Math.min(1, Math.max(0, (y - centers[k]) / (centers[k + 1] - centers[k] || 1)));
  idxF = k + f;
  active = Math.round(idxF);
  const P = isGlow() ? SKYG : SKY;
  const a = P[Math.min(k, P.length - 1)], b = P[Math.min(k + 1, P.length - 1)];
  cTop.copy(a.top).lerp(b.top, f);
  cBot.copy(a.bot).lerp(b.bot, f);
  cMid.copy(cTop).lerp(cBot, 0.6);
  night = a.night + (b.night - a.night) * f;
  skyEl.style.setProperty('--top', '#' + cTop.getHexString());
  skyEl.style.setProperty('--bot', '#' + cBot.getHexString());
  const p = idxF / (sections.length - 1);            // sun crosses the sky as you scroll
  const sx = 10 + 80 * p, sy = 78 - Math.sin(Math.PI * Math.min(1, p * 1.12)) * 66;
  sunEl.style.transform = `translate(${sx}vw, ${sy}vh) translate(-50%, -50%)`;
  sunEl.style.opacity = String(1 - night);
  moonEl.style.opacity = String(night);
  starsEl.style.opacity = String(night);
  document.documentElement.style.setProperty('--night', String(night));
}
measure(); readScroll();
window.__sky = readScroll;
addEventListener('scroll', readScroll, { passive: true });
addEventListener('resize', () => { measure(); readScroll(); });
addEventListener('load', () => { measure(); readScroll(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); readScroll(); });

/* ---------- formations: where bird i should be at time t (local units) ---------- */
const rnd = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random()]);
const TAU = Math.PI * 2;
function tilt(o, a) {                       // lean the shape toward the camera
  const y = o.y * Math.cos(a) - o.z * Math.sin(a), z = o.y * Math.sin(a) + o.z * Math.cos(a);
  o.y = y; o.z = z;
}
function rrect(u, w, h, r, o) {             // point on a rounded rectangle outline
  const sx = w - 2 * r, sy = h - 2 * r, arc = Math.PI * r / 2, P = 2 * sx + 2 * sy + 4 * arc;
  const hw = w / 2, hh = h / 2; let d = u * P, a;
  if (d < sx) { o.x = -hw + r + d; o.y = hh; return; } d -= sx;
  if (d < arc) { a = Math.PI / 2 - d / r; o.x = hw - r + Math.cos(a) * r; o.y = hh - r + Math.sin(a) * r; return; } d -= arc;
  if (d < sy) { o.x = hw; o.y = hh - r - d; return; } d -= sy;
  if (d < arc) { a = -d / r; o.x = hw - r + Math.cos(a) * r; o.y = -hh + r + Math.sin(a) * r; return; } d -= arc;
  if (d < sx) { o.x = hw - r - d; o.y = -hh; return; } d -= sx;
  if (d < arc) { a = -Math.PI / 2 - d / r; o.x = -hw + r + Math.cos(a) * r; o.y = -hh + r + Math.sin(a) * r; return; } d -= arc;
  if (d < sy) { o.x = -hw; o.y = -hh + r + d; return; } d -= sy;
  a = Math.PI - d / r; o.x = -hw + r + Math.cos(a) * r; o.y = hh - r + Math.sin(a) * r;
}
function line(o, x1, y1, x2, y2, f) { o.x = x1 + (x2 - x1) * f; o.y = y1 + (y2 - y1) * f; o.z = 0; }

let visW = 14, visH = 8, ringH = 1.7;
// where the hair is in the portrait photo (fractions of its width and height): the flock starts there
const portrait = document.querySelector('.portrait img');
const HAIR = [];
{ let seed = 7; const rr = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while (HAIR.length < N) {
    const u = 0.2 + rr() * 0.6, v = 0.04 + rr() * 0.34;
    const outer = ((u - 0.49) / 0.285) ** 2 + ((v - 0.28) / 0.235) ** 2, face = ((u - 0.49) / 0.2) ** 2 + ((v - 0.45) / 0.215) ** 2;
    if (outer < 1 && face > 1 && v < 0.37) HAIR.push([u, v]);
  } }
const HAIR_TIME = 2.8;
const FORMS = {
  // hero: a tilted ring of birds circling the portrait, behind the head and in front of the chest
  swirl(i, t, o) {
    const r = rnd[i], a = t * (0.3 + 0.2 * r[0]) + i * 2.399, R = 1 + 0.32 * r[1], h = ringH;
    o.x = Math.cos(a) * R * h * 1.55; o.z = Math.sin(a) * R * h * 1.2;
    o.y = -Math.sin(a) * h * 1.25 + Math.sin(a * 2 + r[2] * 6) * 0.25;
  },
  // about: the flock spells HI
  hi(i, t, o) {
    if (i < 22) line(o, -2.1, -1.3, -2.1, 1.3, i / 21);
    else if (i < 44) line(o, -0.5, -1.3, -0.5, 1.3, (i - 22) / 21);
    else if (i < 56) line(o, -1.95, 0, -0.65, 0, (i - 44) / 11);
    else if (i < 78) line(o, 1.5, -1.3, 1.5, 1.3, (i - 56) / 21);
    else if (i < 84) line(o, 0.95, 1.3, 2.05, 1.3, (i - 78) / 5);
    else line(o, 0.95, -1.3, 2.05, -1.3, (i - 84) / 5);
    o.y += Math.sin(t * 1.4 + o.x * 1.3) * 0.07; o.flap = 0.8;
  },
  // web apps: weaving a nest, ring by ring, while others bring material
  nest(i, t, o) {
    if (i < 72) {
      const ring = Math.floor(i / 12), j = i % 12, rad = 0.95 + ring * 0.27;
      const a = j / 12 * TAU + ring * 0.26 + t * 0.15;
      o.x = Math.cos(a) * rad; o.z = Math.sin(a) * rad; o.y = -1.1 + ring * 0.24; o.flap = 0.15;
      o.fx = -Math.sin(a); o.fz = Math.cos(a);
    } else {
      const a = t * 0.9 + i * 0.7;
      o.x = Math.cos(a) * 2.7; o.z = Math.sin(a) * 2.0; o.y = 1.3 + Math.sin(a * 2 + i) * 0.5;
    }
    tilt(o, 0.42);
  },
  // APIs: couriers looping between two towers, others waiting on the roofs
  courier(i, t, o) {
    if (i < 48) {
      const side = i < 24 ? -1 : 1, r = rnd[i];
      o.x = side * 2.3 + (r[0] - 0.5) * 0.9; o.y = -0.22; o.z = (r[1] - 0.5) * 0.9;
      o.flap = 0; o.fx = -side; o.fz = 0.5;
    } else {
      const a = TAU * (t * 0.11 + (i - 48) / 42);
      o.x = Math.cos(a) * 2.3; o.y = -0.1 + Math.sin(a) * 1.35; o.z = Math.sin(a) * 0.7;
    }
  },
  // databases: stacked rings, the database cylinder
  cylinder(i, t, o) {
    if (i < 72) {
      const ring = Math.floor(i / 18), a = (i % 18) / 18 * TAU + t * 0.25;
      o.x = Math.cos(a) * 1.7; o.z = Math.sin(a) * 1.7; o.y = -1.35 + ring * 0.9;
      o.fx = -Math.sin(a); o.fz = Math.cos(a);
    } else {
      const k = i - 72, inner = k >= 12, a = (inner ? (k - 12) / 6 : k / 12) * TAU + t * 0.25;
      const rad = inner ? 0.35 : 0.95;
      o.x = Math.cos(a) * rad; o.z = Math.sin(a) * rad; o.y = 1.35;
      o.fx = -Math.sin(a); o.fz = Math.cos(a);
    }
    o.flap = 0.45; tilt(o, 0.26);
  },
  // healthcare and compliance: geese holding a strict V
  vee(i, t, o) {
    const c = Math.floor(i / 30), k = i % 30, m = Math.ceil(k / 2), s = k % 2 ? 1 : -1;
    o.x = 2.6 - c * 1.3 - m * 0.17; o.y = s * m * 0.13 + Math.sin(t * 1.5 + c * 1.3) * 0.08;
    o.z = -m * 0.1 - c * 0.3; o.fx = 1; o.fz = 0.15;
  },
  // servers: the flock at rest on the wires, six sentinels on watch
  wires(i, t, o) {
    if (i < 84) {
      const w = Math.floor(i / 28), j = i % 28;
      o.x = -2.7 + j * 0.2; o.y = wireY(w, o.x) + 0.08; o.z = 0;
      o.flap = 0; o.fx = rnd[i][0] > 0.5 ? 1 : -1; o.fz = 0.6;
    } else {
      const a = t * 0.5 + (i - 84) * TAU / 6;
      o.x = Math.cos(a) * 3.0; o.z = Math.sin(a) * 1.5; o.y = 2.0 + Math.sin(t + i) * 0.12;
    }
  },
  // AI: a chat bubble with three typing dots
  bubble(i, t, o) {
    o.z = 0; o.flap = 0.6;
    if (i < 60) { rrect(i / 60, 4.6, 2.6, 0.6, o); o.y += 0.3; }
    else if (i < 65) line(o, -1.25, -1.05, -1.75, -1.85, (i - 60) / 4);
    else if (i < 69) line(o, -1.5, -1.65, -0.6, -1.05, (i - 65) / 3);
    else {
      const k = i - 69, d = Math.floor(k / 7), j = k % 7;
      const bounce = Math.max(0, Math.sin(t * 2.6 - d * 0.9)) * 0.38;
      const a = j / 6 * TAU, rad = j === 6 ? 0 : 0.2;
      o.x = (d - 1) * 1.05 + Math.cos(a) * rad; o.y = 0.2 + Math.sin(a) * rad + bounce;
    }
  },
  // mobile apps and games: a phone with a play button on its screen
  phone(i, t, o) {
    o.z = 0; o.flap = 0.6;
    if (i < 62) rrect(i / 62, 2.5, 4.1, 0.4, o);
    else {
      const k = i - 62, p = 1 + 0.1 * Math.sin(t * 3);
      if (k < 10) line(o, -0.45, 0.7, -0.45, -0.7, k / 10);
      else if (k < 19) line(o, -0.45, -0.7, 0.65, 0, (k - 10) / 9);
      else line(o, 0.65, 0, -0.45, 0.7, (k - 19) / 9);
      o.x *= p; o.y *= p;
    }
    o.y += Math.sin(t * 1.2 + o.x) * 0.04;
  },
  // work: the flock spreads across the whole sky
  cloud(i, t, o) {
    const r = rnd[i], a = t * (0.2 + r[0] * 0.2) + i;
    o.x = (r[0] - 0.5) * visW * 1.05 + Math.cos(a) * 1.2;
    o.y = (r[1] - 0.5) * visH * 0.85 + Math.sin(a) * 0.6;
    o.z = -1 - r[2] * 6;
  },
  // experience: migration, a long loop out to the horizon and back
  migrate(i, t, o) {
    const r = rnd[i], a = t * 0.14 + (i / N) * 1.5, R = 1 + (r[0] - 0.5) * 0.3;
    o.x = Math.cos(a) * visW * 0.42 * R; o.z = Math.sin(a) * 5 * R - 3.5;
    o.y = Math.sin(a) * 1.3 + (r[1] - 0.5) * 1.3 + 0.4;
  },
  // contact: an envelope
  envelope(i, t, o) {
    o.z = 0; o.flap = 0.6;
    if (i < 60) rrect(i / 60, 4.4, 2.8, 0.12, o);
    else if (i < 75) line(o, -2.1, 1.3, -0.1, -0.15, (i - 60) / 14);
    else line(o, 2.1, 1.3, 0.1, -0.15, (i - 75) / 14);
    o.y += Math.sin(t * 1.2 + o.x) * 0.05;
  },
};
const WORLD = { cloud: 1, migrate: 1 };       // formations that ignore the side offset
function wireY(w, x) { return 1.15 - w * 1.1 - 0.2 * (1 - (x / 2.85) * (x / 2.85)); }

/* ---------- 3D scene ---------- */
function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 13, 42);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10); camera.updateMatrixWorld();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a5a70, 1.5));
  const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sunLight.position.set(3, 6, 5); scene.add(sunLight);

  // bird parts: a pointed body with a tail, and flat wings that hinge at the shoulder
  const geo = arr => { const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
  const body = (r, len, ...parts) => geo(Array.from(new THREE.ConeGeometry(r, len, 5).rotateX(Math.PI / 2)
    .toNonIndexed().attributes.position.array).concat(...parts));
  const fan = (z, w, l) => [0, 0.01, z, -w, 0.01, z - l, w, 0.01, z - l];
  const fork = (z, w, l) => [0, 0.01, z, -w, 0.01, z - l, -w * 0.15, 0.01, z - l * 0.4,
    0, 0.01, z, w * 0.15, 0.01, z - l * 0.4, w, 0.01, z - l];
  const beak = (z, l) => [0, 0, z + l, -0.014, 0, z, 0.014, 0, z];
  const WING = {
    song: geo([0, 0, 0.17, 0, 0, -0.15, 0.66, 0, -0.12, 0, 0, 0.17, 0.66, 0, -0.12, 0.3, 0, 0.1]),
    swallow: geo([0, 0, 0.13, 0, 0, -0.08, 0.8, 0, -0.44, 0, 0, 0.13, 0.8, 0, -0.44, 0.42, 0, 0.03]),
    gull: geo([0, 0, 0.13, 0, 0, -0.1, 0.5, 0, -0.02, 0, 0, 0.13, 0.5, 0, -0.02, 0.45, 0, 0.14,
      0.45, 0, 0.14, 0.5, 0, -0.02, 1.08, 0, -0.2]),
    goose: geo([0, 0, 0.16, 0, 0, -0.14, 0.5, 0, -0.06, 0, 0, 0.16, 0.5, 0, -0.06, 0.45, 0, 0.12,
      0.45, 0, 0.12, 0.5, 0, -0.06, 0.95, 0, -0.16]),
    parrot: geo([0, 0, 0.18, 0, 0, -0.16, 0.6, 0, -0.2, 0, 0, 0.18, 0.6, 0, -0.2, 0.45, 0, 0.1]),
    hummer: geo([0, 0, 0.08, 0, 0, -0.04, 0.44, 0, -0.1]),
    eagle: geo([0, 0, 0.2, 0, 0, -0.22, 0.8, 0, -0.2, 0, 0, 0.2, 0.8, 0, -0.2, 0.78, 0, 0.14,
      0.78, 0, 0.14, 0.8, 0, 0.02, 1.04, 0, 0.1, 0.8, 0, 0.02, 0.8, 0, -0.09, 1.07, 0, -0.04,
      0.8, 0, -0.09, 0.8, 0, -0.2, 1.02, 0, -0.18]),
  };
  // the flock is a mix of species: each has its own shape, size, colours and way of flying
  const SPECIES = [
    { share: 0.26, body: body(0.1, 0.62, fan(-0.26, 0.13, 0.24)), wing: WING.song, size: 0.85, freq: [9, 14], amp: 0.8, glide: 0, pal: [0, 1, 2] },                  // songbird
    { share: 0.2, body: body(0.08, 0.56, fork(-0.22, 0.17, 0.42)), wing: WING.swallow, size: 0.9, freq: [10, 13], amp: 0.7, glide: 0.4, pal: [3, 0] },               // swallow
    { share: 0.14, body: body(0.11, 0.66, fan(-0.28, 0.1, 0.18)), wing: WING.gull, size: 1.25, freq: [5, 7], amp: 0.6, glide: 0.7, pal: [4] },                        // gull
    { share: 0.1, body: body(0.09, 1.0, fan(-0.42, 0.1, 0.16)), wing: WING.goose, size: 1.3, freq: [5, 6.5], amp: 0.65, glide: 0.2, pal: [5, 4] },                    // goose
    { share: 0.13, body: body(0.11, 0.56, fan(-0.22, 0.06, 0.58)), wing: WING.parrot, size: 1.0, freq: [8, 11], amp: 0.8, glide: 0, pal: [6, 7, 8] },                 // parrot
    { share: 0.11, body: body(0.07, 0.36, fan(-0.14, 0.07, 0.14), beak(0.16, 0.26)), wing: WING.hummer, size: 0.62, freq: [30, 38], amp: 1, glide: 0, pal: [6, 9] }, // hummingbird
    { share: 0.06, body: body(0.13, 0.7, fan(-0.3, 0.2, 0.26)), wing: WING.eagle, size: 1.45, freq: [3.5, 4.5], amp: 0.55, glide: 0.85, pal: [5] },                    // eagle
  ];
  const pickSpecies = v => { let acc = 0; for (const sp of SPECIES) { acc += sp.share; if (v < acc) return sp; } return SPECIES[0]; };

  const PAL = [['#12242a', '#f4ecdc', '#62f2ff'], ['#0b6e75', '#7fe3d2', '#8dffb5'], ['#d9631a', '#ffb066', '#ff86e0'],
    ['#1d3f8a', '#9fc0ff', '#7aa8ff'], ['#f4f4ef', '#ffffff', '#e8fbff'], ['#6a4526', '#e3c7a3', '#ffd27a'], ['#2f9a4a', '#9ff0b0', '#7dffa0'],
    ['#c9342b', '#ff9a8f', '#ff6f9a'], ['#e0aa12', '#ffe08a', '#fff07a'], ['#7a3fb8', '#d0b0ff', '#c79bff']]
    .map(([d, n, g]) => ({ day: new THREE.Color(d), night: new THREE.Color(n), glow: new THREE.Color(g),
      mat: new THREE.MeshLambertMaterial({ color: d, flatShading: true, side: THREE.DoubleSide }) }));
  // soft round light used for halos, trails and drifting sparks
  const gc = document.createElement('canvas'); gc.width = gc.height = 64;
  const gx = gc.getContext('2d'), gr = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
  const glowTex = new THREE.CanvasTexture(gc);
  for (const pal of PAL) pal.halo = new THREE.SpriteMaterial({ map: glowTex, color: pal.glow,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.3 });

  const birds = [];
  for (let i = 0; i < N; i++) {
    const r = rnd[i], sp = pickSpecies(r[2]), pal = PAL[sp.pal[Math.floor(r[0] * sp.pal.length)]], mat = pal.mat;
    const g = new THREE.Group();
    const rw = new THREE.Mesh(sp.wing, mat), lw = new THREE.Mesh(sp.wing, mat);
    lw.scale.x = -1;
    g.add(new THREE.Mesh(sp.body, mat), rw, lw);
    const halo = new THREE.Sprite(pal.halo); halo.scale.setScalar(1.5); g.add(halo);
    g.position.set((r[0] - 0.5) * 30, 6 + r[1] * 6, -4 - r[2] * 8);   // they fly in from above
    scene.add(g);
    birds.push({ g, rw, lw, halo, pal, sp, vel: new THREE.Vector3(), size: sp.size * (0.9 + r[1] * 0.25),
      freq: sp.freq[0] + r[1] * (sp.freq[1] - sp.freq[0]), ph: r[2] * TAU, fly: 1 });
  }

  // light trails behind every bird
  const TR = 12, trailPos = new Float32Array(N * TR * 3), trailCol = new Float32Array(N * TR * 3);
  for (let i = 0; i < N; i++) for (let k = 0; k < TR; k++) {
    const f = Math.pow(1 - k / TR, 2) * 0.9, c = birds[i].pal.glow, q = (i * TR + k) * 3, p = birds[i].g.position;
    trailCol[q] = c.r * f; trailCol[q + 1] = c.g * f; trailCol[q + 2] = c.b * f;
    trailPos[q] = p.x; trailPos[q + 1] = p.y; trailPos[q + 2] = p.z;
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const trails = new THREE.Points(trailGeo, new THREE.PointsMaterial({ size: 0.2, map: glowTex, vertexColors: true,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  trails.frustumCulled = false; scene.add(trails);
  // sparks drifting up through the night
  const SP = 260, spPos = new Float32Array(SP * 3), spCol = new Float32Array(SP * 3), spSeed = new Float32Array(SP);
  for (let i = 0; i < SP; i++) {
    spPos[i * 3] = (Math.random() - 0.5) * 30; spPos[i * 3 + 1] = (Math.random() - 0.5) * 13; spPos[i * 3 + 2] = -11 + Math.random() * 14;
    const c = PAL[i % 3].glow, f = 0.35 + Math.random() * 0.65;
    spCol[i * 3] = c.r * f; spCol[i * 3 + 1] = c.g * f; spCol[i * 3 + 2] = c.b * f; spSeed[i] = Math.random() * 10;
  }
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  const spores = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.14, map: glowTex, vertexColors: true,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  spores.frustumCulled = false; scene.add(spores);
  let trailT = 0;

  // clouds for depth
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.9 });
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const clouds = [];
  for (let c = 0; c < 7; c++) {
    const g = new THREE.Group();
    const puffs = 4 + Math.floor(Math.random() * 3);
    for (let p = 0; p < puffs; p++) {
      const m = new THREE.Mesh(ico, cloudMat), s = 0.8 + Math.random() * 0.9;
      m.position.set((p - puffs / 2) * 1.1, Math.random() * 0.5, Math.random() * 0.8);
      m.scale.set(s * 1.3, s * 0.75, s); m.rotation.y = Math.random() * 3;
      g.add(m);
    }
    g.position.set(-24 + c * 7 + Math.random() * 3, -4.5 + Math.random() * 10, -9 - Math.random() * 12);
    g.userData.v = 0.12 + Math.random() * 0.2;
    scene.add(g); clouds.push(g);
  }

  // props that appear with a formation
  const props = {};
  const propMats = [];
  const flat = (c, g) => { const m = new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    m.userData.g = new THREE.Color(g || c); propMats.push(m); return m; };
  { // nest: a twig ring and three eggs
    const g = new THREE.Group(); g.rotation.x = 0.42;
    const twig = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.2, 5, 14).rotateX(Math.PI / 2), flat('#8a5a2b'));
    twig.position.y = -1.25; g.add(twig);
    const egg = new THREE.SphereGeometry(0.24, 8, 6), em = flat('#f6f1e3');
    [[-0.32, 0.1], [0.3, 0.16], [0, -0.3]].forEach(([x, z]) => {
      const e = new THREE.Mesh(egg, em); e.position.set(x, -1.05, z); e.scale.y = 1.3; g.add(e);
    });
    props.nest = g;
  }
  { // two systems that need to talk
    const g = new THREE.Group(), box = new THREE.BoxGeometry(1.15, 2.3, 1.15);
    const a = new THREE.Mesh(box, flat('#0b6e75')), b = new THREE.Mesh(box, flat('#d9631a'));
    a.position.set(-2.3, -1.45, 0); b.position.set(2.3, -1.45, 0); g.add(a, b);
    props.courier = g;
  }
  { // three wires between two poles
    const g = new THREE.Group(), ink = flat('#22343a', '#3fd0e0');
    for (let w = 0; w < 3; w++) {
      const pts = [];
      for (let k = 0; k <= 16; k++) { const x = -2.85 + k * 5.7 / 16; pts.push(new THREE.Vector3(x, wireY(w, x), 0)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.014, 5), ink));
    }
    const pole = new THREE.CylinderGeometry(0.05, 0.07, 4.2, 6);
    [-2.9, 2.9].forEach(x => { const p = new THREE.Mesh(pole, ink); p.position.set(x, -0.75, 0); g.add(p); });
    props.wires = g;
  }
  for (const k in props) { props[k].userData.w = 0; props[k].visible = false; scene.add(props[k]); }

  // pointer: nudges the birds, a click startles them
  const pointer = new THREE.Vector3(), tmp = new THREE.Vector3();
  let pointerOn = 0, px = 0, py = 0;
  function toWorld(e) {
    px = e.clientX / innerWidth * 2 - 1; py = -(e.clientY / innerHeight * 2 - 1);
    tmp.set(px, py, 0.5).unproject(camera).sub(camera.position).normalize();
    pointer.copy(camera.position).addScaledVector(tmp, -camera.position.z / tmp.z);
  }
  const scr = new THREE.Vector3(), hw3 = new THREE.Vector3();
  function screenToWorld(sx, sy, out) {
    scr.set(sx / innerWidth * 2 - 1, -(sy / innerHeight * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize();
    out.copy(camera.position).addScaledVector(scr, -camera.position.z / scr.z);
  }
  let heroT = 0, hairK = 0;
  // the portrait lives inside the 3D scene, so clouds pass behind it and the ring of birds goes around it
  let photo = null, photoGlow = null;
  function makePhoto() {
    const c = document.createElement('canvas'); c.width = 720; c.height = 900;
    const x = c.getContext('2d');
    x.beginPath(); x.roundRect(0, 0, 720, 900, 58); x.clip();
    x.drawImage(portrait, 0, 0, 720, 900);
    const g = x.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, '#000'); g.addColorStop(0.7, '#000'); g.addColorStop(0.99, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, 720, 900);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, fog: false }));
    photoGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x4fe6ff,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.4, fog: false }));
    scene.add(photo, photoGlow);
    document.documentElement.classList.add('photo3d');
  }
  if (portrait) {
    const go = () => { try { makePhoto(); } catch (e) { console.warn(e); } };
    if (portrait.complete && portrait.naturalWidth) go(); else portrait.addEventListener('load', go);
  }
  if (portrait) portrait.parentNode.addEventListener('click', () => { heroT = 0; });
  addEventListener('pointermove', e => { toWorld(e); pointerOn = e.pointerType === 'mouse' ? 2.5 : 0.6; });
  addEventListener('pointerdown', e => {
    toWorld(e);
    for (const b of birds) {
      tmp.copy(b.g.position).sub(pointer); const d = tmp.length();
      if (d < 4) { tmp.normalize(); b.vel.addScaledVector(tmp, 9 * (1 - d / 4)); b.vel.y += 3 * (1 - d / 4); }
    }
  });

  let S = 1, cx = 0, cy = 0, mobile = false;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    visH = 2 * 10 * Math.tan(Math.PI / 8); visW = visH * camera.aspect;
    mobile = w < 860;
  }
  resize(); addEventListener('resize', resize);

  const o = { x: 0, y: 0, z: 0, flap: 1, fx: 1, fz: 0.2 };
  const dummy = new THREE.Object3D(), dir = new THREE.Vector3(), look = new THREE.Vector3(), acc = new THREE.Vector3();
  const fogC = new THREE.Color();
  let t = 0, last = performance.now(), first = true;

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduced) t += dt;

    const sec = sections[active], name = sec.dataset.form, form = FORMS[name] || FORMS.swirl;
    const side = mobile ? 0 : Number(sec.dataset.side || 0);
    const world = WORLD[name];
    const avail = (mobile || side === 0) ? visW : visW / 2;
    const tS = world ? 1 : Math.min(1.05, Math.max(0.4, avail / 6.6));
    const tcx = world ? 0 : side * visW / 4;
    const tcy = world ? 0 : (mobile ? visH * 0.2 : 0.1);
    const ease = first || reduced ? 1 : 1 - Math.exp(-4 * dt);
    S += (tS - S) * ease; cx += (tcx - cx) * ease; cy += (tcy - cy) * ease;
    // hero: everything is anchored to the portrait photo
    let rect = null, hair = false;
    if (portrait && portrait.offsetWidth) rect = portrait.getBoundingClientRect();
    if (photo) {
      const on = !!rect && rect.bottom > -40;
      photo.visible = on; photoGlow.visible = on && isGlow();
      if (on) {
        screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, hw3);
        const w = rect.width / innerWidth * visW;
        photo.position.set(hw3.x, hw3.y, 0); photo.scale.set(w, w * rect.height / rect.width, 1);
        photo.material.color.setScalar(isGlow() ? 0.9 : 1);
        photoGlow.position.set(hw3.x, hw3.y + w * 0.1, -0.3); photoGlow.scale.setScalar(w * 2.7);
      }
    }
    if (name === 'swirl' && rect) {
      heroT += dt;
      hair = !reduced && heroT < HAIR_TIME;
      screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, hw3);
      const pw = rect.width / innerWidth * visW / 2;
      S = Math.min(1.05, Math.max(0.42, pw / 1.7)); ringH = pw / S; cx = hw3.x; cy = hw3.y;
    } else heroT = 0;
    hairK += ((hair ? 1 : 0) - hairK) * (first ? 1 : 1 - Math.exp(-5 * dt));

    const glow = isGlow();
    for (const pal of PAL) {
      if (glow) { pal.mat.color.set(0x0c2230); pal.mat.emissive.copy(pal.glow).multiplyScalar(0.85); }
      else { pal.mat.color.copy(pal.day).lerp(pal.night, night); pal.mat.emissive.set(0); }
    }
    for (const m of propMats) m.emissive.copy(m.userData.g).multiplyScalar(glow ? 0.5 : 0);
    trails.visible = spores.visible = glow;
    cloudMat.opacity = glow ? 0.1 : 0.9 - 0.75 * night;
    fogC.copy(cMid); scene.fog.color.copy(fogC);
    sunLight.intensity = 1.6 - night;

    for (const k in props) {
      const g = props[k], want = k === name ? 1 : 0;
      g.userData.w += (want - g.userData.w) * (reduced ? 1 : 1 - Math.exp(-3 * dt));
      g.visible = g.userData.w > 0.02;
      g.position.set(cx, cy, 0); g.scale.setScalar(Math.max(0.001, S * g.userData.w));
    }

    pointerOn = Math.max(0, pointerOn - dt);
    for (let i = 0; i < N; i++) {
      const b = birds[i], p = b.g.position;
      o.flap = 1; o.fx = 1; o.fz = 0.2; o.z = 0;
      form(i, t, o);
      let tx = cx + o.x * S, ty = cy + o.y * S, tz = o.z * S;
      if (hair) {                       // sit where the hair is
        screenToWorld(rect.left + HAIR[i][0] * rect.width, rect.top + HAIR[i][1] * rect.height, hw3);
        tx = hw3.x; ty = hw3.y; tz = 0.05; o.flap = 0; o.fx = rnd[i][0] > 0.5 ? 1 : -1; o.fz = 0.7;
        if (first) { p.set(tx, ty, tz); b.fly = 0; }
      }
      if (reduced) { p.set(tx, ty, tz); b.vel.set(0, 0, 0); }
      else {
        acc.set(tx - p.x, ty - p.y, tz - p.z).multiplyScalar(7).addScaledVector(b.vel, -3.4);
        const wn = 0.5 * o.flap;
        acc.x += Math.sin(t * 1.3 + b.ph) * wn; acc.y += Math.sin(t * 1.7 + b.ph * 2) * wn; acc.z += Math.sin(t * 1.1 + b.ph * 3) * wn;
        if (pointerOn > 0) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y, d = Math.hypot(dx, dy);
          if (d < 1.5 && d > 0.001 && Math.abs(p.z) < 3) { const f = (1.5 - d) * 34 / d; acc.x += dx * f; acc.y += dy * f; }
        }
        b.vel.addScaledVector(acc, dt);
        const sp0 = b.vel.length(); if (sp0 > 11) b.vel.multiplyScalar(11 / sp0);
        p.addScaledVector(b.vel, dt);
      }
      const sp = b.vel.length();
      if (sp > 0.5) dir.copy(b.vel).multiplyScalar(1 / sp); else dir.set(o.fx, 0, o.fz).normalize();
      dummy.position.copy(p); look.copy(p).add(dir); dummy.lookAt(look);
      b.g.quaternion.slerp(dummy.quaternion, reduced ? 1 : 1 - Math.exp(-7 * dt));
      b.g.scale.setScalar(b.size * 0.55 * (0.55 + 0.45 * S) * (1 - 0.35 * hairK));
      // wings: flap in the air, fold when perched
      const air = Math.max(o.flap, Math.min(1, Math.max(0, (sp - 0.4) / 1.2)));
      b.fly += (air - b.fly) * (reduced ? 1 : 1 - Math.exp(-6 * dt));
      let flapA = 0.2;
      if (!reduced) {                 // big birds glide between wingbeats
        const gl = b.sp.glide ? Math.min(1, Math.max(0, (Math.sin(t * 0.45 + b.ph * 3) + b.sp.glide * 1.2 - 0.6) * 3)) : 0;
        flapA = Math.sin(t * b.freq + b.ph) * b.sp.amp * (1 - gl) + 0.18 * gl;
      }
      const ang = -1.2 + (flapA + 1.2) * b.fly;
      b.rw.rotation.z = ang; b.lw.rotation.z = -ang;
      b.halo.visible = glow;
    }
    if (glow) {
      trailT += dt; const shift = trailT > 0.03; if (shift) trailT = 0;
      for (let i = 0; i < N; i++) {
        const q = i * TR * 3, p = birds[i].g.position;
        if (shift) trailPos.copyWithin(q + 3, q, q + (TR - 1) * 3);
        trailPos[q] = p.x; trailPos[q + 1] = p.y; trailPos[q + 2] = p.z;
      }
      trailGeo.attributes.position.needsUpdate = true;
      if (!reduced) {
        for (let i = 0; i < SP; i++) {
          spPos[i * 3] += Math.sin(t * 0.6 + spSeed[i]) * 0.12 * dt;
          spPos[i * 3 + 1] += (0.12 + (spSeed[i] % 1) * 0.3) * dt;
          if (spPos[i * 3 + 1] > 6.5) spPos[i * 3 + 1] = -6.5;
        }
        spGeo.attributes.position.needsUpdate = true;
      }
    }

    for (const c of clouds) {
      if (!reduced) c.position.x += c.userData.v * dt;
      if (c.position.x > 26) c.position.x = -26;
    }
    if (!reduced) {
      camera.position.x += (px * 0.5 - camera.position.x) * 0.04;
      camera.position.y += (py * 0.3 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    }
    renderer.render(scene, camera);
    first = false;
  }
  requestAnimationFrame(frame);
  document.documentElement.classList.add('has3d');
}

try { start(); } catch (e) { console.warn('3D sky not available:', e); }
