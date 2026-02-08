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

const BOARD_SPACES = SPACE_POINTS.map((pt, i) => {
  const hubIdx = HUB_INDICES.indexOf(i);
  const prev = SPACE_POINTS[Math.max(0, i - 1)];
  const next = SPACE_POINTS[Math.min(SPACE_POINTS.length - 1, i + 1)];
  const angle = Math.atan2(next.y - prev.y, next.x - prev.x) * (180 / Math.PI);
  const isHub = hubIdx >= 0;
  return {
    id: i,
    x: pt.x,
    y: pt.y,
    angle,
    catIndex: hubIdx >= 0 ? hubIdx : i % 6,
    isHub,
    hubIndex: hubIdx,
    isBonus: (i + 1) % 5 === 0 && !isHub,
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
function nearPath(x, y, dist = 48) {
  return BOARD_SPACES.some(s => Math.abs(s.x - x) < dist && Math.abs(s.y - y) < dist);
}

const DECO = [];
const BOARD_W = 1800, BOARD_H = 1100;

// ── Felt image configuration ──
const FELT_IMAGES = {
  pine: { src: "/felt/pine-tree.png", w: 50, h: 78 },
  "pine-dark": { src: "/felt/pine-dark.png", w: 50, h: 78 },
  "pine-light": { src: "/felt/pine-light.png", w: 50, h: 78 },
  "pine-olive": { src: "/felt/pine-olive.png", w: 50, h: 78 },
  "pine-emerald": { src: "/felt/pine-emerald.png", w: 50, h: 78 },
  "pine-sage": { src: "/felt/pine-sage.png", w: 50, h: 78 },
  birch: { src: "/felt/birch-tree.png", w: 45, h: 73 },
  "birch2": { src: "/felt/birch-tree-2.png", w: 45, h: 73 },
  "berry-branch": { src: "/felt/berry-branch.png", w: 35, h: 38 },
  acorn: { src: "/felt/acorn.png", w: 28, h: 33 },
  "mushroom-red": { src: "/felt/mushroom-red.png", w: 32, h: 37 },
  "mushroom-brown": { src: "/felt/mushroom-brown.png", w: 30, h: 28 },
  "oak-leaf": { src: "/felt/oak-leaf.png", w: 30, h: 38 },
  fern: { src: "/felt/fern.png", w: 35, h: 34 },
  rabbit: { src: "/felt/rabbit.png", w: 40, h: 54 },
  fox: { src: "/felt/fox.png", w: 45, h: 53 },
  owl: { src: "/felt/owl.png", w: 40, h: 44 },
  hedgehog: { src: "/felt/hedgehog.png", w: 40, h: 30 },
  squirrel: { src: "/felt/squirrel.png", w: 45, h: 37 },
  bear: { src: "/felt/bear.png", w: 40, h: 64 },
  snail: { src: "/felt/snail.png", w: 38, h: 25 },
};

// Dense pine forests between the trail
const PINE_TYPES = ["pine", "pine", "pine-dark", "pine-dark", "pine-light", "pine-olive", "pine-emerald", "pine-sage"];
for (let i = 0; i < 600; i++) {
  const x = 10 + rng() * (BOARD_W - 20);
  const y = 60 + rng() * (BOARD_H - 70);
  // Keep trees clear of the trail so the path stays visible
  if (!nearPath(x, y, 55)) {
    const type = PINE_TYPES[Math.floor(rng() * PINE_TYPES.length)];
    const scale = 0.3 + rng() * 0.8;  // wide range: small distant trees to large foreground
    DECO.push({ type, x, y, scale });
  }
}
// Scatter a few birch trees for variety
for (let i = 0; i < 15; i++) {
  const x = 40 + rng() * (BOARD_W - 80);
  const y = 100 + rng() * (BOARD_H - 140);
  if (!nearPath(x, y, 35)) {
    DECO.push({ type: rng() > 0.5 ? "birch" : "birch2", x, y, scale: 0.6 + rng() * 0.5 });
  }
}
// Acorns (replacing rocks)
for (let i = 0; i < 10; i++) {
  const x = 50 + rng() * (BOARD_W - 100);
  const y = 50 + rng() * (BOARD_H - 100);
  if (!nearPath(x, y, 40)) DECO.push({ type: "acorn", x, y, scale: 0.6 + rng() * 0.6 });
}
// Berry branches & bushes
for (let i = 0; i < 12; i++) {
  const x = 40 + rng() * (BOARD_W - 80);
  const y = 40 + rng() * (BOARD_H - 80);
  if (!nearPath(x, y, 42)) DECO.push({ type: "berry-branch", x, y, scale: 0.6 + rng() * 0.5 });
}
// Mushrooms (mix of red and brown)
for (let i = 0; i < 12; i++) {
  const x = 60 + rng() * (BOARD_W - 120);
  const y = 60 + rng() * (BOARD_H - 120);
  if (!nearPath(x, y, 35)) DECO.push({ type: rng() > 0.5 ? "mushroom-red" : "mushroom-brown", x, y, scale: 0.6 + rng() * 0.5 });
}
// Leaves & ferns
for (let i = 0; i < 14; i++) {
  const x = 50 + rng() * (BOARD_W - 100);
  const y = 50 + rng() * (BOARD_H - 100);
  if (!nearPath(x, y, 30)) DECO.push({ type: rng() > 0.5 ? "oak-leaf" : "fern", x, y, scale: 0.5 + rng() * 0.5 });
}
// Animals — min Y accounts for tallest animal (bear h:64) at max scale
const animalTypes = ["fox", "fox", "rabbit", "rabbit", "owl", "owl", "hedgehog", "squirrel", "bear", "snail"];
for (let i = 0; i < animalTypes.length; i++) {
  const x = 60 + rng() * (BOARD_W - 120);
  const y = 90 + rng() * (BOARD_H - 150);
  if (!nearPath(x, y, 55)) DECO.push({ type: animalTypes[i], x, y, scale: 0.7 + rng() * 0.4 });
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

// ──── PLAYER CONFIG ────
const BIRD_NAMES = ["Pheasant", "Hen", "Pigeon", "Duck"];
const BIRD_COLORS = ["#8a5a30", "#c8baa8", "#7888a0", "#b8a070"];
const BIRD_ACCENTS = ["#c05040", "#d4a850", "#5878a8", "#508848"];
const BIRD_EMOJIS = ["\u{1F426}\u{200D}\u{2B1B}", "\u{1F414}", "\u{1F54A}\u{FE0F}", "\u{1F986}"];
const BIRD_IMAGES = ["/felt/bird-pheasant.png", "/felt/bird-chicken.png", "/felt/bird-pigeon.png", "/felt/bird-duck.png"];

// ──── GAME REDUCER ────
function makeInitialState(playerCount, names, ages, difficulty) {
  const diff = DIFFICULTY_CONFIG[difficulty || "medium"];
  return {
    phase: "setup",
    playerCount: playerCount || 2,
    difficulty: difficulty || "medium",
    players: Array.from({ length: playerCount || 2 }, (_, i) => ({
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
      const p = state.players[state.currentPlayer];
      const preRollPos = p.position;
      const newPos = Math.min(p.position + val + bonus, NUM_SPACES - 1);
      const space = BOARD_SPACES[newPos];
      const newPlayers = state.players.map((pl, i) => (i === state.currentPlayer ? { ...pl, position: newPos } : pl));
      const catIndex = space.catIndex;
      const playerAge = p.age || 99;
      let qs = state.questions[CATEGORIES[catIndex]] || [];
      // If player has 3+ wrong in a row, force easy difficulty
      const streakOverride = p.wrongStreak >= 3;
      const diceDifficulty = streakOverride ? "easy" : (val <= 2 ? "easy" : val <= 4 ? "medium" : "hard");
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
      const rollMsg = bonus > 0 ? `${val} + ${bonus} bonus` : `${val}`;
      const streakMsg = streakOverride ? " (easier question!)" : "";
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
        askedQuestions: [...state.askedQuestions, question.question],
        diceDifficulty,
        questionStartTime: Date.now(),
        message: space.isHub
          ? `${p.name} rolled ${rollMsg} — ${diceDifficulty.toUpperCase()} ${CAT_LABELS_SHORT[catIndex]} at ${HUB_NAMES[space.hubIndex]}!${streakMsg}`
          : `${p.name} rolled ${rollMsg} — ${diceDifficulty.toUpperCase()} ${CAT_LABELS_SHORT[catIndex]} question!${streakMsg}`,
      };
    }
    case "ANSWER": {
      const correct = action.answer === state.currentQuestion.answer;
      const p = state.players[state.currentPlayer];
      const space = BOARD_SPACES[p.position];
      const speedBonus = correct && state.questionStartTime && (Date.now() - state.questionStartTime) <= 4000;
      let newPlayers = state.players.map(pl => ({ ...pl }));
      // Track wrong streak for difficulty adjustment
      newPlayers[state.currentPlayer] = {
        ...newPlayers[state.currentPlayer],
        wrongStreak: correct ? 0 : (newPlayers[state.currentPlayer].wrongStreak || 0) + 1,
      };
      let winner = null;
      if (correct) {
        if (speedBonus) {
          const bonusPos = Math.min(p.position + 1, NUM_SPACES - 1);
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: bonusPos };
        }
        if (space.isHub) {
          const f = [...newPlayers[state.currentPlayer].feathers];
          f[state.currentCatIndex] = true;
          newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], feathers: f };
          if (f.every(Boolean)) winner = state.currentPlayer;
        }
      }
      return {
        ...state,
        selectedAnswer: action.answer,
        answerRevealed: true,
        players: newPlayers,
        winner,
        speedBonus,
        message: correct
          ? winner !== null
            ? `${p.name} wins the game!`
            : speedBonus
              ? `Correct! SPEED BONUS +1 space!${space.isHub ? ` ${p.name} earns a ${CAT_LABELS_SHORT[state.currentCatIndex]} feather!` : ""}`
              : space.isHub
                ? `Correct! ${p.name} earns a ${CAT_LABELS_SHORT[state.currentCatIndex]} feather!`
                : `Correct! Well done, ${p.name}!`
          : `Wrong! The answer was: ${state.currentQuestion.answer}`,
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
  return (
    <image
      href={cfg.src}
      x={item.x - w / 2}
      y={item.y - h}
      width={w}
      height={h}
      opacity={0.92}
    />
  );
}

// ──── GAME BOARD ────
function GameBoard({ spaces, players, currentPlayer }) {
  return (
    <svg viewBox="0 0 1800 1100" style={{ width: "100%", height: "100%" }}>
      <defs>
        <pattern id="woodGrain" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="transparent" />
          <line x1="0" y1="18" x2="200" y2="20" stroke="#bfae88" strokeWidth="0.8" opacity="0.2" />
          <line x1="0" y1="52" x2="200" y2="50" stroke="#bfae88" strokeWidth="0.5" opacity="0.18" />
          <line x1="0" y1="88" x2="200" y2="90" stroke="#bfae88" strokeWidth="0.7" opacity="0.15" />
          <line x1="0" y1="125" x2="200" y2="123" stroke="#bfae88" strokeWidth="0.4" opacity="0.2" />
          <line x1="0" y1="160" x2="200" y2="162" stroke="#bfae88" strokeWidth="0.6" opacity="0.16" />
          <line x1="0" y1="190" x2="200" y2="188" stroke="#bfae88" strokeWidth="0.5" opacity="0.12" />
        </pattern>
        <radialGradient id="woodVignette" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(80,60,40,0.15)" />
        </radialGradient>
        <filter id="softShadow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Wood background */}
      <rect width="1800" height="1100" fill="#c8b898" />
      <rect width="1800" height="1100" fill="url(#woodGrain)" />

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
        <path d={TRAIL_PATH_D} stroke="rgba(100,80,50,0.2)" strokeWidth={36} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#8a7050" strokeWidth={30} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#a08060" strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#b89870" strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Stitch marks */}
        <path d={TRAIL_PATH_D} stroke="#c8a878" strokeWidth={1.2} fill="none" strokeLinecap="round" strokeDasharray="4,7" />
      </g>

      {/* Start / Finish markers */}
      <g>
        <text x={spaces[0].x} y={spaces[0].y + 28} textAnchor="middle" fontSize="8" fill="#5a8a38" fontFamily="'Press Start 2P'" opacity={0.9}>START</text>
        <text x={spaces[NUM_SPACES - 1].x} y={spaces[NUM_SPACES - 1].y + 28} textAnchor="middle" fontSize="8" fill="#c89030" fontFamily="'Press Start 2P'" opacity={0.9}>FINISH</text>
      </g>

      {/* Mid decorations */}
      {DECO.filter(d => d.y >= 500 && d.y < 800).map((item, i) => (
        <FeltDecoration key={`dmid${i}`} item={item} />
      ))}

      {/* Board spaces — rounded felt tiles */}
      {spaces.map((s) => {
        const isHub = s.isHub;
        const isBonus = s.isBonus;
        const hw = isHub ? 28 : isBonus ? 20 : 18;
        const hh = isHub ? 20 : isBonus ? 16 : 14;
        const rx = 6;
        return (
          <g key={`sp${s.id}`} transform={`translate(${s.x}, ${s.y})`}>
            {/* Soft shadow */}
            <rect x={-hw - 1} y={-hh + 2} width={(hw + 1) * 2} height={hh * 2} rx={rx} fill="rgba(60,40,20,0.3)" />
            {/* Cream border for contrast */}
            <rect x={-hw - 3} y={-hh - 3} width={(hw + 3) * 2} height={(hh + 3) * 2} rx={rx + 2} fill={isBonus ? "#fff8e0" : "#f0e8d8"} opacity={0.85} />
            {/* Base felt tile */}
            <rect
              x={-hw}
              y={-hh}
              width={hw * 2}
              height={hh * 2}
              rx={rx}
              fill={isBonus ? "#e8c840" : CAT_COLORS[s.catIndex]}
              stroke={isHub ? "#c89030" : isBonus ? "#c8a020" : "#5a4a35"}
              strokeWidth={isHub ? 3.5 : isBonus ? 3 : 2.5}
              strokeDasharray={isHub ? "none" : isBonus ? "none" : "4,3"}
            />
            {/* Inner felt highlight */}
            <rect x={-hw + 4} y={-hh + 3} width={(hw - 4) * 2} height={(hh - 3) * 2} rx={rx - 2} fill="rgba(255,255,255,0.1)" />
            {/* Hub stitch ring */}
            {isHub && (
              <rect x={-hw - 6} y={-hh - 6} width={(hw + 6) * 2} height={(hh + 6) * 2} rx={rx + 4} fill="none" stroke="#c89030" strokeWidth={2.5} strokeDasharray="5,4" opacity={0.6} />
            )}
            {/* Space number */}
            <text
              x={0}
              y={isHub ? -3 : 3}
              textAnchor="middle"
              fontSize={isHub ? "14" : "11"}
              fill="#fff"
              stroke="#3a2a1a"
              strokeWidth={2.5}
              paintOrder="stroke"
              fontFamily="'Press Start 2P'"
              fontWeight="bold"
              style={{ pointerEvents: "none" }}
            >
              {s.id + 1}
            </text>
            {/* Category icon or bonus star */}
            <text
              x={0}
              y={isHub ? 14 : 14}
              textAnchor="middle"
              fontSize={isHub ? "15" : isBonus ? "12" : "10"}
              style={{ pointerEvents: "none" }}
            >
              {isBonus ? "\u2B50" : CAT_ICONS[s.catIndex]}
            </text>
            {/* Hub name */}
            {isHub && (
              <text
                x={0}
                y={hh + 16}
                textAnchor="middle"
                fontSize="5"
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
        return (
          <g key={`pl${p.id}`} transform={`translate(${tx}, ${ty})`}>
            {/* Shadow */}
            <ellipse cx={0} cy={10} rx={28} ry={9} fill="rgba(0,0,0,0.25)" />
            {/* Bird image token */}
            <image
              href={p.birdImage}
              x={-55}
              y={-100}
              width={110}
              height={110}
              transform={(p.birdImage.includes("pigeon") || p.birdImage.includes("duck")) ? "scale(-1,1)" : undefined}
              style={{ pointerEvents: "none", filter: isCurr ? "drop-shadow(0 0 6px #f0c040)" : "none" }}
            />
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
function QuestionCard({ question, catIndex, selectedAnswer, answerRevealed, eliminatedOptions, onAnswer, timerDuration, timerEnabled, soundEnabled, onTimerExpire, hints, onHint }) {
  if (!question) return null;
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
          {hints > 0 && !answerRevealed && (
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                    background: bg,
                    border: `3px solid ${border}`,
                    padding: "10px 14px",
                    cursor: answerRevealed ? "default" : "pointer",
                    fontFamily: "var(--ui-font)",
                    fontSize: 12,
                    color: textColor,
                    textAlign: "left",
                    transition: "all 0.15s",
                    borderRadius: 4,
                    boxShadow: isSelected && !answerRevealed ? `0 0 8px ${CAT_COLORS[catIndex]}66` : "2px 2px 0 rgba(80,60,40,0.15)",
                    opacity: isEliminated ? 0.3 : 1,
                    animation: answerRevealed && isCorrect ? "correctFlash 0.4s" : answerRevealed && isSelected && !isCorrect ? "wrongFlash 0.4s" : "none",
                  }}
                >
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 10, marginRight: 10, opacity: 0.5 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

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
        { src: "/felt/pine-tree.png", x: "2%", y: "10%", w: 80, opacity: 0.2 },
        { src: "/felt/pine-tree.png", x: "88%", y: "5%", w: 70, opacity: 0.18 },
        { src: "/felt/birch-tree.png", x: "12%", y: "60%", w: 65, opacity: 0.15 },
        { src: "/felt/birch-tree-2.png", x: "82%", y: "55%", w: 60, opacity: 0.17 },
        { src: "/felt/fox.png", x: "6%", y: "75%", w: 55, opacity: 0.2 },
        { src: "/felt/owl.png", x: "90%", y: "72%", w: 50, opacity: 0.18 },
        { src: "/felt/mushroom-red.png", x: "20%", y: "85%", w: 40, opacity: 0.15 },
        { src: "/felt/oak-leaf.png", x: "75%", y: "82%", w: 40, opacity: 0.14 },
        { src: "/felt/rabbit.png", x: "92%", y: "30%", w: 50, opacity: 0.15 },
        { src: "/felt/acorn.png", x: "4%", y: "40%", w: 35, opacity: 0.16 },
        { src: "/felt/fern.png", x: "70%", y: "12%", w: 45, opacity: 0.13 },
        { src: "/felt/snail.png", x: "25%", y: "15%", w: 40, opacity: 0.14 },
        { src: "/felt/squirrel.png", x: "78%", y: "88%", w: 50, opacity: 0.16 },
        { src: "/felt/hedgehog.png", x: "15%", y: "35%", w: 45, opacity: 0.13 },
      ].map((d, i) => (
        <img key={i} src={d.src} alt="" style={{
          position: "absolute", left: d.x, top: d.y, width: d.w,
          opacity: d.opacity, filter: "blur(1px)",
        }} />
      ))}
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

  // Persist settings
  useEffect(() => {
    saveStore(STORE_KEYS.settings, settings);
  }, [settings]);

  const playSound = (sfxName) => {
    if (settings.sound && SFX[sfxName]) SFX[sfxName]();
  };

  // ── Dice rolling ──
  const rollDice = () => {
    if (diceRolling || tokenAnim.active || state.phase !== "playing") return;
    playSound("click");
    const finalValue = Math.floor(Math.random() * 6) + 1;
    setDiceRolling(true);
    playSound("roll");

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
        const toPos = Math.min(fromPos + finalValue, NUM_SPACES - 1);
        const totalSteps = toPos - fromPos;

        if (totalSteps <= 0) {
          setTimeout(() => dispatch({ type: "ROLL_DICE", value: finalValue }), 250);
          return;
        }

        // Animate token hop-by-hop along the trail
        setTimeout(() => {
          let step = 0;
          setTokenAnim({ active: true, playerId: p.id, pos: fromPos });
          const hopInterval = setInterval(() => {
            step++;
            setTokenAnim({ active: true, playerId: p.id, pos: fromPos + step });
            playSound("hop");
            if (step >= totalSteps) {
              clearInterval(hopInterval);
              const landingPos = fromPos + totalSteps;
              const landingSpace = BOARD_SPACES[landingPos];

              // Check for bonus square
              if (landingSpace && landingSpace.isBonus) {
                const bonusVal = Math.floor(Math.random() * 6) + 1;
                playSound("bonus");
                setBonusNotif(`BONUS! +${bonusVal} spaces!`);

                setTimeout(() => {
                  const bonusTarget = Math.min(landingPos + bonusVal, NUM_SPACES - 1);
                  const bonusSteps = bonusTarget - landingPos;
                  if (bonusSteps <= 0) {
                    setTokenAnim({ active: false, playerId: null, pos: 0 });
                    setBonusNotif(null);
                    dispatch({ type: "ROLL_DICE", value: finalValue, bonus: bonusVal });
                    return;
                  }
                  let bStep = 0;
                  const bonusHopInterval = setInterval(() => {
                    bStep++;
                    setTokenAnim({ active: true, playerId: p.id, pos: landingPos + bStep });
                    playSound("hop");
                    if (bStep >= bonusSteps) {
                      clearInterval(bonusHopInterval);
                      setTimeout(() => {
                        setTokenAnim({ active: false, playerId: null, pos: 0 });
                        setBonusNotif(null);
                        dispatch({ type: "ROLL_DICE", value: finalValue, bonus: bonusVal });
                      }, 250);
                    }
                  }, 200);
                }, 600);
              } else {
                setTimeout(() => {
                  setTokenAnim({ active: false, playerId: null, pos: 0 });
                  dispatch({ type: "ROLL_DICE", value: finalValue });
                }, 250);
              }
            }
          }, 200);
        }, 250);
      }
    }, 50 + count * 8);
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
    if (wasWrong && state.winner === null) {
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
            {BIRD_IMAGES.map((src, i) => (
              <img key={i} src={src} alt={BIRD_NAMES[i]} style={{ width: 36, height: 36, objectFit: "contain" }} />
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
              Land on hub spaces to answer questions and collect feathers.
              Land on golden HUB spaces and answer correctly to earn feathers.
              Hubs are spread across different branches, so explore them all!
              Collect all 6 feathers to win! Wrong answers mean a penalty roll backwards!
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
                  <img src={p.birdImage} alt={p.name} style={{ width: 40, height: 40, objectFit: "contain" }} />
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
            <p style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#8a7a68", margin: "0 0 6px" }}>GAME SUMMARY</p>
            <p style={{ fontSize: 9, color: "#5a4a35", margin: "2px 0" }}>
              Questions answered: {stats.questionsAnswered}
            </p>
            <p style={{ fontSize: 9, color: "#5a4a35", margin: "2px 0" }}>
              Accuracy: {stats.questionsAnswered > 0 ? `${Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)}%` : "N/A"}
            </p>
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
            <GameBoard spaces={BOARD_SPACES} players={displayPlayers} currentPlayer={state.currentPlayer} />
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
                  <img src={p.birdImage} alt={p.name} style={{ width: isCurr ? 34 : 28, height: isCurr ? 34 : 28, objectFit: "contain" }} />
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
                {diceRolling ? "..." : "ROLL!"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Overlays ── */}
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
          />
          {state.answerRevealed && (
            <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 101 }}>
              <button onClick={handleNextTurn} className="pixel-btn pixel-btn-green" style={{ fontSize: 12, padding: "10px 28px" }}>
                {state.selectedAnswer !== state.currentQuestion?.answer || state.timerExpired ? "PENALTY ROLL" : "CONTINUE"}
              </button>
            </div>
          )}
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
