import { useState, useReducer, useCallback, useRef, useEffect } from "react";
import { DEFAULT_QUESTIONS, CATEGORIES, CAT_COLORS, CAT_ICONS, CAT_LABELS_SHORT } from "./data/questions/index.js";

// ──── SOUND SYSTEM (Web Audio API chiptune) ────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new AudioCtx();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}
function playTone(freq, dur, type = "square", vol = 0.12) {
  try {
    const ctx = getAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {}
}
const SFX = {
  click: () => playTone(660, 0.06),
  roll: () => {
    for (let i = 0; i < 6; i++) setTimeout(() => playTone(180 + i * 80, 0.04, "square", 0.08), i * 40);
  },
  land: () => playTone(440, 0.1, "triangle", 0.15),
  correct: () => {
    playTone(523, 0.1, "square", 0.1);
    setTimeout(() => playTone(659, 0.1, "square", 0.1), 100);
    setTimeout(() => playTone(784, 0.15, "square", 0.12), 200);
  },
  wrong: () => {
    playTone(300, 0.15, "sawtooth", 0.1);
    setTimeout(() => playTone(200, 0.2, "sawtooth", 0.1), 120);
  },
  feather: () => {
    [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => playTone(n, 0.12, "square", 0.1), i * 80));
  },
  win: () => {
    [523, 659, 784, 1047, 784, 1047].forEach((n, i) => setTimeout(() => playTone(n, 0.18, "square", 0.12), i * 120));
  },
  tick: () => playTone(1200, 0.02, "sine", 0.06),
  hint: () => {
    playTone(880, 0.08, "triangle", 0.1);
    setTimeout(() => playTone(1100, 0.1, "triangle", 0.1), 80);
  },
  penalty: () => {
    playTone(200, 0.15, "square", 0.12);
    setTimeout(() => playTone(150, 0.2, "square", 0.12), 100);
    setTimeout(() => playTone(100, 0.3, "sawtooth", 0.1), 200);
  },
  hop: () => {
    const f = 280 + Math.random() * 180;
    playTone(f, 0.04, "square", 0.1);
    setTimeout(() => playTone(f * 2, 0.06, "sine", 0.1), 20);
    setTimeout(() => playTone(f * 1.4, 0.05, "triangle", 0.06), 50);
  },
  hopBack: () => {
    const f = 400 + Math.random() * 100;
    playTone(f, 0.06, "sawtooth", 0.08);
    setTimeout(() => playTone(f * 0.6, 0.08, "square", 0.07), 30);
  },
  bonus: () => {
    [660, 880, 1100, 1320].forEach((n, i) => setTimeout(() => playTone(n, 0.08, "square", 0.1), i * 60));
  },
};

// ──── LOCAL STORAGE ────
const STORE_KEYS = { questions: "wt_questions", stats: "wt_stats", settings: "wt_settings" };
function loadStore(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const DEFAULT_SETTINGS = { sound: true, timer: true, timerSeconds: 20, difficulty: "medium" };
const DEFAULT_STATS = {
  gamesPlayed: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  categoryCorrect: {},
  categoryTotal: {},
};
const DIFFICULTY_CONFIG = {
  easy: { timer: 30, hintsPerPlayer: 3, label: "Easy" },
  medium: { timer: 20, hintsPerPlayer: 2, label: "Medium" },
  hard: { timer: 12, hintsPerPlayer: 0, label: "Hard" },
};

// ──── EVENT SPACE DEFINITIONS ────
const EVENT_DEFS = {
  tailwind: { label: "Tailwind!", icon: "\u{1F4A8}", desc: "A forest breeze pushes you forward 3 spaces!" },
  shortcut: { label: "Forest Shortcut!", icon: "\u{1F31F}", desc: "You found a hidden path! Jump forward 5 spaces!" },
  hint_gift: { label: "Wise Owl's Gift!", icon: "\u{1F381}", desc: "The wise owl grants you an extra hint!" },
  swap: { label: "Magical Swap!", icon: "\u{1F500}", desc: "A woodland sprite swaps your position with another player!" },
  double_or_nothing: { label: "Double or Nothing!", icon: "\u{26A1}", desc: "A bold challenge! Correct = +6, Wrong = -6!" },
  bonus_roll: { label: "Bonus Roll!", icon: "\u{1F3B2}", desc: "Lucky you! Roll again for extra movement!" },
};
const EVENT_CYCLE = ["tailwind", "hint_gift", "bonus_roll", "shortcut", "swap", "double_or_nothing"];

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

// ──── LINEAR TRAIL (100 spaces) ────
// Long winding Catmull-Rom path across a wide landscape (viewBox 1800x1100)
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

const NUM_SPACES = 100;
const TRAIL_PATH_D = catmullRomToSvgPath(TRAIL_WAYPOINTS);
const SPACE_POINTS = samplePath(TRAIL_WAYPOINTS, NUM_SPACES);
const HUB_INDICES = [14, 30, 46, 62, 78, 94];
const HUB_NAMES = ["The Old Oak", "Mossy Bridge", "Bramble Hollow", "Rookery Tower", "Magpie's Market", "Blackbird Pond"];

let _eventIdx = 0;
const BOARD_SPACES = SPACE_POINTS.map((pt, i) => {
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

const DECO = [];
const BOARD_W = 1800, BOARD_H = 1100;

// ── Felt image configuration ──
const FELT_IMAGES = {
  pine: { src: "felt/pine-tree.png", w: 50, h: 78 },
  "pine-dark": { src: "felt/pine-dark.png", w: 50, h: 78 },
  "pine-light": { src: "felt/pine-light.png", w: 50, h: 78 },
  "pine-olive": { src: "felt/pine-olive.png", w: 50, h: 78 },
  "pine-emerald": { src: "felt/pine-emerald.png", w: 50, h: 78 },
  "pine-sage": { src: "felt/pine-sage.png", w: 50, h: 78 },
  birch: { src: "felt/birch-tree.png", w: 45, h: 73 },
  "birch2": { src: "felt/birch-tree-2.png", w: 45, h: 73 },
  "berry-branch": { src: "felt/berry-branch.png", w: 35, h: 38 },
  acorn: { src: "felt/acorn.png", w: 28, h: 33 },
  "mushroom-red": { src: "felt/mushroom-red.png", w: 32, h: 37 },
  "mushroom-brown": { src: "felt/mushroom-brown.png", w: 30, h: 28 },
  "oak-leaf": { src: "felt/oak-leaf.png", w: 30, h: 38 },
  fern: { src: "felt/fern.png", w: 35, h: 34 },
  rabbit: { src: "felt/rabbit.png", w: 40, h: 54 },
  fox: { src: "felt/fox.png", w: 45, h: 53 },
  owl: { src: "felt/owl.png", w: 40, h: 44 },
  hedgehog: { src: "felt/hedgehog.png", w: 40, h: 30 },
  squirrel: { src: "felt/squirrel.png", w: 45, h: 37 },
  bear: { src: "felt/bear.png", w: 40, h: 64 },
  snail: { src: "felt/snail.png", w: 38, h: 25 },
};

// Dense pine forests between the trail
const PINE_TYPES = ["pine", "pine", "pine-dark", "pine-dark", "pine-light", "pine-olive", "pine-emerald", "pine-sage"];
for (let i = 0; i < 600; i++) {
  const x = 10 + rng() * (BOARD_W - 20);
  const y = 60 + rng() * (BOARD_H - 70);
  // Keep trees clear of the trail so the path stays visible
  if (!nearPath(x, y, 90)) {
    const type = PINE_TYPES[Math.floor(rng() * PINE_TYPES.length)];
    const scale = 0.3 + rng() * 0.8;  // wide range: small distant trees to large foreground
    DECO.push({ type, x, y, scale });
  }
}
// Scatter a few birch trees for variety
for (let i = 0; i < 15; i++) {
  const x = 40 + rng() * (BOARD_W - 80);
  const y = 100 + rng() * (BOARD_H - 140);
  if (!nearPath(x, y, 70)) {
    DECO.push({ type: rng() > 0.5 ? "birch" : "birch2", x, y, scale: 0.6 + rng() * 0.5 });
  }
}
// Acorns (replacing rocks)
for (let i = 0; i < 10; i++) {
  const x = 50 + rng() * (BOARD_W - 100);
  const y = 50 + rng() * (BOARD_H - 100);
  if (!nearPath(x, y, 75)) DECO.push({ type: "acorn", x, y, scale: 0.6 + rng() * 0.6 });
}
// Berry branches & bushes
for (let i = 0; i < 12; i++) {
  const x = 40 + rng() * (BOARD_W - 80);
  const y = 40 + rng() * (BOARD_H - 80);
  if (!nearPath(x, y, 78)) DECO.push({ type: "berry-branch", x, y, scale: 0.6 + rng() * 0.5 });
}
// Mushrooms (mix of red and brown)
for (let i = 0; i < 12; i++) {
  const x = 60 + rng() * (BOARD_W - 120);
  const y = 60 + rng() * (BOARD_H - 120);
  if (!nearPath(x, y, 70)) DECO.push({ type: rng() > 0.5 ? "mushroom-red" : "mushroom-brown", x, y, scale: 0.6 + rng() * 0.5 });
}
// Leaves & ferns
for (let i = 0; i < 14; i++) {
  const x = 50 + rng() * (BOARD_W - 100);
  const y = 50 + rng() * (BOARD_H - 100);
  if (!nearPath(x, y, 65)) DECO.push({ type: rng() > 0.5 ? "oak-leaf" : "fern", x, y, scale: 0.5 + rng() * 0.5 });
}
// Animals — min Y accounts for tallest animal (bear h:64) at max scale
const animalTypes = ["fox", "fox", "rabbit", "rabbit", "owl", "owl", "hedgehog", "squirrel", "bear", "snail"];
for (let i = 0; i < animalTypes.length; i++) {
  const x = 60 + rng() * (BOARD_W - 120);
  const y = 90 + rng() * (BOARD_H - 150);
  if (!nearPath(x, y, 90)) DECO.push({ type: animalTypes[i], x, y, scale: 0.7 + rng() * 0.4 });
}
// Sort by Y for depth ordering
DECO.sort((a, b) => a.y - b.y);

// ──── STREAM & POND ────
const STREAM_WAYPOINTS = [
  { x: 120, y: 30 }, { x: 165, y: 160 }, { x: 105, y: 300 },
  { x: 175, y: 440 }, { x: 125, y: 580 }, { x: 165, y: 710 },
];
const STREAM_PATH_D2 = catmullRomToSvgPath(STREAM_WAYPOINTS);

// ──── FALLING LEAVES ────
const FALLING_LEAVES = [];
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
const TERRAIN_REGIONS = TERRAIN_ZONES.map(zone => {
  const pts = SPACE_POINTS.slice(zone.start, zone.end + 1);
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const rx = Math.max(...pts.map(p => Math.abs(p.x - cx))) + 100;
  const ry = Math.max(...pts.map(p => Math.abs(p.y - cy))) + 80;
  return { ...zone, cx, cy, rx, ry };
});

// ──── FIREFLIES ────
const FIREFLIES = [];
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

// ──── PLAYER CONFIG ────
const BIRD_NAMES = ["Pheasant", "Hen", "Pigeon", "Duck"];
const BIRD_COLORS = ["#8a5a30", "#c8baa8", "#7888a0", "#b8a070"];
const BIRD_ACCENTS = ["#c05040", "#d4a850", "#5878a8", "#508848"];
const BIRD_EMOJIS = ["\u{1F426}\u{200D}\u{2B1B}", "\u{1F414}", "\u{1F54A}\u{FE0F}", "\u{1F986}"];
const BIRD_IMAGES = ["felt/bird-pheasant.png", "felt/bird-chicken.png", "felt/bird-pigeon.png", "felt/bird-duck.png"];

// ──── GAME REDUCER ────
function makeInitialState(playerCount, names, ages, difficulty) {
  const diff = DIFFICULTY_CONFIG[difficulty || "medium"];
  const pc = playerCount || 2;
  return {
    phase: "setup",
    playerCount: pc,
    difficulty: difficulty || "medium",
    players: Array.from({ length: pc }, (_, i) => ({
      id: i,
      name: (names && names[i]) || BIRD_NAMES[i],
      age: (ages && ages[i]) || 8,
      color: BIRD_COLORS[i],
      accent: BIRD_ACCENTS[i],
      emoji: BIRD_EMOJIS[i],
      birdImage: BIRD_IMAGES[i],
      position: 0,
      feathers: [false, false, false, false, false, false],
      hints: diff.hintsPerPlayer,
      wrongStreak: 0,
      correctStreak: 0,
    })),
    currentPlayer: 0,
    diceValue: null,
    currentQuestion: null,
    currentCatIndex: null,
    selectedAnswer: null,
    answerRevealed: false,
    questions: loadStore(STORE_KEYS.questions, null) || JSON.parse(JSON.stringify(DEFAULT_QUESTIONS)),
    winner: null,
    message: "",
    eliminatedOptions: [],
    showStats: false,
    showEditor: false,
    showSettings: false,
    timerExpired: false,
    askedQuestions: [],
    // New features
    currentEvent: null,
    doubleOrNothing: false,
    streakReward: null,
    turnHistory: [],
    gameStats: {
      turns: 0,
      byPlayer: Object.fromEntries(
        Array.from({ length: pc }, (_, i) => [i, { questions: 0, correct: 0, bestStreak: 0 }])
      ),
    },
  };
}

function gameReducer(state, action) {
  switch (action.type) {
    case "SET_PLAYERS":
      return makeInitialState(action.count, action.names, action.ages, state.difficulty);
    case "SET_DIFFICULTY":
      return {
        ...makeInitialState(state.playerCount, state.players.map(p => p.name), state.players.map(p => p.age), action.difficulty),
        phase: "setup",
      };
    case "START_GAME":
      return {
        ...state,
        phase: "playing",
        message: `${state.players[0].name}'s turn! Roll the dice!`,
      };
    case "ROLL_DICE": {
      const val = action.value;
      const bonus = action.bonus || 0;
      const catchupBonus = action.catchupBonus || 0;
      const p = state.players[state.currentPlayer];
      const preRollPos = p.position;
      const newPos = Math.min(p.position + val + bonus + catchupBonus, NUM_SPACES - 1);
      const space = BOARD_SPACES[newPos];
      const newPlayers = state.players.map((pl, i) => (i === state.currentPlayer ? { ...pl, position: newPos } : pl));
      const catIndex = space.catIndex;
      const streakOverride = p.wrongStreak >= 3;
      const diceDifficulty = streakOverride ? "easy" : (val <= 2 ? "easy" : val <= 4 ? "medium" : "hard");
      const streakMsg = streakOverride ? " (easier question!)" : "";
      const catchupMsg = catchupBonus > 0 ? ` (+${catchupBonus} catch-up!)` : "";
      const rollMsg = bonus > 0 ? `${val} + ${bonus} bonus` : `${val}`;

      // HUB SPACE — player chooses which feather category to attempt
      if (space.isHub) {
        return {
          ...state,
          players: newPlayers,
          diceValue: val,
          preRollPosition: preRollPos,
          phase: "hub_choice",
          diceDifficulty,
          currentCatIndex: null,
          currentQuestion: null,
          currentEvent: null,
          doubleOrNothing: false,
          message: `${p.name} rolled ${rollMsg}${catchupMsg} — arrived at ${HUB_NAMES[space.hubIndex]}! Choose a feather!`,
          turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: `Rolled ${rollMsg}${catchupMsg} \u2192 ${HUB_NAMES[space.hubIndex]}` }],
        };
      }

      // EVENT SPACE — trigger event overlay
      if (space.isEvent && space.eventType) {
        return {
          ...state,
          players: newPlayers,
          diceValue: val,
          preRollPosition: preRollPos,
          phase: "event",
          currentEvent: space.eventType,
          diceDifficulty,
          currentCatIndex: catIndex,
          currentQuestion: null,
          doubleOrNothing: false,
          message: `${p.name} rolled ${rollMsg}${catchupMsg} — ${EVENT_DEFS[space.eventType].label}`,
          turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: `Rolled ${rollMsg}${catchupMsg} \u2192 ${EVENT_DEFS[space.eventType].label}` }],
        };
      }

      // REGULAR SPACE — select question
      const playerAge = p.age || 99;
      let qs = state.questions[CATEGORIES[catIndex]] || [];
      const diffFiltered = qs.filter(q => q.difficulty === diceDifficulty);
      if (diffFiltered.length > 0) qs = diffFiltered;
      qs = qs.filter(q => (q.ageMin || 0) <= playerAge);
      let available = qs.filter(q => !state.askedQuestions.includes(q.question));
      if (available.length === 0) available = qs;
      if (available.length === 0) available = state.questions[CATEGORIES[catIndex]] || [];
      if (available.length === 0) {
        return {
          ...state,
          players: newPlayers,
          diceValue: val,
          preRollPosition: preRollPos,
          currentPlayer: (state.currentPlayer + 1) % state.playerCount,
          message: `${p.name} rolled ${val}. No questions! Next turn.`,
        };
      }
      const question = available[Math.floor(Math.random() * available.length)];
      return {
        ...state,
        players: newPlayers,
        diceValue: val,
        preRollPosition: preRollPos,
        phase: "question",
        currentQuestion: question,
        currentCatIndex: catIndex,
        selectedAnswer: null,
        answerRevealed: false,
        eliminatedOptions: [],
        timerExpired: false,
        doubleOrNothing: false,
        currentEvent: null,
        askedQuestions: [...state.askedQuestions, question.question],
        diceDifficulty,
        questionStartTime: Date.now(),
        message: `${p.name} rolled ${rollMsg}${catchupMsg} — ${diceDifficulty.toUpperCase()} ${CAT_LABELS_SHORT[catIndex]} question!${streakMsg}`,
        turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: `Rolled ${rollMsg}${catchupMsg} \u2192 ${CAT_LABELS_SHORT[catIndex]} question` }],
      };
    }
    case "CHOOSE_HUB_CATEGORY": {
      const p = state.players[state.currentPlayer];
      const catIndex = action.catIndex;
      const playerAge = p.age || 99;
      const diceDifficulty = state.diceDifficulty || "medium";
      let qs = state.questions[CATEGORIES[catIndex]] || [];
      const diffFiltered = qs.filter(q => q.difficulty === diceDifficulty);
      if (diffFiltered.length > 0) qs = diffFiltered;
      qs = qs.filter(q => (q.ageMin || 0) <= playerAge);
      let available = qs.filter(q => !state.askedQuestions.includes(q.question));
      if (available.length === 0) available = qs;
      if (available.length === 0) available = state.questions[CATEGORIES[catIndex]] || [];
      if (available.length === 0) {
        return { ...state, phase: "playing", message: `No ${CAT_LABELS_SHORT[catIndex]} questions available!` };
      }
      const question = available[Math.floor(Math.random() * available.length)];
      return {
        ...state,
        phase: "question",
        currentQuestion: question,
        currentCatIndex: catIndex,
        selectedAnswer: null,
        answerRevealed: false,
        eliminatedOptions: [],
        timerExpired: false,
        askedQuestions: [...state.askedQuestions, question.question],
        questionStartTime: Date.now(),
        message: `${p.name} chose ${CATEGORIES[catIndex]}!`,
      };
    }
    case "RESOLVE_EVENT": {
      const p = state.players[state.currentPlayer];
      const event = state.currentEvent;
      let newPlayers = state.players.map(pl => ({ ...pl }));
      let historyText = "";
      let newPos = p.position;

      switch (event) {
        case "hint_gift":
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], hints: newPlayers[state.currentPlayer].hints + 1 };
          historyText = `${p.name} received an extra hint!`;
          break;
        case "tailwind":
          newPos = Math.min(p.position + 3, NUM_SPACES - 1);
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: newPos };
          historyText = `Tailwind pushed ${p.name} forward 3!`;
          break;
        case "shortcut":
          newPos = Math.min(p.position + 5, NUM_SPACES - 1);
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: newPos };
          historyText = `${p.name} found a shortcut! +5!`;
          break;
        case "swap":
          if (action.targetPlayer !== undefined && action.targetPlayer !== state.currentPlayer) {
            const myPos = newPlayers[state.currentPlayer].position;
            const theirPos = newPlayers[action.targetPlayer].position;
            newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: theirPos };
            newPlayers[action.targetPlayer] = { ...newPlayers[action.targetPlayer], position: myPos };
            newPos = theirPos;
            historyText = `${p.name} swapped with ${newPlayers[action.targetPlayer].name}!`;
          }
          break;
        case "bonus_roll": {
          const bv = action.bonusValue || 0;
          newPos = Math.min(p.position + bv, NUM_SPACES - 1);
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: newPos };
          historyText = `Bonus roll! ${p.name} +${bv} spaces!`;
          break;
        }
        case "double_or_nothing":
          historyText = `${p.name} accepts the Double or Nothing challenge!`;
          break;
        default: break;
      }

      // Check if event movement landed on a hub
      const landSpace = BOARD_SPACES[newPos];
      if (landSpace.isHub && event !== "double_or_nothing") {
        return {
          ...state,
          players: newPlayers,
          phase: "hub_choice",
          currentEvent: null,
          message: historyText + ` Landed at ${HUB_NAMES[landSpace.hubIndex]}!`,
          turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: historyText }],
        };
      }

      // Select a question for the current position
      const catIndex = landSpace.catIndex;
      const playerAge = p.age || 99;
      const diceDifficulty = event === "double_or_nothing" ? "hard" : (state.diceDifficulty || "medium");
      let qs = state.questions[CATEGORIES[catIndex]] || [];
      const diffFiltered = qs.filter(q => q.difficulty === diceDifficulty);
      if (diffFiltered.length > 0) qs = diffFiltered;
      qs = qs.filter(q => (q.ageMin || 0) <= playerAge);
      let available = qs.filter(q => !state.askedQuestions.includes(q.question));
      if (available.length === 0) available = qs;
      if (available.length === 0) available = state.questions[CATEGORIES[catIndex]] || [];
      if (available.length === 0) {
        return {
          ...state, players: newPlayers, phase: "playing", currentEvent: null,
          currentPlayer: (state.currentPlayer + 1) % state.playerCount,
          message: historyText + " No questions available!",
        };
      }
      const question = available[Math.floor(Math.random() * available.length)];
      return {
        ...state,
        players: newPlayers,
        phase: "question",
        currentEvent: null,
        doubleOrNothing: event === "double_or_nothing",
        currentQuestion: question,
        currentCatIndex: catIndex,
        selectedAnswer: null,
        answerRevealed: false,
        eliminatedOptions: [],
        timerExpired: false,
        askedQuestions: [...state.askedQuestions, question.question],
        questionStartTime: Date.now(),
        message: historyText,
        turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: historyText }],
      };
    }
    case "ANSWER": {
      const correct = action.answer === state.currentQuestion.answer;
      const p = state.players[state.currentPlayer];
      const space = BOARD_SPACES[p.position];
      const speedBonus = correct && !state.doubleOrNothing && state.questionStartTime && (Date.now() - state.questionStartTime) <= 4000;
      let newPlayers = state.players.map(pl => ({ ...pl }));

      // Track streaks
      const oldStreak = newPlayers[state.currentPlayer].correctStreak || 0;
      const newStreak = correct ? oldStreak + 1 : 0;
      newPlayers[state.currentPlayer] = {
        ...newPlayers[state.currentPlayer],
        wrongStreak: correct ? 0 : (newPlayers[state.currentPlayer].wrongStreak || 0) + 1,
        correctStreak: newStreak,
      };

      // Streak rewards
      let streakReward = null;
      if (newStreak === 3) {
        newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], hints: newPlayers[state.currentPlayer].hints + 1 };
        streakReward = "3 in a row! +1 Hint!";
      } else if (newStreak === 5) {
        const sPos = Math.min(newPlayers[state.currentPlayer].position + 3, NUM_SPACES - 1);
        newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: sPos };
        streakReward = "5 in a row! +3 Spaces!";
      }

      // Update per-game stats
      const gs = { ...state.gameStats };
      const ps = { ...(gs.byPlayer[state.currentPlayer] || { questions: 0, correct: 0, bestStreak: 0 }) };
      ps.questions++;
      if (correct) ps.correct++;
      ps.bestStreak = Math.max(ps.bestStreak, newStreak);
      gs.byPlayer = { ...gs.byPlayer, [state.currentPlayer]: ps };

      // Double or nothing — special handling
      if (state.doubleOrNothing) {
        if (correct) {
          const dnPos = Math.min(p.position + 6, NUM_SPACES - 1);
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: dnPos };
        } else {
          const dnPos = Math.max(0, p.position - 6);
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: dnPos };
        }
        const dnMsg = correct ? `DOUBLE OR NOTHING: Correct! +6 spaces!` : `DOUBLE OR NOTHING: Wrong! -6 spaces!`;
        return {
          ...state,
          selectedAnswer: action.answer,
          answerRevealed: true,
          players: newPlayers,
          winner: null,
          speedBonus: false,
          streakReward,
          gameStats: gs,
          message: dnMsg + (streakReward ? ` ${streakReward}` : ""),
          turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: dnMsg }],
        };
      }

      let winner = null;
      if (correct) {
        if (speedBonus) {
          const bonusPos = Math.min(newPlayers[state.currentPlayer].position + 1, NUM_SPACES - 1);
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: bonusPos };
        }
        if (space.isHub) {
          const f = [...newPlayers[state.currentPlayer].feathers];
          f[state.currentCatIndex] = true;
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], feathers: f };
          if (f.every(Boolean)) winner = state.currentPlayer;
        }
        // Bump other players on the same space back 3
        const bumpedNames = [];
        for (let bi = 0; bi < newPlayers.length; bi++) {
          if (bi !== state.currentPlayer && newPlayers[bi].position === p.position) {
            newPlayers[bi] = { ...newPlayers[bi], position: Math.max(0, newPlayers[bi].position - 3) };
            bumpedNames.push(newPlayers[bi].name);
          }
        }
        const parts = [];
        if (winner !== null) { parts.push(`${p.name} wins the game!`); }
        else {
          parts.push("Correct!");
          if (speedBonus) parts.push("SPEED BONUS +1!");
          if (space.isHub) parts.push(`${p.name} earns a ${CAT_LABELS_SHORT[state.currentCatIndex]} feather!`);
          if (bumpedNames.length > 0) parts.push(`Bumped ${bumpedNames.join(" & ")} back 3!`);
          if (streakReward) parts.push(streakReward);
        }
        return {
          ...state,
          selectedAnswer: action.answer,
          answerRevealed: true,
          players: newPlayers,
          winner,
          speedBonus,
          streakReward,
          gameStats: gs,
          message: parts.join(" "),
          turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: parts.join(" ") }],
        };
      }
      // Wrong answer
      return {
        ...state,
        selectedAnswer: action.answer,
        answerRevealed: true,
        players: newPlayers,
        winner: null,
        speedBonus: false,
        streakReward,
        gameStats: gs,
        message: `Wrong! The answer was: ${state.currentQuestion.answer}`,
        turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: `Wrong! Answer: ${state.currentQuestion.answer}` }],
      };
    }
    case "TIMER_EXPIRED":
      return {
        ...state,
        answerRevealed: true,
        timerExpired: true,
        selectedAnswer: null,
        message: `Time's up! The answer was: ${state.currentQuestion.answer}`,
      };
    case "USE_HINT": {
      const p = state.players[state.currentPlayer];
      if (p.hints <= 0 || state.answerRevealed) return state;
      const wrongOpts = state.currentQuestion.options.filter(
        o => o !== state.currentQuestion.answer && !state.eliminatedOptions.includes(o)
      );
      const toRemove = wrongOpts.sort(() => Math.random() - 0.5).slice(0, 2);
      const newPlayers = state.players.map((pl, i) =>
        i === state.currentPlayer ? { ...pl, hints: pl.hints - 1 } : pl
      );
      return { ...state, players: newPlayers, eliminatedOptions: [...state.eliminatedOptions, ...toRemove] };
    }
    case "PENALTY_MOVE": {
      const p = state.players[state.currentPlayer];
      const originalPos = state.preRollPosition !== undefined ? state.preRollPosition : p.position;
      const newPos = Math.max(0, originalPos - action.value);
      const spacesLost = originalPos - newPos;
      const newPlayers = state.players.map((pl, i) =>
        i === state.currentPlayer ? { ...pl, position: newPos } : pl
      );
      return {
        ...state,
        players: newPlayers,
        message: `${p.name} goes back ${spacesLost} space${spacesLost !== 1 ? "s" : ""} to ${newPos + 1}!`,
      };
    }
    case "NEXT_TURN": {
      if (state.winner !== null) return { ...state, phase: "gameover" };
      const next = (state.currentPlayer + 1) % state.playerCount;
      const gs = { ...state.gameStats, turns: (state.gameStats.turns || 0) + 1 };
      return {
        ...state,
        phase: "playing",
        currentPlayer: next,
        currentQuestion: null,
        selectedAnswer: null,
        answerRevealed: false,
        diceValue: null,
        eliminatedOptions: [],
        timerExpired: false,
        doubleOrNothing: false,
        currentEvent: null,
        streakReward: null,
        gameStats: gs,
        message: `${state.players[next].name}'s turn! Roll the dice!`,
      };
    }
    case "TOGGLE_EDITOR":
      return { ...state, showEditor: !state.showEditor };
    case "TOGGLE_STATS":
      return { ...state, showStats: !state.showStats };
    case "TOGGLE_SETTINGS":
      return { ...state, showSettings: !state.showSettings };
    case "UPDATE_QUESTIONS":
      saveStore(STORE_KEYS.questions, action.questions);
      return { ...state, questions: action.questions };
    case "RESET":
      return makeInitialState(state.playerCount, state.players.map(p => p.name), state.players.map(p => p.age), state.difficulty);
    default:
      return state;
  }
}

// ──── FELT IMAGE DECORATION ────
function FeltDecoration({ item }) {
  const cfg = FELT_IMAGES[item.type];
  if (!cfg) return null;
  const s = item.scale || 1;
  const w = cfg.w * s;
  const h = cfg.h * s;
  const isTree = item.type.includes("pine") || item.type.includes("birch");
  const isAnimal = ["fox","rabbit","owl","hedgehog","squirrel","bear","snail"].includes(item.type);
  // Only animate ~1 in 4 trees for performance (use position as deterministic selector)
  const shouldAnimate = isTree ? (Math.round(item.x + item.y) % 4 === 0) : true;
  const animStyle = (isTree && shouldAnimate) ? {
    transformOrigin: `${item.x}px ${item.y}px`,
    animation: `treeSway ${5 + s * 3}s ease-in-out ${((item.x * 7 + item.y * 3) % 400) / 100}s infinite`,
  } : isAnimal ? {
    transformOrigin: `${item.x}px ${item.y}px`,
    animation: `animalBreathe ${3 + ((item.x * 13) % 200) / 100}s ease-in-out ${((item.y * 11) % 300) / 100}s infinite`,
  } : {};
  return (
    <g style={animStyle}>
      <image
        href={cfg.src}
        x={item.x - w / 2}
        y={item.y - h}
        width={w}
        height={h}
        opacity={0.92}
      />
    </g>
  );
}


// ──── SVG FELT BIRD TOKENS ────
const FELT_BIRDS = [
  { body: "#a06830", belly: "#c8a070", wing: "#8a5020", wingInner: "#c05040",
    head: "#7a4a28", beak: "#d4a850", tail1: "#4a7868", tail2: "#c87040", tail3: "#8a5a30",
    wattle: "#c05040" },
  { body: "#e8dcc8", belly: "#f5edd8", wing: "#d8c8a8", wingInner: "#c8b898",
    head: "#e8dcc8", beak: "#d4a850", tail1: "#c8b898", tail2: "#d8c8a8", tail3: "#e0d4be",
    comb: "#c05040" },
  { body: "#8898b0", belly: "#a0b0c0", wing: "#6878a0", wingInner: "#5868a0",
    head: "#8898b0", beak: "#988878", tail1: "#6878a0", tail2: "#5868a0", tail3: "#7888a0",
    neckSheen: "#7a68b0" },
  { body: "#a89870", belly: "#c8b898", wing: "#8a7a58", wingInner: "#6a6040",
    head: "#3a7838", beak: "#d4a850", tail1: "#8a7a58", tail2: "#6a6040", tail3: "#a89870",
    neckRing: "#f0e8d8", flatBill: true },
];

function FeltBirdSvgBody({ b }) {
  const st = "rgba(90,74,53,0.7)";
  return (
    <>
      {/* Tail feathers */}
      <path d="M-22,2 C-32,-8 -38,-18 -34,-25 C-28,-15 -24,-8 -20,0Z" fill={b.tail1} stroke={st} strokeWidth={1} strokeDasharray="3,2" />
      <path d="M-20,5 C-35,0 -40,-8 -36,-18 C-30,-6 -25,0 -18,4Z" fill={b.tail2} stroke={st} strokeWidth={1} strokeDasharray="3,2" opacity={0.9} />
      <path d="M-18,6 C-30,6 -36,2 -34,-5 C-28,2 -22,5 -16,6Z" fill={b.tail3} stroke={st} strokeWidth={0.8} strokeDasharray="2,2" opacity={0.8} />
      {/* Body */}
      <ellipse cx={0} cy={0} rx={22} ry={15} fill={b.body} stroke={st} strokeWidth={1.5} strokeDasharray="3,2" />
      <ellipse cx={2} cy={4} rx={14} ry={8} fill={b.belly} opacity={0.5} />
      {/* Wing */}
      <path d="M-4,-4 C0,-12 10,-12 14,-8 C10,-2 4,2 -2,2Z" fill={b.wing} stroke={st} strokeWidth={1} strokeDasharray="2,2" />
      <path d="M0,-4 C3,-9 8,-9 11,-7 C8,-3 4,0 1,0Z" fill={b.wingInner} opacity={0.5} />
      {/* Head */}
      <circle cx={19} cy={-9} r={10} fill={b.head} stroke={st} strokeWidth={1.2} strokeDasharray="3,2" />
      {b.wattle && <path d="M22,-4 C25,-2 27,-5 26,-8 C24,-5 23,-4 22,-4Z" fill={b.wattle} opacity={0.7} />}
      {b.comb && <path d="M15,-18 C16,-23 18,-22 19,-18 C20,-23 22,-22 23,-18" fill={b.comb} stroke={st} strokeWidth={0.8} strokeDasharray="2,2" />}
      {b.neckRing && <ellipse cx={14} cy={-1} rx={5} ry={2} fill={b.neckRing} opacity={0.7} />}
      {b.neckSheen && <path d="M12,-2 C15,-5 18,-6 20,-3 C17,-1 14,0 12,-2Z" fill={b.neckSheen} opacity={0.4} />}
      {/* Eye */}
      <circle cx={23} cy={-11} r={2.2} fill="#1a1a1a" />
      <circle cx={23.8} cy={-11.8} r={0.7} fill="white" />
      {/* Beak */}
      {b.flatBill ? (
        <path d="M28,-8 L37,-6.5 L36,-3.5 L28,-5Z" fill={b.beak} stroke={st} strokeWidth={0.8} />
      ) : (
        <polygon points="28,-9 35,-7 28,-5" fill={b.beak} stroke={st} strokeWidth={0.8} />
      )}
      {/* Feet */}
      <g stroke={st} strokeWidth={1.2} strokeLinecap="round" fill="none">
        <line x1={-4} y1={14} x2={-6} y2={22} /><line x1={-9} y1={22} x2={-3} y2={22} />
        <line x1={6} y1={14} x2={8} y2={22} /><line x1={5} y1={22} x2={11} y2={22} />
      </g>
    </>
  );
}

function FeltBirdToken({ birdIndex }) {
  const b = FELT_BIRDS[birdIndex] || FELT_BIRDS[0];
  return (
    <g transform="translate(0,-45) scale(1.5)">
      <FeltBirdSvgBody b={b} />
    </g>
  );
}

// Inline HTML felt bird icon for sidebars/panels
function FeltBirdIcon({ birdIndex, size = 40 }) {
  const b = FELT_BIRDS[birdIndex] || FELT_BIRDS[0];
  return (
    <svg width={size} height={size} viewBox="-40 -28 80 55" style={{ display: "block" }}>
      <FeltBirdSvgBody b={b} />
    </svg>
  );
}

// ──── HUB LANDMARK ILLUSTRATIONS ────
function HubLandmark({ hubIndex, x, y }) {
  const st = "rgba(90,74,53,0.45)";
  const landmarks = [
    () => ( // The Old Oak
      <g transform={`translate(${x},${y - 10})`} opacity={0.55}>
        <path d="M-6,25 L-10,55 L10,55 L6,25Z" fill="#6a4a28" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <path d="M-6,30 L-3,25 L3,25 L6,30" fill="#5a3a18" opacity={0.4} />
        <ellipse cx={0} cy={-8} rx={42} ry={32} fill="#3a6828" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <ellipse cx={-14} cy={-14} rx={18} ry={16} fill="#4a7838" opacity={0.6} />
        <ellipse cx={16} cy={-4} rx={20} ry={18} fill="#3a5828" opacity={0.5} />
        <ellipse cx={-1} cy={18} rx={4} ry={6} fill="#2a1a08" opacity={0.5} />
      </g>
    ),
    () => ( // Mossy Bridge
      <g transform={`translate(${x},${y})`} opacity={0.55}>
        <path d="M-38,12 C-28,-12 28,-12 38,12" fill="#8a8070" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <path d="M-38,12 C-25,-2 25,-2 38,12" fill="#9a9080" opacity={0.7} />
        <rect x={-38} y={12} width={8} height={16} rx={2} fill="#7a7060" stroke={st} strokeWidth={1} strokeDasharray="3,2" />
        <rect x={30} y={12} width={8} height={16} rx={2} fill="#7a7060" stroke={st} strokeWidth={1} strokeDasharray="3,2" />
        <circle cx={-8} cy={-4} r={5} fill="#5a8838" opacity={0.45} />
        <circle cx={12} cy={-2} r={4} fill="#4a7828" opacity={0.35} />
        <path d="M-28,18 C-12,24 12,24 28,18" fill="none" stroke="#7aaccc" strokeWidth={2.5} opacity={0.35} />
      </g>
    ),
    () => ( // Bramble Hollow
      <g transform={`translate(${x},${y})`} opacity={0.55}>
        <ellipse cx={0} cy={5} rx={38} ry={22} fill="#5a7838" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <ellipse cx={-12} cy={0} rx={16} ry={14} fill="#4a6828" opacity={0.7} />
        <ellipse cx={14} cy={2} rx={18} ry={15} fill="#3a5818" opacity={0.6} />
        {[-18,-14,20,8,-6].map((bx, i) => (
          <circle key={i} cx={bx} cy={[-4,2,-2,6,-8][i]} r={[3,2.5,3,2,2.5][i]} fill="#c04050" opacity={0.6 + i * 0.02} />
        ))}
      </g>
    ),
    () => ( // Rookery Tower
      <g transform={`translate(${x},${y})`} opacity={0.55}>
        <rect x={-12} y={-50} width={24} height={65} rx={3} fill="#8a8078" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <rect x={-16} y={-55} width={32} height={10} rx={2} fill="#7a7068" stroke={st} strokeWidth={1} strokeDasharray="3,2" />
        <polygon points="0,-68 -18,-55 18,-55" fill="#6a6058" stroke={st} strokeWidth={1} strokeDasharray="3,2" />
        <rect x={-5} y={-35} width={10} height={12} rx={4} fill="#4a3a28" opacity={0.6} />
        <rect x={-3} y={-18} width={6} height={8} rx={2} fill="#4a3a28" opacity={0.5} />
      </g>
    ),
    () => ( // Magpie's Market
      <g transform={`translate(${x},${y})`} opacity={0.55}>
        <polygon points="0,-40 -35,-10 35,-10" fill="#c8a050" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <polygon points="0,-40 -30,-12 30,-12" fill="#d8b060" opacity={0.5} />
        <rect x={-30} y={-10} width={60} height={28} rx={2} fill="#a08858" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <line x1={-30} y1={-10} x2={-30} y2={18} stroke={st} strokeWidth={2} />
        <line x1={30} y1={-10} x2={30} y2={18} stroke={st} strokeWidth={2} />
        {[-20,-4,12].map((bx, i) => (
          <rect key={i} x={bx} y={-4} width={12} height={8} rx={2} fill={["#e8c850","#d0a840","#c89838"][i]} opacity={0.5} />
        ))}
      </g>
    ),
    () => ( // Blackbird Pond
      <g transform={`translate(${x},${y + 5})`} opacity={0.55}>
        <ellipse cx={0} cy={8} rx={42} ry={18} fill="#6a9cbc" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <ellipse cx={0} cy={6} rx={32} ry={12} fill="#7aaccc" opacity={0.6} />
        <ellipse cx={-5} cy={4} rx={14} ry={6} fill="#9acce8" opacity={0.3} />
        <line x1={-35} y1={-8} x2={-34} y2={10} stroke="#5a7838" strokeWidth={2} />
        <ellipse cx={-35} cy={-12} rx={4} ry={6} fill="#5a7838" opacity={0.7} />
        <line x1={-30} y1={-4} x2={-29} y2={12} stroke="#4a6828" strokeWidth={1.5} />
        <ellipse cx={-30} cy={-7} rx={3} ry={5} fill="#4a6828" opacity={0.6} />
        <line x1={32} y1={-6} x2={33} y2={10} stroke="#5a7838" strokeWidth={2} />
        <ellipse cx={32} cy={-10} rx={4} ry={5} fill="#5a7838" opacity={0.7} />
      </g>
    ),
  ];
  const render = landmarks[hubIndex];
  return render ? render() : null;
}

// ──── GAME BOARD ────
function GameBoard({ spaces, players, currentPlayer, animatingPlayerId }) {
  return (
    <svg viewBox="0 0 1800 1100" style={{ width: "100%", height: "100%" }}>
      <defs>
        <pattern id="woodGrain" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="transparent" />
          <line x1="0" y1="18" x2="200" y2="20" stroke="#bfae88" strokeWidth="0.8" opacity="0.25" />
          <line x1="0" y1="38" x2="200" y2="36" stroke="#bfae88" strokeWidth="0.4" opacity="0.15" />
          <line x1="0" y1="52" x2="200" y2="50" stroke="#bfae88" strokeWidth="0.5" opacity="0.22" />
          <line x1="0" y1="75" x2="200" y2="77" stroke="#bfae88" strokeWidth="0.3" opacity="0.12" />
          <line x1="0" y1="88" x2="200" y2="90" stroke="#bfae88" strokeWidth="0.7" opacity="0.18" />
          <line x1="0" y1="108" x2="200" y2="106" stroke="#bfae88" strokeWidth="0.35" opacity="0.14" />
          <line x1="0" y1="125" x2="200" y2="123" stroke="#bfae88" strokeWidth="0.4" opacity="0.24" />
          <line x1="0" y1="148" x2="200" y2="150" stroke="#bfae88" strokeWidth="0.45" opacity="0.13" />
          <line x1="0" y1="160" x2="200" y2="162" stroke="#bfae88" strokeWidth="0.6" opacity="0.19" />
          <line x1="0" y1="178" x2="200" y2="176" stroke="#bfae88" strokeWidth="0.3" opacity="0.16" />
          <line x1="0" y1="190" x2="200" y2="188" stroke="#bfae88" strokeWidth="0.5" opacity="0.15" />
        </pattern>
        <radialGradient id="woodVignette" cx="0.5" cy="0.5" r="0.65">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="70%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(60,45,25,0.22)" />
        </radialGradient>
        <filter id="softShadow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="hubGlow">
          <stop offset="0%" stopColor="#c89030" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c89030" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Wood background */}
      <rect width="1800" height="1100" fill="#c8b898" />
      <rect width="1800" height="1100" fill="url(#woodGrain)" />

      {/* Terrain color zones — soft background tints */}
      {TERRAIN_REGIONS.map((z, i) => (
        <ellipse key={`tz${i}`} cx={z.cx} cy={z.cy} rx={z.rx * 1.3} ry={z.ry * 1.3} fill={z.fill} />
      ))}

      {/* Felt stream ribbon */}
      <g opacity={0.55}>
        <path d={STREAM_PATH_D2} stroke="#7aaccc" strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={STREAM_PATH_D2} stroke="#8abcda" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={STREAM_PATH_D2} stroke="#9acce8" strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="5,8" style={{ animation: "streamFlow 2.5s linear infinite" }} />
      </g>
      {/* Felt pond */}
      <g opacity={0.5}>
        <ellipse cx={155} cy={740} rx={50} ry={30} fill="#7aaccc" />
        <ellipse cx={155} cy={740} rx={38} ry={22} fill="#8abcda" />
        <ellipse cx={150} cy={736} rx={16} ry={9} fill="#9acce8" opacity={0.5} />
      </g>

      {/* Background decorations (behind path) */}
      {DECO.filter(d => d.y < 500).map((item, i) => (
        <FeltDecoration key={`dbg${i}`} item={item} />
      ))}

      {/* Trail ribbon */}
      <g>
        <path d={TRAIL_PATH_D} stroke="rgba(100,80,50,0.25)" strokeWidth={140} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#8a7050" strokeWidth={125} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#a08060" strokeWidth={110} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#b89870" strokeWidth={95} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Stitch marks */}
        <path d={TRAIL_PATH_D} stroke="#c8a878" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="7,10" />
      </g>

      {/* Start / Finish markers */}
      <g>
        <text x={spaces[0].x} y={spaces[0].y + 48} textAnchor="middle" fontSize="12" fill="#5a8a38" fontFamily="'Press Start 2P'" opacity={0.9}>START</text>
        <text x={spaces[NUM_SPACES - 1].x} y={spaces[NUM_SPACES - 1].y + 48} textAnchor="middle" fontSize="12" fill="#c89030" fontFamily="'Press Start 2P'" opacity={0.9}>FINISH</text>
      </g>

      {/* Mid decorations */}
      {DECO.filter(d => d.y >= 500 && d.y < 800).map((item, i) => (
        <FeltDecoration key={`dmid${i}`} item={item} />
      ))}

      {/* Hub landmarks — rendered behind spaces */}
      {spaces.filter(s => s.isHub).map(s => (
        <HubLandmark key={`hl${s.hubIndex}`} hubIndex={s.hubIndex} x={s.x} y={s.y} />
      ))}

      {/* Connectors between adjacent spaces */}
      {spaces.slice(0, -1).map((s, i) => {
        const next = spaces[i + 1];
        const dx = next.x - s.x;
        const dy = next.y - s.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <g key={`conn${i}`} transform={`translate(${s.x}, ${s.y}) rotate(${angle})`}>
            <rect x={0} y={-30} width={len} height={60} rx={20} fill="#b89870" opacity={0.55} />
            <rect x={0} y={-22} width={len} height={44} rx={15} fill="#c8a878" opacity={0.35} />
          </g>
        );
      })}

      {/* Board spaces — rounded felt tiles */}
      {spaces.map((s) => {
        const isHub = s.isHub;
        const isBonus = s.isBonus;
        const hw = isHub ? 52 : isBonus ? 40 : 36;
        const hh = isHub ? 40 : isBonus ? 32 : 28;
        const rx = isHub ? 18 : 13;
        return (
          <g key={`sp${s.id}`} transform={`translate(${s.x}, ${s.y})`}>
            {/* Hub ambient glow */}
            {isHub && (
              <ellipse cx={0} cy={0} rx={85} ry={70} fill="url(#hubGlow)" style={{ animation: "hubPulse 4s ease-in-out infinite" }} />
            )}
            {/* Soft shadow */}
            <rect x={-hw - 1} y={-hh + 4} width={(hw + 1) * 2} height={hh * 2} rx={rx} fill="rgba(60,40,20,0.3)" />
            {/* Cream border for contrast */}
            <rect x={-hw - 4} y={-hh - 4} width={(hw + 4) * 2} height={(hh + 4) * 2} rx={rx + 3} fill={isBonus ? "#fff8e0" : "#f0e8d8"} opacity={0.85} />
            {/* Base felt tile */}
            <rect
              x={-hw}
              y={-hh}
              width={hw * 2}
              height={hh * 2}
              rx={rx}
              fill={isBonus ? "#e8c840" : CAT_COLORS[s.catIndex]}
              stroke={isHub ? "#c89030" : isBonus ? "#c8a020" : "#5a4a35"}
              strokeWidth={isHub ? 4 : isBonus ? 3.5 : 3}
              strokeDasharray={isHub ? "none" : isBonus ? "none" : "5,4"}
            />
            {/* Inner felt highlight */}
            <rect x={-hw + 5} y={-hh + 4} width={(hw - 5) * 2} height={(hh - 4) * 2} rx={rx - 3} fill="rgba(255,255,255,0.12)" />
            {/* Inner stitching for hub and bonus */}
            {(isHub || isBonus) && (
              <rect x={-hw + 3} y={-hh + 3} width={(hw - 3) * 2} height={(hh - 3) * 2} rx={rx - 2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="3,3" />
            )}
            {/* Hub stitch ring */}
            {isHub && (
              <rect x={-hw - 8} y={-hh - 8} width={(hw + 8) * 2} height={(hh + 8) * 2} rx={rx + 5} fill="none" stroke="#c89030" strokeWidth={3} strokeDasharray="6,5" opacity={0.6} />
            )}
            {/* Space number */}
            <text
              x={0}
              y={isHub ? -8 : -2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isHub ? "24" : "20"}
              fill="#fff"
              stroke="#3a2a1a"
              strokeWidth={3}
              paintOrder="stroke"
              fontFamily="'Press Start 2P'"
              fontWeight="bold"
              style={{ pointerEvents: "none" }}
            >
              {s.id + 1}
            </text>
            {/* Category icon or event icon */}
            <text
              x={0}
              y={isHub ? 22 : 20}
              textAnchor="middle"
              fontSize={isHub ? "24" : isBonus ? "20" : "18"}
              style={{ pointerEvents: "none" }}
            >
              {s.isEvent && s.eventType && EVENT_DEFS[s.eventType] ? EVENT_DEFS[s.eventType].icon : CAT_ICONS[s.catIndex]}
            </text>
            {/* Hub name */}
            {isHub && (
              <text
                x={0}
                y={hh + 22}
                textAnchor="middle"
                fontSize="9"
                fill="#8a6828"
                fontFamily="'Press Start 2P'"
                style={{ pointerEvents: "none" }}
              >
                {HUB_NAMES[s.hubIndex]}
              </text>
            )}
          </g>
        );
      })}

      {/* Foreground decorations */}
      {DECO.filter(d => d.y >= 800).map((item, i) => (
        <FeltDecoration key={`dfg${i}`} item={item} />
      ))}

      {/* Vignette overlay */}
      <rect width="1800" height="1100" fill="url(#woodVignette)" />

      {/* Fireflies */}
      {FIREFLIES.map((f, i) => (
        <circle
          key={`ff${i}`}
          cx={f.x}
          cy={f.y}
          r={f.size}
          fill="#e8d878"
          opacity={0}
          style={{ animation: `fireflyFloat ${f.duration}s ${f.delay}s infinite ease-in-out` }}
        />
      ))}

      {/* Falling leaves */}
      {FALLING_LEAVES.map((leaf, i) => (
        <g key={`leaf${i}`} transform={`translate(${leaf.x}, 0)`}>
          <g style={{ animation: `fallLeaf ${leaf.duration}s ${leaf.delay}s infinite linear` }}>
            <path
              d="M0,-3 C-2,-1 -2,3 0,5 C2,3 2,-1 0,-3Z"
              fill={leaf.color}
              opacity={0.7}
              transform={`scale(${leaf.size * 3.5})`}
            />
          </g>
        </g>
      ))}

      {/* Players */}
      {players.map((p, i) => {
        const space = spaces[p.position];
        if (!space) return null;
        const sameSpacePlayers = players.filter(pl => pl.position === p.position);
        const myIdx = sameSpacePlayers.findIndex(pl => pl.id === p.id);
        const angle = (myIdx / sameSpacePlayers.length) * Math.PI * 2;
        const spread = sameSpacePlayers.length > 1 ? 35 : 0;
        const offsetX = Math.cos(angle) * spread;
        const offsetY = Math.sin(angle) * spread * 0.5;
        const tx = space.x + offsetX;
        const ty = space.y + offsetY;
        const isCurr = i === currentPlayer;
        const isHopping = p.id === animatingPlayerId;
        return (
          <g key={`pl${p.id}`} transform={`translate(${tx}, ${ty})`} className={isHopping ? "token-hopping" : ""}>
            {/* Shadow */}
            <ellipse cx={0} cy={10} rx={28} ry={9} fill="rgba(0,0,0,0.25)" />
            {/* Felt bird token */}
            <g style={{ filter: isCurr ? "drop-shadow(0 0 6px #f0c040)" : "none" }}>
              <FeltBirdToken birdIndex={p.id} />
            </g>
            {/* Highlight ring for current player */}
            {isCurr && (
              <ellipse cx={0} cy={-45} rx={60} ry={60} fill="none" stroke="#f0c040" strokeWidth={2.5} strokeDasharray="6,4" style={{ animation: "pulse 1.5s infinite" }} />
            )}
            {/* Position number above token */}
            <rect x={-20} y={-120} width={40} height={22} rx={5} fill="#f0e8d8" stroke="#8a7a68" strokeWidth={1.5} />
            <text x={0} y={-104} textAnchor="middle" fontSize="14" fill="#3a2a1a" fontFamily="'Press Start 2P'" fontWeight="bold" style={{ pointerEvents: "none" }}>
              {p.position + 1}
            </text>
            {/* Current player name tag */}
            {isCurr && (
              <g>
                <polygon
                  points="-6,-130 6,-130 0,-122"
                  fill="#f0c040"
                  style={{ animation: "bounce 1s infinite" }}
                />
                <rect x={-40} y={-150} width={80} height={20} fill="#c89030" stroke="#8a7a68" strokeWidth={1.5} rx={5} />
                <text x={0} y={-137} textAnchor="middle" fontSize="9" fill="#f5edd8" fontFamily="'Press Start 2P'" style={{ pointerEvents: "none" }}>
                  {p.name}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ──── ANIMATED DICE ────
function PixelDice({ value, rolling, onRoll, disabled, size = 72 }) {
  const displayVal = rolling ? Math.floor(Math.random() * 6) + 1 : value || 1;
  const dotPositions = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
  };
  return (
    <button
      onClick={disabled ? undefined : onRoll}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        padding: 0,
        background: "#f5edd8",
        border: "4px solid #8a7a68",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "inset -2px -2px 0 rgba(0,0,0,0.1), inset 2px 2px 0 rgba(255,255,255,0.3), 3px 3px 0 rgba(80,60,40,0.25)",
        transition: "transform 0.1s",
        animation: rolling ? "rollDice 0.3s infinite linear" : "none",
        borderRadius: 6,
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        {(dotPositions[displayVal] || []).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={9} fill="#5a4a35" />
        ))}
      </svg>
    </button>
  );
}

// ──── FEATHER DISPLAY ────
function FeatherDisplay({ feathers, size = 24, showLabels = false }) {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {feathers.map((has, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            background: has ? CAT_COLORS[i] : "rgba(180,168,136,0.4)",
            border: `2px solid ${has ? "#c89030" : "#b8a888"}`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${size * 0.5}px`,
            transition: "all 0.3s",
            boxShadow: has ? `0 0 8px ${CAT_COLORS[i]}88` : "none",
          }}
          title={CAT_LABELS_SHORT[i]}
          className={has ? "feather-collect" : ""}
        >
          {has ? "\u{1FAB6}" : ""}
        </div>
      ))}
      {showLabels && (
        <span style={{ fontSize: "8px", color: "#8a7a68", fontFamily: "var(--ui-font)", marginLeft: 4 }}>
          {feathers.filter(Boolean).length}/6
        </span>
      )}
    </div>
  );
}

// ──── QUESTION TIMER ────
function QuestionTimer({ duration, onExpire, soundEnabled }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setTimeLeft(duration);
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          if (!expiredRef.current) {
            expiredRef.current = true;
            setTimeout(onExpire, 0);
          }
          return 0;
        }
        if (t <= 6 && soundEnabled) SFX.tick();
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [duration]);

  const pct = (timeLeft / duration) * 100;
  const danger = pct < 25;
  const warning = pct < 50;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--ui-font)", fontSize: "10px", color: danger ? "#c05040" : warning ? "#c89030" : "#5a8a38" }}>
          TIME
        </span>
        <span
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: "12px",
            color: danger ? "#c05040" : warning ? "#c89030" : "#5a8a38",
            animation: danger ? "pulse 0.5s infinite" : "none",
          }}
        >
          {timeLeft}s
        </span>
      </div>
      <div style={{ height: 8, background: "#d8c8a8", border: "2px solid #b8a888", borderRadius: 4 }}>
        <div
          className={`timer-bar ${danger ? "danger" : warning ? "warning" : ""}`}
          style={{ width: `${pct}%`, height: "100%", borderRadius: 2 }}
        />
      </div>
    </div>
  );
}

// ──── QUESTION CARD ────
function QuestionCard({ question, catIndex, selectedAnswer, answerRevealed, eliminatedOptions, onAnswer, timerDuration, timerEnabled, soundEnabled, onTimerExpire, hints, onHint, doubleOrNothing }) {
  if (!question) return null;
  const isTF = question.options && question.options.length === 2;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(120,100,70,0.75)",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.25s ease",
      }}
    >
      <div
        className="pixel-panel"
        style={{
          maxWidth: 540,
          width: "94%",
          overflow: "hidden",
          animation: "slideUp 0.3s ease",
          borderRadius: 8,
        }}
      >
        {/* Double or Nothing banner */}
        {doubleOrNothing && (
          <div style={{ background: "linear-gradient(135deg, #c05040, #e07030)", padding: "6px 18px", textAlign: "center" }}>
            <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: "#fff" }}>
              {"\u{26A1}"} DOUBLE OR NOTHING {"\u{26A1}"}
            </span>
          </div>
        )}
        {/* Header */}
        <div
          style={{
            background: CAT_COLORS[catIndex],
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "3px solid rgba(80,60,40,0.3)",
          }}
        >
          <span style={{ fontSize: 22 }}>{CAT_ICONS[catIndex]}</span>
          <span style={{ fontFamily: "var(--ui-font)", fontSize: 14, color: "#fff", textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}>
            {CATEGORIES[catIndex]}
          </span>
          {hints > 0 && !answerRevealed && !doubleOrNothing && (
            <button
              onClick={onHint}
              className="pixel-btn pixel-btn-gold"
              style={{ marginLeft: "auto", fontSize: 8, padding: "4px 10px" }}
            >
              HINT ({hints})
            </button>
          )}
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Timer */}
          {timerEnabled && !answerRevealed && (
            <QuestionTimer duration={timerDuration} onExpire={onTimerExpire} soundEnabled={soundEnabled} />
          )}

          {/* Question */}
          <p style={{ fontFamily: "var(--ui-font)", fontSize: 14, lineHeight: 1.7, color: "#3a2a1a", margin: "0 0 16px" }}>
            {question.question}
          </p>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: isTF ? "row" : "column", gap: 8 }}>
            {question.options.map((opt, i) => {
              const isEliminated = eliminatedOptions.includes(opt);
              if (isEliminated && !answerRevealed) return null;
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === question.answer;
              let bg = "#e8dcc8";
              let border = "#b8a888";
              let textColor = "#3a2a1a";
              if (answerRevealed) {
                if (isCorrect) { bg = "#5a8a38"; border = "#4a7a2e"; textColor = "#fff"; }
                else if (isSelected && !isCorrect) { bg = "#c05040"; border = "#a03830"; textColor = "#fff"; }
                else { bg = "#ddd0ba"; border = "#c8b898"; textColor = "#8a7a68"; }
              } else if (isSelected) {
                bg = CAT_COLORS[catIndex];
                border = "#c89030";
                textColor = "#fff";
              }
              return (
                <button
                  key={i}
                  onClick={() => !answerRevealed && onAnswer(opt)}
                  disabled={answerRevealed}
                  style={{
                    flex: isTF ? 1 : undefined,
                    background: bg,
                    border: `3px solid ${border}`,
                    padding: isTF ? "14px 10px" : "10px 14px",
                    cursor: answerRevealed ? "default" : "pointer",
                    fontFamily: "var(--ui-font)",
                    fontSize: isTF ? 14 : 12,
                    color: textColor,
                    textAlign: isTF ? "center" : "left",
                    transition: "all 0.15s",
                    borderRadius: 4,
                    boxShadow: isSelected && !answerRevealed ? `0 0 8px ${CAT_COLORS[catIndex]}66` : "2px 2px 0 rgba(80,60,40,0.15)",
                    opacity: isEliminated ? 0.3 : 1,
                    animation: answerRevealed && isCorrect ? "correctFlash 0.4s" : answerRevealed && isSelected && !isCorrect ? "wrongFlash 0.4s" : "none",
                  }}
                >
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 10, marginRight: 10, opacity: 0.5 }}>
                    {i + 1}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {/* Keyboard hint */}
          {!answerRevealed && (
            <p style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#b8a888", textAlign: "center", margin: "10px 0 0" }}>
              Press 1-{question.options.length} to answer
            </p>
          )}

          {/* Flavour text */}
          {answerRevealed && question.flavour && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: "rgba(90,138,56,0.1)",
                borderLeft: `4px solid ${CAT_COLORS[catIndex]}`,
                borderRadius: 4,
                animation: "slideIn 0.3s ease",
              }}
            >
              <p style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#5a7a38", lineHeight: 1.6, margin: 0 }}>
                {question.flavour}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──── QUESTION EDITOR ────
function QuestionEditor({ questions, onUpdate, onClose }) {
  const [activeCat, setActiveCat] = useState(0);
  const [editingQ, setEditingQ] = useState(null);
  const [form, setForm] = useState({ question: "", options: ["", "", "", ""], answer: "", flavour: "", difficulty: "medium", ageMin: 8 });
  const catName = CATEGORIES[activeCat];
  const qs = questions[catName] || [];

  const saveQ = () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    const n = { ...questions };
    if (editingQ !== null) n[catName][editingQ] = { ...form };
    else n[catName] = [...(n[catName] || []), { ...form }];
    onUpdate(n);
    setEditingQ(null);
    setForm({ question: "", options: ["", "", "", ""], answer: "", flavour: "", difficulty: "medium", ageMin: 8 });
  };
  const deleteQ = (idx) => {
    const n = { ...questions };
    n[catName] = n[catName].filter((_, i) => i !== idx);
    onUpdate(n);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(120,100,70,0.8)",
      }}
    >
      <div
        className="pixel-panel"
        style={{ maxWidth: 680, width: "95%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 8 }}
      >
        <div style={{ padding: "10px 16px", borderBottom: "3px solid #b8a888", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#b8a888" }}>
          <span style={{ fontFamily: "var(--ui-font)", fontSize: 14, color: "#8a6828" }}>QUESTION EDITOR</span>
          <button onClick={onClose} className="pixel-btn pixel-btn-red" style={{ fontSize: 8, padding: "4px 10px" }}>
            CLOSE
          </button>
        </div>
        <div style={{ display: "flex", padding: "8px 10px", gap: 4, flexWrap: "wrap", borderBottom: "2px solid #b8a888" }}>
          {CATEGORIES.map((c, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveCat(i);
                setEditingQ(null);
              }}
              style={{
                background: i === activeCat ? CAT_COLORS[i] : "#252540",
                border: `2px solid ${CAT_COLORS[i]}88`,
                padding: "3px 8px",
                fontSize: 9,
                cursor: "pointer",
                fontFamily: "var(--ui-font)",
                color: "#fff",
                borderRadius: 3,
              }}
            >
              {CAT_ICONS[i]} {CAT_LABELS_SHORT[i]} ({(questions[c] || []).length})
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
          {qs.map((q, idx) => (
            <div
              key={idx}
              style={{
                padding: "6px 10px",
                marginBottom: 4,
                background: "#e0d4be",
                border: "2px solid #b8a888",
                borderRadius: 3,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "var(--ui-font)", fontSize: 9, color: "#5a4a35", flex: 1 }}>
                {q.question}
                <span style={{ fontSize: 7, color: "#8a7a68", marginLeft: 6 }}>[{q.difficulty}, {q.ageMin || "?"}+]</span>
              </span>
              <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                <button
                  onClick={() => {
                    setEditingQ(idx);
                    setForm({ ...qs[idx], ageMin: qs[idx].ageMin || 8 });
                  }}
                  className="pixel-btn pixel-btn-blue"
                  style={{ fontSize: 7, padding: "2px 8px" }}
                >
                  EDIT
                </button>
                <button onClick={() => deleteQ(idx)} className="pixel-btn pixel-btn-red" style={{ fontSize: 7, padding: "2px 8px" }}>
                  DEL
                </button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 12, background: "#e8dcc8", border: "2px dashed #b8a888", borderRadius: 4 }}>
            <p style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#8a6828", margin: "0 0 8px" }}>
              {editingQ !== null ? "EDIT QUESTION" : "ADD NEW QUESTION"}
            </p>
            <input
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Question..."
              style={inputStyle}
            />
            {form.options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => {
                  const o = [...form.options];
                  o[i] = e.target.value;
                  setForm({ ...form, options: o });
                }}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                style={{ ...inputStyle, marginTop: 3 }}
              />
            ))}
            <select value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} style={{ ...inputStyle, marginTop: 4 }}>
              <option value="">Select correct answer...</option>
              {form.options.filter(Boolean).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <select value={form.difficulty || "medium"} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select value={form.ageMin || 8} onChange={(e) => setForm({ ...form, ageMin: parseInt(e.target.value) })} style={{ ...inputStyle, flex: 1 }}>
                <option value={8}>Child (8+)</option>
                <option value={15}>Adult (15+)</option>
              </select>
            </div>
            <input
              value={form.flavour}
              onChange={(e) => setForm({ ...form, flavour: e.target.value })}
              placeholder="Fun fact (optional)"
              style={{ ...inputStyle, marginTop: 3 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={saveQ} className="pixel-btn pixel-btn-green" style={{ fontSize: 9 }}>
                {editingQ !== null ? "UPDATE" : "ADD"}
              </button>
              {editingQ !== null && (
                <button
                  onClick={() => {
                    setEditingQ(null);
                    setForm({ question: "", options: ["", "", "", ""], answer: "", flavour: "", difficulty: "medium", ageMin: 8 });
                  }}
                  className="pixel-btn pixel-btn-dark"
                  style={{ fontSize: 9 }}
                >
                  CANCEL
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const inputStyle = {
  width: "100%",
  padding: "7px 10px",
  background: "#f0e8d8",
  border: "2px solid #b8a888",
  color: "#3a2a1a",
  fontFamily: "var(--ui-font)",
  fontSize: 10,
  boxSizing: "border-box",
  outline: "none",
  borderRadius: 3,
};

// ──── STATS SCREEN ────
function StatsScreen({ stats, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(120,100,70,0.8)",
      }}
    >
      <div className="pixel-panel" style={{ maxWidth: 500, width: "92%", padding: 20, animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#8a6828" }}>STATS</span>
          <button onClick={onClose} className="pixel-btn pixel-btn-red" style={{ fontSize: 8, padding: "4px 10px" }}>
            CLOSE
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["Games Played", stats.gamesPlayed],
            ["Questions Asked", stats.questionsAnswered],
            ["Correct Answers", stats.correctAnswers],
            ["Accuracy", stats.questionsAnswered > 0 ? `${Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)}%` : "N/A"],
          ].map(([label, val], i) => (
            <div key={i} style={{ background: "#e8dcc8", border: "2px solid #b8a888", padding: "10px 12px", borderRadius: 4 }}>
              <div style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#8a7a68", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: 16, color: "#8a6828" }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--ui-font)", fontSize: 9, color: "#8a7a68", marginBottom: 8 }}>CATEGORY ACCURACY</div>
          {CATEGORIES.map((cat, i) => {
            const total = stats.categoryTotal?.[cat] || 0;
            const correct = stats.categoryCorrect?.[cat] || 0;
            const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{CAT_ICONS[i]}</span>
                <span style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#5a4a35", width: 60 }}>{CAT_LABELS_SHORT[i]}</span>
                <div style={{ flex: 1, height: 10, background: "#e8dcc8", border: "2px solid #b8a888", borderRadius: 3 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: CAT_COLORS[i], transition: "width 0.5s", borderRadius: 2 }} />
                </div>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#3a2a1a", width: 35, textAlign: "right" }}>
                  {total > 0 ? `${pct}%` : "--"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──── SETTINGS PANEL ────
function SettingsPanel({ settings, onUpdate, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(120,100,70,0.8)",
      }}
    >
      <div className="pixel-panel" style={{ maxWidth: 400, width: "90%", padding: 20, animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#8a6828" }}>SETTINGS</span>
          <button onClick={onClose} className="pixel-btn pixel-btn-red" style={{ fontSize: 8, padding: "4px 10px" }}>
            CLOSE
          </button>
        </div>
        <SettingRow label="Sound Effects">
          <ToggleBtn active={settings.sound} onClick={() => onUpdate({ ...settings, sound: !settings.sound })} />
        </SettingRow>
        <SettingRow label="Question Timer">
          <ToggleBtn active={settings.timer} onClick={() => onUpdate({ ...settings, timer: !settings.timer })} />
        </SettingRow>
        {settings.timer && (
          <SettingRow label="Timer (seconds)">
            <div style={{ display: "flex", gap: 4 }}>
              {[10, 15, 20, 30].map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdate({ ...settings, timerSeconds: s })}
                  className={`pixel-btn ${settings.timerSeconds === s ? "pixel-btn-green" : "pixel-btn-dark"}`}
                  style={{ fontSize: 8, padding: "3px 8px" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </SettingRow>
        )}
        <SettingRow label="Difficulty">
          <div style={{ display: "flex", gap: 4 }}>
            {["easy", "medium", "hard"].map((d) => (
              <button
                key={d}
                onClick={() => onUpdate({ ...settings, difficulty: d })}
                className={`pixel-btn ${settings.difficulty === d ? "pixel-btn-green" : "pixel-btn-dark"}`}
                style={{ fontSize: 8, padding: "3px 8px", textTransform: "uppercase" }}
              >
                {d}
              </button>
            ))}
          </div>
        </SettingRow>
      </div>
    </div>
  );
}
function SettingRow({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "8px 0", borderBottom: "1px solid #c8b898" }}>
      <span style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#5a4a35" }}>{label}</span>
      {children}
    </div>
  );
}
function ToggleBtn({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 48,
        height: 24,
        background: active ? "#5a8a38" : "#c8b898",
        border: "3px solid #8a7a68",
        cursor: "pointer",
        position: "relative",
        boxShadow: "2px 2px 0 rgba(80,60,40,0.25)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          background: active ? "#7ab850" : "#a09880",
          position: "absolute",
          top: 1,
          left: active ? 26 : 2,
          transition: "left 0.15s",
          border: "2px solid #8a7a68",
          borderRadius: 8,
        }}
      />
    </button>
  );
}

// ──── PENALTY OVERLAY ────
function PenaltyOverlay({ rolling, value, playerName }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(120,100,70,0.85)",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div className="pixel-panel" style={{ padding: "30px 40px", textAlign: "center", animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 16, color: "#c05040", margin: "0 0 8px", textShadow: "2px 2px 0 rgba(80,60,40,0.3)" }}>
          PENALTY!
        </h2>
        <p style={{ fontFamily: "var(--ui-font)", fontSize: 11, color: "#5a4a35", marginBottom: 16 }}>
          {playerName} got it wrong! Rolling penalty...
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <PixelDice value={value} rolling={rolling} disabled size={80} />
        </div>
        {!rolling && value && (
          <p style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#c05040", animation: "pulse 0.5s infinite", margin: 0 }}>
            Move back {value} space{value !== 1 ? "s" : ""}!
          </p>
        )}
      </div>
    </div>
  );
}

// ──── CONFETTI EFFECT ────
function ConfettiEffect() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 300, overflow: "hidden" }}>
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${(i * 19.3) % 100}%`,
          top: "-10px",
          width: 6 + (i % 4) * 2,
          height: 4 + (i % 3) * 2,
          background: ["#c89030", "#c05040", "#5a8a38", "#4878a0", "#8a5898", "#d07030", "#3a8878"][i % 7],
          animation: `confettiDrop ${1.8 + (i % 5) * 0.4}s ${(i * 0.07) % 2.5}s infinite ease-in`,
          borderRadius: i % 2 === 0 ? "50%" : "2px",
        }} />
      ))}
    </div>
  );
}

// ──── TITLE BACKGROUND SCENE ────
function TitleBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Scattered felt decorations */}
      {[
        { src: "felt/pine-tree.png", x: "2%", y: "10%", w: 80, opacity: 0.2 },
        { src: "felt/pine-tree.png", x: "88%", y: "5%", w: 70, opacity: 0.18 },
        { src: "felt/birch-tree.png", x: "12%", y: "60%", w: 65, opacity: 0.15 },
        { src: "felt/birch-tree-2.png", x: "82%", y: "55%", w: 60, opacity: 0.17 },
        { src: "felt/fox.png", x: "6%", y: "75%", w: 55, opacity: 0.2 },
        { src: "felt/owl.png", x: "90%", y: "72%", w: 50, opacity: 0.18 },
        { src: "felt/mushroom-red.png", x: "20%", y: "85%", w: 40, opacity: 0.15 },
        { src: "felt/oak-leaf.png", x: "75%", y: "82%", w: 40, opacity: 0.14 },
        { src: "felt/rabbit.png", x: "92%", y: "30%", w: 50, opacity: 0.15 },
        { src: "felt/acorn.png", x: "4%", y: "40%", w: 35, opacity: 0.16 },
        { src: "felt/fern.png", x: "70%", y: "12%", w: 45, opacity: 0.13 },
        { src: "felt/snail.png", x: "25%", y: "15%", w: 40, opacity: 0.14 },
        { src: "felt/squirrel.png", x: "78%", y: "88%", w: 50, opacity: 0.16 },
        { src: "felt/hedgehog.png", x: "15%", y: "35%", w: 45, opacity: 0.13 },
      ].map((d, i) => (
        <img key={i} src={d.src} alt="" style={{
          position: "absolute", left: d.x, top: d.y, width: d.w,
          opacity: d.opacity, filter: "blur(1px)",
        }} />
      ))}
    </div>
  );
}

// ──── CATEGORY PICKER (Hub Choice) ────
function CategoryPicker({ feathers, onPick }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(120,100,70,0.75)", backdropFilter: "blur(4px)", animation: "fadeIn 0.25s ease" }}>
      <div className="pixel-panel" style={{ maxWidth: 480, width: "94%", animation: "slideUp 0.3s ease", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ background: "#c89030", padding: "12px 18px", borderBottom: "3px solid rgba(80,60,40,0.3)", textAlign: "center" }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: "#fff", textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}>
            {"\u{1FAB6}"} Choose a Feather! {"\u{1FAB6}"}
          </span>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <p style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#6a5a48", marginBottom: 14, textAlign: "center" }}>
            Answer correctly to earn this feather:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {CATEGORIES.map((_, i) => {
              const has = feathers[i];
              return (
                <button
                  key={i}
                  onClick={() => !has && onPick(i)}
                  disabled={has}
                  style={{
                    background: has ? "#d8c8a8" : CAT_COLORS[i],
                    border: `3px solid ${has ? "#b8a888" : CAT_COLORS[i]}`,
                    padding: "12px 10px",
                    cursor: has ? "not-allowed" : "pointer",
                    borderRadius: 6,
                    opacity: has ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.15s",
                    boxShadow: has ? "none" : "2px 2px 0 rgba(80,60,40,0.25)",
                  }}
                >
                  <span style={{ fontSize: 22 }}>{CAT_ICONS[i]}</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: has ? "#8a7a68" : "#fff", textShadow: has ? "none" : "1px 1px 0 rgba(0,0,0,0.2)" }}>
                      {CAT_LABELS_SHORT[i]}
                    </div>
                    {has && <div style={{ fontFamily: "var(--ui-font)", fontSize: 7, color: "#8a7a68" }}>EARNED \u2713</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──── EVENT OVERLAY ────
function EventOverlay({ event, players, currentPlayer, onResolve }) {
  const [bonusDice, setBonusDice] = useState(null);
  const def = EVENT_DEFS[event];
  useEffect(() => {
    if (event === "bonus_roll") {
      setBonusDice(Math.floor(Math.random() * 6) + 1);
    }
  }, [event]);
  if (!def) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(120,100,70,0.85)", animation: "fadeIn 0.2s ease" }}>
      <div className="pixel-panel" style={{ padding: "30px 40px", textAlign: "center", maxWidth: 420, width: "90%", animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: "bounce 1s infinite" }}>{def.icon}</div>
        <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 13, color: "#8a6828", margin: "0 0 8px", textShadow: "1px 1px 0 rgba(80,60,40,0.2)" }}>
          {def.label}
        </h2>
        <p style={{ fontFamily: "var(--ui-font)", fontSize: 11, color: "#5a4a35", marginBottom: 16, lineHeight: 1.6 }}>
          {def.desc}
        </p>
        {event === "bonus_roll" && bonusDice && (
          <div style={{ marginBottom: 16 }}>
            <PixelDice value={bonusDice} disabled size={64} />
            <p style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#5a8a38", marginTop: 8 }}>
              +{bonusDice} spaces!
            </p>
          </div>
        )}
        {event === "swap" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 10, color: "#6a5a48", fontFamily: "var(--ui-font)" }}>Choose a player to swap with:</p>
            {players.map((p, i) => i !== currentPlayer && (
              <button
                key={i}
                onClick={() => onResolve({ targetPlayer: i })}
                className="pixel-btn pixel-btn-gold"
                style={{ fontSize: 10, padding: "8px 16px" }}
              >
                {p.emoji} {p.name} (Space {p.position + 1})
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => onResolve(event === "bonus_roll" ? { bonusValue: bonusDice } : {})}
            className="pixel-btn pixel-btn-green"
            style={{ fontSize: 12, padding: "10px 28px" }}
          >
            {event === "double_or_nothing" ? "ACCEPT CHALLENGE" : "OK"}
          </button>
        )}
      </div>
    </div>
  );
}

// ──── TURN HISTORY PANEL ────
function TurnHistoryPanel({ history, onClose }) {
  return (
    <div style={{
      position: "absolute", top: 0, right: 0, width: 260, height: "100%",
      background: "linear-gradient(180deg, #f0e8d8 0%, #e8dcc8 100%)",
      borderLeft: "3px solid #b8a888",
      boxShadow: "-4px 0 12px rgba(80,60,40,0.2)",
      zIndex: 15, display: "flex", flexDirection: "column",
      animation: "slideInRight 0.3s ease",
    }}>
      <div style={{ padding: "8px 12px", borderBottom: "2px solid #b8a888", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#d8c8a8" }}>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: "#8a6828" }}>TURN LOG</span>
        <button onClick={onClose} className="pixel-btn pixel-btn-dark" style={{ fontSize: 7, padding: "2px 8px" }}>X</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
        {history.length === 0 && (
          <p style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#8a7a68", textAlign: "center", marginTop: 20 }}>No turns yet</p>
        )}
        {[...history].reverse().map((entry, i) => (
          <div key={i} style={{
            padding: "6px 8px", marginBottom: 4,
            background: i === 0 ? "rgba(200,144,48,0.15)" : "rgba(255,255,255,0.5)",
            border: "1px solid #c8b898", borderRadius: 4,
            fontSize: 8, fontFamily: "var(--ui-font)", color: "#5a4a35", lineHeight: 1.5,
          }}>
            <span style={{ marginRight: 4 }}>{entry.emoji}</span>
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── MAIN APP ────
export default function WoodlandTrivia() {
  const [settings, setSettings] = useState(() => loadStore(STORE_KEYS.settings, DEFAULT_SETTINGS));
  const [stats, setStats] = useState(() => loadStore(STORE_KEYS.stats, DEFAULT_STATS));
  const [state, dispatch] = useReducer(gameReducer, makeInitialState(2, null, null, settings.difficulty));

  // Dice animation state
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState(null);

  // Penalty state
  const [showPenalty, setShowPenalty] = useState(false);
  const [penaltyRolling, setPenaltyRolling] = useState(false);
  const [penaltyDisplay, setPenaltyDisplay] = useState(null);

  // Token movement animation
  const [tokenAnim, setTokenAnim] = useState({ active: false, playerId: null, pos: 0 });

  // Bonus square notification
  const [bonusNotif, setBonusNotif] = useState(null);

  // Board zoom/pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const boardRef = useRef(null);
  const [lastTouchDist, setLastTouchDist] = useState(null);

  // Setup state
  const [editNames, setEditNames] = useState([...BIRD_NAMES]);
  const [editAges, setEditAges] = useState([8, 8, 8, 8]);

  // Turn history sidebar toggle
  const [showHistory, setShowHistory] = useState(false);

  // Streak reward notification
  const [streakNotif, setStreakNotif] = useState(null);

  // Persist settings
  useEffect(() => {
    saveStore(STORE_KEYS.settings, settings);
  }, [settings]);

  const playSound = (sfxName) => {
    if (settings.sound && SFX[sfxName]) SFX[sfxName]();
  };

  // ── Auto-pan camera to a board space ──
  const autoPanToSpace = useCallback((spaceIndex) => {
    const space = BOARD_SPACES[spaceIndex];
    if (!space || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const newZoom = 1.5;
    const nx = space.x / 1800;
    const ny = space.y / 1100;
    const panX = -(nx - 0.5) * rect.width * newZoom;
    const panY = -(ny - 0.5) * rect.height * newZoom;
    setZoom(newZoom);
    setPan({ x: panX, y: panY });
  }, []);

  // ── Dice rolling ──
  const rollDice = () => {
    if (diceRolling || tokenAnim.active || state.phase !== "playing") return;
    playSound("click");
    const finalValue = Math.floor(Math.random() * 6) + 1;
    setDiceRolling(true);
    playSound("roll");

    // Catch-up bonus: +2 if 15+ spaces behind leader
    const maxPos = Math.max(...state.players.map(p => p.position));
    const myPos = state.players[state.currentPlayer].position;
    const catchupBonus = (state.playerCount > 1 && maxPos - myPos >= 15) ? 2 : 0;
    if (catchupBonus > 0) setBonusNotif(`Catch-up! +${catchupBonus} bonus!`);

    let count = 0;
    const maxFrames = 14;
    const interval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= maxFrames) {
        clearInterval(interval);
        setDiceDisplay(finalValue);
        setDiceRolling(false);
        playSound("land");

        const p = state.players[state.currentPlayer];
        const fromPos = p.position;
        const toPos = Math.min(fromPos + finalValue + catchupBonus, NUM_SPACES - 1);
        const totalSteps = toPos - fromPos;

        if (totalSteps <= 0) {
          setBonusNotif(null);
          setTimeout(() => dispatch({ type: "ROLL_DICE", value: finalValue, catchupBonus }), 250);
          return;
        }

        // Animate token hop-by-hop
        setTimeout(() => {
          let step = 0;
          setTokenAnim({ active: true, playerId: p.id, pos: fromPos });
          const hopInterval = setInterval(() => {
            step++;
            setTokenAnim({ active: true, playerId: p.id, pos: fromPos + step });
            playSound("hop");
            if (step >= totalSteps) {
              clearInterval(hopInterval);
              setTimeout(() => {
                setTokenAnim({ active: false, playerId: null, pos: 0 });
                setBonusNotif(null);
                dispatch({ type: "ROLL_DICE", value: finalValue, catchupBonus });
                autoPanToSpace(toPos);
              }, 250);
            }
          }, 200);
        }, 250);
      }
    }, 50 + count * 8);
  };

  // ── Event resolution handler ──
  const handleResolveEvent = (eventData) => {
    const player = state.players[state.currentPlayer];
    const oldPos = player.position;
    const event = state.currentEvent;

    // Calculate new position for movement events (for animation)
    let newPos = oldPos;
    if (event === "tailwind") newPos = Math.min(oldPos + 3, NUM_SPACES - 1);
    else if (event === "shortcut") newPos = Math.min(oldPos + 5, NUM_SPACES - 1);
    else if (event === "bonus_roll") newPos = Math.min(oldPos + (eventData.bonusValue || 0), NUM_SPACES - 1);

    const steps = newPos - oldPos;
    if (steps > 0) {
      // Animate hop forward, then dispatch
      playSound("bonus");
      let step = 0;
      setTokenAnim({ active: true, playerId: player.id, pos: oldPos });
      const hopInterval = setInterval(() => {
        step++;
        setTokenAnim({ active: true, playerId: player.id, pos: oldPos + step });
        playSound("hop");
        if (step >= steps) {
          clearInterval(hopInterval);
          setTimeout(() => {
            setTokenAnim({ active: false, playerId: null, pos: 0 });
            dispatch({ type: "RESOLVE_EVENT", ...eventData });
            autoPanToSpace(newPos);
          }, 200);
        }
      }, 200);
    } else {
      // No movement animation needed (swap, hint_gift, double_or_nothing)
      if (event === "swap") playSound("bonus");
      dispatch({ type: "RESOLVE_EVENT", ...eventData });
    }
  };

  // ── Answer handling ──
  const handleAnswer = (answer) => {
    const correct = answer === state.currentQuestion.answer;
    playSound(correct ? "correct" : "wrong");
    const space = BOARD_SPACES[state.players[state.currentPlayer].position];
    if (correct && space.isHub) {
      setTimeout(() => playSound("feather"), 400);
    }
    dispatch({ type: "ANSWER", answer });

    // Show streak reward notification (check after dispatch updates state)
    const p = state.players[state.currentPlayer];
    const newStreak = correct ? (p.correctStreak || 0) + 1 : 0;
    if (newStreak === 3 || newStreak === 5) {
      const msg = newStreak === 3 ? "\u{1F525} 3 in a row! +1 Hint!" : "\u{1F525} 5 in a row! +3 Spaces!";
      setStreakNotif(msg);
      playSound("bonus");
      setTimeout(() => setStreakNotif(null), 2500);
    }

    const cat = CATEGORIES[state.currentCatIndex];
    setStats((prev) => {
      const next = {
        ...prev,
        questionsAnswered: prev.questionsAnswered + 1,
        correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
        categoryTotal: { ...prev.categoryTotal, [cat]: (prev.categoryTotal[cat] || 0) + 1 },
        categoryCorrect: { ...prev.categoryCorrect, [cat]: (prev.categoryCorrect[cat] || 0) + (correct ? 1 : 0) },
      };
      saveStore(STORE_KEYS.stats, next);
      return next;
    });
  };

  const handleTimerExpire = () => {
    playSound("wrong");
    dispatch({ type: "TIMER_EXPIRED" });
    const cat = CATEGORIES[state.currentCatIndex];
    setStats((prev) => {
      const next = {
        ...prev,
        questionsAnswered: prev.questionsAnswered + 1,
        categoryTotal: { ...prev.categoryTotal, [cat]: (prev.categoryTotal[cat] || 0) + 1 },
      };
      saveStore(STORE_KEYS.stats, next);
      return next;
    });
  };

  // ── Continue / Penalty handling ──
  const handleNextTurn = () => {
    playSound("click");
    const wasWrong = state.answerRevealed && (state.selectedAnswer !== state.currentQuestion?.answer || state.timerExpired);
    // Skip penalty for double-or-nothing (penalty already applied in reducer)
    if (wasWrong && state.winner === null && !state.doubleOrNothing) {
      // Trigger penalty dice
      setShowPenalty(true);
      setPenaltyRolling(true);
      playSound("penalty");
      const finalPenalty = Math.floor(Math.random() * 4) + 1;
      let count = 0;
      const maxFrames = 14;
      const penaltyInterval = setInterval(() => {
        setPenaltyDisplay(Math.floor(Math.random() * 6) + 1);
        count++;
        if (count >= maxFrames) {
          clearInterval(penaltyInterval);
          setPenaltyDisplay(finalPenalty);
          setPenaltyRolling(false);
          playSound("wrong");
          setTimeout(() => {
            const p = state.players[state.currentPlayer];
            const originalPos = state.preRollPosition !== undefined ? state.preRollPosition : p.position;
            const penaltyTarget = Math.max(0, originalPos - finalPenalty);
            const currentPos = p.position;
            const backSteps = currentPos - penaltyTarget;

            setShowPenalty(false);
            setPenaltyDisplay(null);

            if (backSteps <= 0) {
              dispatch({ type: "PENALTY_MOVE", value: finalPenalty });
              dispatch({ type: "NEXT_TURN" });
              return;
            }

            // Animate backward hop-by-hop
            let bStep = 0;
            setTokenAnim({ active: true, playerId: p.id, pos: currentPos });
            const hopInterval = setInterval(() => {
              bStep++;
              setTokenAnim({ active: true, playerId: p.id, pos: currentPos - bStep });
              playSound("hopBack");
              if (bStep >= backSteps) {
                clearInterval(hopInterval);
                setTimeout(() => {
                  setTokenAnim({ active: false, playerId: null, pos: 0 });
                  dispatch({ type: "PENALTY_MOVE", value: finalPenalty });
                  dispatch({ type: "NEXT_TURN" });
                }, 300);
              }
            }, 150);
          }, 800);
        }
      }, 60);
      return;
    }
    if (state.winner !== null) {
      playSound("win");
      setStats((prev) => {
        const next = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
        saveStore(STORE_KEYS.stats, next);
        return next;
      });
    }
    dispatch({ type: "NEXT_TURN" });
  };

  const handleHint = () => {
    playSound("hint");
    dispatch({ type: "USE_HINT" });
  };

  // ── Zoom/Pan ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.4, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = (e) => {
    if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    const el = boardRef.current;
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastTouchDist(Math.hypot(dx, dy));
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragging) {
      setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    } else if (e.touches.length === 2 && lastTouchDist) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setZoom((z) => Math.min(4, Math.max(0.4, z * (d / lastTouchDist))));
      setLastTouchDist(d);
    }
  };
  const handleTouchEnd = () => {
    setDragging(false);
    setLastTouchDist(null);
  };
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ── Keyboard support ──
  const stateRef = useRef(state);
  stateRef.current = state;
  const diceRollingRef = useRef(diceRolling);
  diceRollingRef.current = diceRolling;
  const tokenAnimRef = useRef(tokenAnim);
  tokenAnimRef.current = tokenAnim;
  const showPenaltyRef = useRef(showPenalty);
  showPenaltyRef.current = showPenalty;

  useEffect(() => {
    const handler = (e) => {
      const s = stateRef.current;
      // 1-4 keys for answer selection
      if (s.phase === "question" && !s.answerRevealed && s.currentQuestion) {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < (s.currentQuestion.options?.length || 0)) {
          handleAnswer(s.currentQuestion.options[idx]);
          return;
        }
      }
      // Space for rolling dice
      if (e.key === " " && s.phase === "playing" && !diceRollingRef.current && !tokenAnimRef.current.active) {
        e.preventDefault();
        rollDice();
        return;
      }
      // Enter for continue / next turn
      if (e.key === "Enter" && s.answerRevealed && !showPenaltyRef.current && !tokenAnimRef.current.active) {
        handleNextTurn();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ──── SETUP SCREEN ────
  if (state.phase === "setup") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #b8a880 0%, #c8b898 50%, #d0c0a0 100%)",
          fontFamily: "var(--ui-font)",
          padding: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <TitleBackground />
        <div className="pixel-panel scanlines" style={{ padding: "28px 32px", maxWidth: 580, width: "100%", textAlign: "center", animation: "slideUp 0.5s ease", position: "relative", borderRadius: 8, zIndex: 1 }}>
          {/* Title */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            {FELT_BIRDS.map((_, i) => (
              <FeltBirdIcon key={i} birdIndex={i} size={36} />
            ))}
          </div>
          <h1 style={{ fontFamily: "'Press Start 2P'", fontSize: 18, color: "#8a6828", margin: "8px 0", animation: "titleGlow 3s ease-in-out infinite" }}>
            WOODLAND TRIVIA
          </h1>
          <p style={{ color: "#8a7a68", fontSize: 10, margin: "4px 0 20px", fontStyle: "italic" }}>
            A cozy corvid board game in the whispering woods
          </p>

          {/* Rules */}
          <div style={{ background: "#e8dcc8", border: "2px solid #b8a888", padding: "10px 14px", marginBottom: 18, textAlign: "left", borderRadius: 4 }}>
            <p style={{ fontSize: 8, color: "#6a5a48", lineHeight: 1.8, margin: 0 }}>
              Roll the dice and journey along the woodland trail!
              Land on golden HUB spaces and choose a category to earn feathers.
              Collect all 6 feathers to win! Wrong answers mean a penalty roll backwards!
              Land on event spaces for surprises: shortcuts, swaps, bonus rolls, and more!
              Answer 3 in a row for bonus hints. Land on rivals to bump them back!
              Keyboard: Space=roll, 1-4=answer, Enter=continue.
            </p>
          </div>

          {/* Player count */}
          <p style={{ color: "#6a5a48", fontSize: 11, margin: "0 0 10px" }}>HOW MANY PLAYERS?</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => {
                  playSound("click");
                  dispatch({ type: "SET_PLAYERS", count: n, names: editNames, ages: editAges });
                }}
                className={`pixel-btn ${state.playerCount === n ? "pixel-btn-green" : "pixel-btn-dark"}`}
                style={{ width: 48, height: 48, fontSize: 18 }}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Player names & ages */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
            {state.players.map((p, i) => (
              <div key={p.id} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "#f5edd8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 6px",
                    border: `3px solid ${p.accent}`,
                    boxShadow: "3px 3px 0 rgba(80,60,40,0.25)",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <FeltBirdIcon birdIndex={p.id} size={40} />
                </div>
                <input
                  value={editNames[i] || p.name}
                  onChange={(e) => {
                    const n = [...editNames];
                    n[i] = e.target.value;
                    setEditNames(n);
                  }}
                  maxLength={10}
                  style={{
                    width: 80,
                    textAlign: "center",
                    padding: "4px 4px",
                    background: "#e8dcc8",
                    border: "2px solid #b8a888",
                    color: "#3a2a1a",
                    fontFamily: "var(--ui-font)",
                    fontSize: 8,
                    outline: "none",
                    borderRadius: 3,
                  }}
                />
                {/* Age group selector — Child (8+) or Adult */}
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 7, color: "#8a7a68", display: "block", marginBottom: 2 }}>AGE GROUP</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[{ label: "Child", val: 8 }, { label: "Adult", val: 15 }].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => {
                          const a = [...editAges];
                          a[i] = opt.val;
                          setEditAges(a);
                        }}
                        style={{
                          padding: "3px 8px",
                          background: editAges[i] === opt.val ? "#5a8a38" : "#e8dcc8",
                          border: `2px solid ${editAges[i] === opt.val ? "#5a8a38" : "#b8a888"}`,
                          color: editAges[i] === opt.val ? "#fff" : "#6a5a48",
                          fontFamily: "var(--ui-font)",
                          fontSize: 8,
                          cursor: "pointer",
                          borderRadius: 3,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Difficulty */}
          <p style={{ color: "#6a5a48", fontSize: 11, margin: "0 0 8px" }}>DIFFICULTY</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
            {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => {
                  playSound("click");
                  setSettings((s) => ({ ...s, difficulty: key }));
                  dispatch({ type: "SET_DIFFICULTY", difficulty: key });
                }}
                className={`pixel-btn ${settings.difficulty === key ? "pixel-btn-green" : "pixel-btn-dark"}`}
                style={{ fontSize: 9, padding: "6px 14px" }}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={() => {
              playSound("click");
              dispatch({ type: "SET_PLAYERS", count: state.playerCount, names: editNames.slice(0, state.playerCount), ages: editAges.slice(0, state.playerCount) });
              setTimeout(() => dispatch({ type: "START_GAME" }), 50);
            }}
            className="pixel-btn pixel-btn-green"
            style={{ fontSize: 14, padding: "12px 36px", marginTop: 4 }}
          >
            BEGIN ADVENTURE
          </button>

          {/* Footer buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
            <button onClick={() => dispatch({ type: "TOGGLE_STATS" })} className="pixel-btn pixel-btn-dark" style={{ fontSize: 8, padding: "4px 10px" }}>
              STATS
            </button>
            <button onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })} className="pixel-btn pixel-btn-dark" style={{ fontSize: 8, padding: "4px 10px" }}>
              SETTINGS
            </button>
          </div>
        </div>

        {state.showStats && <StatsScreen stats={stats} onClose={() => dispatch({ type: "TOGGLE_STATS" })} />}
        {state.showSettings && (
          <SettingsPanel settings={settings} onUpdate={(s) => setSettings(s)} onClose={() => dispatch({ type: "TOGGLE_SETTINGS" })} />
        )}
      </div>
    );
  }

  // ──── GAME OVER SCREEN ────
  if (state.phase === "gameover") {
    const w = state.players[state.winner];
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #b8a880 0%, #c8b898 100%)",
          fontFamily: "var(--ui-font)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ConfettiEffect />
        <div className="pixel-panel scanlines" style={{ padding: 40, textAlign: "center", animation: "slideUp 0.5s ease", position: "relative", maxWidth: 480, width: "92%", borderRadius: 8, zIndex: 1 }}>
          <div style={{ fontSize: 56, animation: "float 2s ease infinite" }}>{w.emoji}</div>
          <h1 style={{ fontFamily: "'Press Start 2P'", fontSize: 16, color: "#8a6828", margin: "16px 0 8px", animation: "titleGlow 2s ease-in-out infinite" }}>
            {w.name} WINS!
          </h1>
          <p style={{ color: "#8a7a68", margin: "0 0 20px", fontSize: 10 }}>All six feathers collected!</p>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <FeatherDisplay feathers={w.feathers} size={32} />
          </div>

          <div style={{ background: "#e8dcc8", border: "2px solid #b8a888", padding: 12, marginBottom: 20, textAlign: "left", borderRadius: 4 }}>
            <p style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#8a7a68", margin: "0 0 8px" }}>GAME SUMMARY</p>
            <p style={{ fontSize: 9, color: "#5a4a35", margin: "2px 0" }}>
              Turns played: {state.gameStats?.turns || 0}
            </p>
            {state.players.map((pl) => {
              const ps = state.gameStats?.byPlayer?.[pl.id] || {};
              const pct = ps.questions > 0 ? Math.round((ps.correct / ps.questions) * 100) : 0;
              return (
                <div key={pl.id} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, padding: "4px 6px", background: "rgba(255,255,255,0.4)", borderRadius: 3 }}>
                  <FeltBirdIcon birdIndex={pl.id} size={20} />
                  <span style={{ fontSize: 9, color: "#5a4a35", fontFamily: "var(--ui-font)", flex: 1 }}>{pl.name}</span>
                  <span style={{ fontSize: 8, color: "#6a5a48", fontFamily: "var(--ui-font)" }}>
                    {ps.correct || 0}/{ps.questions || 0} ({pct}%)
                  </span>
                  <span style={{ fontSize: 7, color: "#8a7a68", fontFamily: "var(--ui-font)" }}>
                    Best streak: {ps.bestStreak || 0}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button
              onClick={() => {
                playSound("click");
                dispatch({ type: "RESET" });
              }}
              className="pixel-btn pixel-btn-green"
              style={{ fontSize: 12, padding: "10px 28px" }}
            >
              PLAY AGAIN
            </button>
            <button
              onClick={() => dispatch({ type: "TOGGLE_STATS" })}
              className="pixel-btn pixel-btn-dark"
              style={{ fontSize: 10, padding: "8px 16px" }}
            >
              STATS
            </button>
          </div>
        </div>
        {state.showStats && <StatsScreen stats={stats} onClose={() => dispatch({ type: "TOGGLE_STATS" })} />}
      </div>
    );
  }

  // ──── MAIN GAME SCREEN ────
  const currentP = state.players[state.currentPlayer];
  const timerDuration = settings.timer
    ? settings.timerSeconds || DIFFICULTY_CONFIG[state.difficulty]?.timer || 20
    : 0;

  // Override player positions during hop animation
  const displayPlayers = tokenAnim.active
    ? state.players.map(p => p.id === tokenAnim.playerId ? { ...p, position: tokenAnim.pos } : p)
    : state.players;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#c8b898",
        fontFamily: "var(--ui-font)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(180deg, #a89878 0%, #b8a888 100%)",
          borderBottom: "3px solid #8a7a68",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{"\u{1F426}\u{200D}\u{2B1B}"}</span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: "#f5edd8", textShadow: "1px 1px 0 #6a5a48" }}>
            WOODLAND TRIVIA
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => dispatch({ type: "TOGGLE_EDITOR" })} className="pixel-btn pixel-btn-dark" style={{ fontSize: 7, padding: "3px 8px" }}>
            QUESTIONS
          </button>
          <button onClick={resetView} className="pixel-btn pixel-btn-dark" style={{ fontSize: 7, padding: "3px 8px" }}>
            RESET VIEW
          </button>
          <button onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })} className="pixel-btn pixel-btn-dark" style={{ fontSize: 7, padding: "3px 8px" }}>
            SETTINGS
          </button>
          <button onClick={() => dispatch({ type: "TOGGLE_STATS" })} className="pixel-btn pixel-btn-dark" style={{ fontSize: 7, padding: "3px 8px" }}>
            STATS
          </button>
          <button onClick={() => setShowHistory(h => !h)} className="pixel-btn pixel-btn-dark" style={{ fontSize: 7, padding: "3px 8px" }}>
            LOG
          </button>
          <button
            onClick={() => {
              playSound("click");
              dispatch({ type: "RESET" });
            }}
            className="pixel-btn pixel-btn-red"
            style={{ fontSize: 7, padding: "3px 8px" }}
          >
            NEW GAME
          </button>
        </div>
      </div>

      {/* ── Board area ── */}
      <div
        ref={boardRef}
        style={{ flex: 1, overflow: "hidden", cursor: dragging ? "grabbing" : "grab", position: "relative" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: dragging ? "none" : "transform 0.15s ease",
          }}
        >
          <div style={{ width: "100%", height: "100%" }}>
            <GameBoard spaces={BOARD_SPACES} players={displayPlayers} currentPlayer={state.currentPlayer} animatingPlayerId={tokenAnim.active ? tokenAnim.playerId : null} />
          </div>
        </div>

        {/* Bonus notification */}
        {bonusNotif && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "linear-gradient(135deg, #f0c040, #e8a820)",
            color: "#5a3a10",
            fontFamily: "'Press Start 2P'",
            fontSize: 18,
            padding: "16px 32px",
            borderRadius: 8,
            border: "4px solid #c89030",
            boxShadow: "0 0 30px rgba(200,144,48,0.6), 4px 4px 0 rgba(80,60,40,0.3)",
            zIndex: 20,
            animation: "pixelGrow 0.3s ease-out",
            textAlign: "center",
          }}>
            {bonusNotif}
          </div>
        )}

        {/* Zoom controls */}
        <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            ["+", () => setZoom((z) => Math.min(4, z + 0.3))],
            ["-", () => setZoom((z) => Math.max(0.4, z - 0.3))],
            ["R", resetView],
          ].map(([label, fn], i) => (
            <button key={i} onClick={fn} className="pixel-btn pixel-btn-dark" style={{ width: 36, height: 36, fontSize: 14, padding: 0 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── HUD (bottom bar) ── */}
      <div
        style={{
          padding: "10px 14px",
          background: "linear-gradient(180deg, #b8a888 0%, #a89878 100%)",
          borderTop: "3px solid #8a7a68",
          boxShadow: "inset 0 2px 4px rgba(255,255,255,0.1), 0 -2px 6px rgba(80,60,40,0.15)",
          flexShrink: 0,
        }}
      >
        {/* Message */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 8,
            padding: "8px 12px",
            background: "linear-gradient(180deg, #f0e8d8 0%, #e8dcc8 100%)",
            border: "2px solid #b8a888",
            borderRadius: 6,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--ui-font)",
              fontSize: 11,
              color: state.message.includes("Correct") || state.message.includes("earns")
                ? "#3a7a28"
                : state.message.includes("Wrong") || state.message.includes("Time") || state.message.includes("back")
                  ? "#b84838"
                  : "#8a6828",
              textShadow: "none",
            }}
          >
            {state.message}
          </span>
        </div>

        {/* Player cards + Dice */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          {state.players.map((p, i) => {
            const isCurr = i === state.currentPlayer;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: isCurr ? "8px 14px" : "6px 12px",
                  background: isCurr ? "linear-gradient(135deg, rgba(200,144,48,0.3), rgba(240,200,100,0.2))" : "rgba(240,228,208,0.6)",
                  border: isCurr ? "3px solid #c89030" : "2px solid #b8a888",
                  borderRadius: 6,
                  transition: "all 0.3s",
                  boxShadow: isCurr ? "0 0 16px rgba(200,144,48,0.4), inset 0 0 8px rgba(200,144,48,0.15)" : "2px 2px 0 rgba(80,60,40,0.15)",
                  animation: isCurr ? "activeGlow 2s infinite ease-in-out" : "none",
                  transform: isCurr ? "scale(1.08)" : "scale(1)",
                  position: "relative",
                }}
              >
                {isCurr && (
                  <div style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#c89030",
                    color: "#f5edd8",
                    fontFamily: "'Press Start 2P'",
                    fontSize: 6,
                    padding: "2px 8px",
                    borderRadius: 3,
                    whiteSpace: "nowrap",
                    animation: "bounce 1s infinite",
                    border: "1px solid #a87020",
                    zIndex: 2,
                  }}>
                    YOUR TURN!
                  </div>
                )}
                <div
                  style={{
                    width: isCurr ? 40 : 34,
                    height: isCurr ? 40 : 34,
                    background: isCurr ? "#fff8e8" : "#f5edd8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `3px solid ${isCurr ? "#c89030" : p.accent}`,
                    boxShadow: isCurr ? "0 0 8px rgba(200,144,48,0.3)" : "2px 2px 0 rgba(80,60,40,0.25)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <FeltBirdIcon birdIndex={p.id} size={isCurr ? 34 : 28} />
                </div>
                <div>
                  <div style={{ fontSize: isCurr ? 10 : 9, color: isCurr ? "#8a6828" : "#5a4a35", fontWeight: "bold" }}>
                    {p.name}
                    <span style={{ fontSize: 7, color: "#8a7a68", marginLeft: 4 }}>({p.age >= 15 ? "Adult" : "Child"})</span>
                    {p.hints > 0 && (
                      <span style={{ fontSize: 7, color: "#8a7a68", marginLeft: 4 }}>
                        [{p.hints}h]
                      </span>
                    )}
                  </div>
                  <FeatherDisplay feathers={p.feathers} size={16} />
                </div>
              </div>
            );
          })}

          {/* Dice */}
          {state.phase === "playing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <PixelDice
                value={diceDisplay || state.diceValue}
                rolling={diceRolling}
                onRoll={rollDice}
                disabled={diceRolling || tokenAnim.active || state.phase !== "playing"}
              />
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#6a5a48" }}>
                {diceRolling ? "..." : "ROLL! [Space]"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Overlays ── */}

      {/* Hub category choice */}
      {state.phase === "hub_choice" && !tokenAnim.active && (
        <CategoryPicker
          feathers={currentP.feathers}
          onPick={(catIdx) => {
            playSound("click");
            dispatch({ type: "CHOOSE_HUB_CATEGORY", catIndex: catIdx });
          }}
        />
      )}

      {/* Event space overlay */}
      {state.phase === "event" && state.currentEvent && !tokenAnim.active && (
        <EventOverlay
          event={state.currentEvent}
          players={state.players}
          currentPlayer={state.currentPlayer}
          onResolve={handleResolveEvent}
        />
      )}

      {/* Question overlay */}
      {state.phase === "question" && state.currentQuestion && !showPenalty && !tokenAnim.active && (
        <div>
          <QuestionCard
            question={state.currentQuestion}
            catIndex={state.currentCatIndex}
            selectedAnswer={state.selectedAnswer}
            answerRevealed={state.answerRevealed}
            eliminatedOptions={state.eliminatedOptions}
            onAnswer={handleAnswer}
            timerDuration={timerDuration}
            timerEnabled={settings.timer && !state.answerRevealed}
            soundEnabled={settings.sound}
            onTimerExpire={handleTimerExpire}
            hints={currentP.hints}
            onHint={handleHint}
            doubleOrNothing={state.doubleOrNothing}
          />
          {state.answerRevealed && (
            <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 101, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={handleNextTurn} className="pixel-btn pixel-btn-green" style={{ fontSize: 12, padding: "10px 28px" }}>
                {(state.selectedAnswer !== state.currentQuestion?.answer || state.timerExpired) && !state.doubleOrNothing ? "PENALTY ROLL" : "CONTINUE"}
              </button>
              <span style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#f5edd8", opacity: 0.7 }}>or press Enter</span>
            </div>
          )}
        </div>
      )}

      {/* Streak reward notification */}
      {streakNotif && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200,
          background: "linear-gradient(135deg, #f0c040, #e8a820)", color: "#5a3a10",
          fontFamily: "'Press Start 2P'", fontSize: 12, padding: "12px 24px", borderRadius: 8,
          border: "3px solid #c89030", boxShadow: "0 0 20px rgba(200,144,48,0.6)",
          animation: "pixelGrow 0.3s ease-out", textAlign: "center",
        }}>
          {streakNotif}
        </div>
      )}

      {/* Penalty overlay */}
      {showPenalty && (
        <PenaltyOverlay
          rolling={penaltyRolling}
          value={penaltyDisplay}
          playerName={currentP.name}
        />
      )}

      {/* Turn history panel */}
      {showHistory && (
        <TurnHistoryPanel
          history={state.turnHistory || []}
          onClose={() => setShowHistory(false)}
        />
      )}

      {state.showEditor && (
        <QuestionEditor
          questions={state.questions}
          onUpdate={(q) => dispatch({ type: "UPDATE_QUESTIONS", questions: q })}
          onClose={() => dispatch({ type: "TOGGLE_EDITOR" })}
        />
      )}
      {state.showStats && <StatsScreen stats={stats} onClose={() => dispatch({ type: "TOGGLE_STATS" })} />}
      {state.showSettings && (
        <SettingsPanel settings={settings} onUpdate={setSettings} onClose={() => dispatch({ type: "TOGGLE_SETTINGS" })} />
      )}
    </div>
  );
}
