// ──── BOARD GENERATION ────
// Catmull-Rom path, board spaces, decorations, and visual elements

import {
  NUM_SPACES, BOARD_W, BOARD_H, HUB_INDICES, EVENT_CYCLE, FELT_IMAGES,
} from "./constants.js";
import { CAT_COLORS } from "./questions/index.js";

// ──── CATMULL-ROM PATH GENERATION ────
function catmullRomToSvgPath(waypoints) {
  const pts = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
  let d = `M${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function catmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function samplePath(waypoints, n) {
  const pts = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
  const segments = pts.length - 3;
  const points = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * segments;
    const seg = Math.min(Math.floor(t), segments - 1);
    const lt = t - seg;
    points.push(catmullRomPoint(pts[seg], pts[seg + 1], pts[seg + 2], pts[seg + 3], lt));
  }
  return points;
}

// ──── TRAIL WAYPOINTS ────
const TRAIL_WAYPOINTS = [
  { x: 100, y: 1040 }, { x: 260, y: 1000 }, { x: 440, y: 960 },
  { x: 640, y: 920 }, { x: 840, y: 950 }, { x: 1020, y: 1000 },
  { x: 1200, y: 960 }, { x: 1380, y: 900 }, { x: 1540, y: 830 },
  { x: 1660, y: 730 }, { x: 1580, y: 620 }, { x: 1400, y: 560 },
  { x: 1200, y: 530 }, { x: 1000, y: 560 }, { x: 800, y: 600 },
  { x: 600, y: 560 }, { x: 420, y: 500 }, { x: 280, y: 420 },
  { x: 200, y: 320 }, { x: 320, y: 240 }, { x: 500, y: 200 },
  { x: 700, y: 180 }, { x: 900, y: 200 }, { x: 1100, y: 240 },
  { x: 1280, y: 200 }, { x: 1440, y: 140 }, { x: 1600, y: 80 },
  { x: 1700, y: 60 },
];

export const TRAIL_PATH_D = catmullRomToSvgPath(TRAIL_WAYPOINTS);
export const SPACE_POINTS = samplePath(TRAIL_WAYPOINTS, NUM_SPACES);

// ──── BUILD BOARD SPACES ────
let _eventIdx = 0;
export const BOARD_SPACES = SPACE_POINTS.map((pt, i) => {
  const hubIdx = HUB_INDICES.indexOf(i);
  const prev = SPACE_POINTS[Math.max(0, i - 1)];
  const next = SPACE_POINTS[Math.min(SPACE_POINTS.length - 1, i + 1)];
  const angle = Math.atan2(next.y - prev.y, next.x - prev.x) * (180 / Math.PI);
  const isHub = hubIdx >= 0;
  const isEvent = (i + 1) % 5 === 0 && !isHub;
  let eventType = null;
  if (isEvent) {
    eventType = EVENT_CYCLE[_eventIdx % EVENT_CYCLE.length];
    _eventIdx++;
  }
  return {
    id: i,
    x: pt.x,
    y: pt.y,
    angle,
    catIndex: hubIdx >= 0 ? hubIdx : i % 6,
    isHub,
    hubIndex: hubIdx,
    isBonus: isEvent,
    isEvent,
    eventType,
  };
});

// ──── DETERMINISTIC DECORATIONS ────
function seededRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rng = seededRng(42);
function nearPath(x, y, dist = 85) {
  return BOARD_SPACES.some(s => Math.abs(s.x - x) < dist && Math.abs(s.y - y) < dist);
}

export const DECO = [];

const PINE_TYPES = ["pine", "pine", "pine-dark", "pine-dark", "pine-light", "pine-olive", "pine-emerald", "pine-sage"];
for (let i = 0; i < 600; i++) {
  const x = 10 + rng() * (BOARD_W - 20);
  const y = 60 + rng() * (BOARD_H - 70);
  if (!nearPath(x, y, 90)) {
    const type = PINE_TYPES[Math.floor(rng() * PINE_TYPES.length)];
    const scale = 0.3 + rng() * 0.8;
    DECO.push({ type, x, y, scale });
  }
}
for (let i = 0; i < 15; i++) {
  const x = 40 + rng() * (BOARD_W - 80);
  const y = 100 + rng() * (BOARD_H - 140);
  if (!nearPath(x, y, 70)) {
    DECO.push({ type: rng() > 0.5 ? "birch" : "birch2", x, y, scale: 0.6 + rng() * 0.5 });
  }
}
for (let i = 0; i < 10; i++) {
  const x = 50 + rng() * (BOARD_W - 100);
  const y = 50 + rng() * (BOARD_H - 100);
  if (!nearPath(x, y, 75)) DECO.push({ type: "acorn", x, y, scale: 0.6 + rng() * 0.6 });
}
for (let i = 0; i < 12; i++) {
  const x = 40 + rng() * (BOARD_W - 80);
  const y = 40 + rng() * (BOARD_H - 80);
  if (!nearPath(x, y, 78)) DECO.push({ type: "berry-branch", x, y, scale: 0.6 + rng() * 0.5 });
}
for (let i = 0; i < 12; i++) {
  const x = 60 + rng() * (BOARD_W - 120);
  const y = 60 + rng() * (BOARD_H - 120);
  if (!nearPath(x, y, 70)) DECO.push({ type: rng() > 0.5 ? "mushroom-red" : "mushroom-brown", x, y, scale: 0.6 + rng() * 0.5 });
}
for (let i = 0; i < 14; i++) {
  const x = 50 + rng() * (BOARD_W - 100);
  const y = 50 + rng() * (BOARD_H - 100);
  if (!nearPath(x, y, 65)) DECO.push({ type: rng() > 0.5 ? "oak-leaf" : "fern", x, y, scale: 0.5 + rng() * 0.5 });
}
const animalTypes = ["fox", "fox", "rabbit", "rabbit", "owl", "owl", "hedgehog", "squirrel", "bear", "snail"];
for (let i = 0; i < animalTypes.length; i++) {
  const x = 60 + rng() * (BOARD_W - 120);
  const y = 90 + rng() * (BOARD_H - 150);
  if (!nearPath(x, y, 90)) DECO.push({ type: animalTypes[i], x, y, scale: 0.7 + rng() * 0.4 });
}
DECO.sort((a, b) => a.y - b.y);

// ──── STREAM & POND ────
const STREAM_WAYPOINTS = [
  { x: 120, y: 30 }, { x: 165, y: 160 }, { x: 105, y: 300 },
  { x: 175, y: 440 }, { x: 125, y: 580 }, { x: 165, y: 710 },
];
export const STREAM_PATH_D = catmullRomToSvgPath(STREAM_WAYPOINTS);

// ──── FALLING LEAVES ────
export const FALLING_LEAVES = [];
const leafRng = seededRng(77);
for (let i = 0; i < 15; i++) {
  FALLING_LEAVES.push({
    x: 60 + leafRng() * (BOARD_W - 120),
    delay: leafRng() * 18,
    duration: 14 + leafRng() * 10,
    size: 0.6 + leafRng() * 0.7,
    color: ["#8B4513", "#D2691E", "#CD853F", "#DAA520", "#B8860B", "#a0522d", "#6b8e23"][Math.floor(leafRng() * 7)],
  });
}

// ──── TERRAIN ZONES ────
const TERRAIN_ZONES = [
  { start: 0, end: 14, fill: "rgba(30,70,20,0.10)" },
  { start: 15, end: 30, fill: "rgba(50,110,130,0.08)" },
  { start: 31, end: 46, fill: "rgba(110,40,70,0.07)" },
  { start: 47, end: 62, fill: "rgba(90,85,75,0.07)" },
  { start: 63, end: 78, fill: "rgba(150,120,40,0.07)" },
  { start: 79, end: 99, fill: "rgba(40,90,110,0.09)" },
];
export const TERRAIN_REGIONS = TERRAIN_ZONES.map(zone => {
  const pts = SPACE_POINTS.slice(zone.start, zone.end + 1);
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const rx = Math.max(...pts.map(p => Math.abs(p.x - cx))) + 100;
  const ry = Math.max(...pts.map(p => Math.abs(p.y - cy))) + 80;
  return { ...zone, cx, cy, rx, ry };
});

// ──── FIREFLIES ────
export const FIREFLIES = [];
const fireflyRng = seededRng(99);
for (let i = 0; i < 25; i++) {
  FIREFLIES.push({
    x: 40 + fireflyRng() * (BOARD_W - 80),
    y: 40 + fireflyRng() * (BOARD_H - 80),
    delay: fireflyRng() * 12,
    duration: 4 + fireflyRng() * 6,
    size: 2 + fireflyRng() * 3,
  });
}
