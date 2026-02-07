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
// Longer winding trail across a wider landscape (viewBox 1800x1100)
const TRAIL_WAYPOINTS = [
  { x: 100, y: 1000 }, { x: 220, y: 940 }, { x: 380, y: 870 },
  { x: 560, y: 810 }, { x: 740, y: 780 }, { x: 920, y: 830 },
  { x: 1080, y: 890 }, { x: 1220, y: 830 }, { x: 1340, y: 740 },
  { x: 1420, y: 620 }, { x: 1340, y: 500 }, { x: 1160, y: 450 },
  { x: 960, y: 490 }, { x: 780, y: 540 }, { x: 600, y: 500 },
  { x: 440, y: 440 }, { x: 320, y: 360 }, { x: 400, y: 260 },
  { x: 560, y: 200 }, { x: 740, y: 170 }, { x: 940, y: 200 },
  { x: 1120, y: 260 }, { x: 1300, y: 200 }, { x: 1480, y: 130 },
  { x: 1640, y: 100 },
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

const NUM_SPACES = 50;
const TRAIL_PATH_D = catmullRomToSvgPath(TRAIL_WAYPOINTS);
const SPACE_POINTS = samplePath(TRAIL_WAYPOINTS, NUM_SPACES);
const HUB_INDICES = [7, 15, 23, 31, 39, 47];
const HUB_NAMES = ["The Old Oak", "Mossy Bridge", "Bramble Hollow", "Rookery Tower", "Magpie's Market", "Blackbird Pond"];

const BOARD_SPACES = SPACE_POINTS.map((pt, i) => {
  const hubIdx = HUB_INDICES.indexOf(i);
  return {
    id: i,
    x: pt.x,
    y: pt.y,
    catIndex: hubIdx >= 0 ? hubIdx : i % 6,
    isHub: hubIdx >= 0,
    hubIndex: hubIdx,
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
// Trees (pine, oak, birch) — more for bigger board
for (let i = 0; i < 50; i++) {
  const x = 30 + rng() * (BOARD_W - 60);
  const y = 30 + rng() * (BOARD_H - 60);
  if (!nearPath(x, y, 55)) {
    const types = ["pine", "oak", "birch"];
    DECO.push({ type: types[Math.floor(rng() * 3)], x, y, scale: 0.6 + rng() * 0.6 });
  }
}
// Rocks
for (let i = 0; i < 18; i++) {
  const x = 50 + rng() * (BOARD_W - 100);
  const y = 50 + rng() * (BOARD_H - 100);
  if (!nearPath(x, y, 40)) DECO.push({ type: "rock", x, y, scale: 0.5 + rng() * 0.7 });
}
// Bushes
for (let i = 0; i < 22; i++) {
  const x = 40 + rng() * (BOARD_W - 80);
  const y = 40 + rng() * (BOARD_H - 80);
  if (!nearPath(x, y, 40)) DECO.push({ type: "bush", x, y, scale: 0.5 + rng() * 0.5 });
}
// Mushrooms
for (let i = 0; i < 16; i++) {
  const x = 60 + rng() * (BOARD_W - 120);
  const y = 60 + rng() * (BOARD_H - 120);
  if (!nearPath(x, y, 35)) DECO.push({ type: "mushroom", x, y });
}
// Flowers
for (let i = 0; i < 24; i++) {
  const x = 50 + rng() * (BOARD_W - 100);
  const y = 50 + rng() * (BOARD_H - 100);
  const colors = ["#e080a0", "#f0d040", "#80c0f0", "#f0a060", "#c090e0", "#ffffff"];
  if (!nearPath(x, y, 30)) DECO.push({ type: "flowers", x, y, color: colors[Math.floor(rng() * colors.length)] });
}
// Logs
for (let i = 0; i < 8; i++) {
  const x = 80 + rng() * (BOARD_W - 160);
  const y = 80 + rng() * (BOARD_H - 160);
  if (!nearPath(x, y, 45)) DECO.push({ type: "log", x, y, angle: rng() * 60 - 30 });
}
// Animals
const animalTypes = ["rabbit", "rabbit", "deer", "deer", "fox", "owl", "rabbit", "owl"];
for (let i = 0; i < animalTypes.length; i++) {
  const x = 60 + rng() * (BOARD_W - 120);
  const y = 60 + rng() * (BOARD_H - 120);
  if (!nearPath(x, y, 60)) DECO.push({ type: animalTypes[i], x, y });
}
// Sort by Y for depth ordering
DECO.sort((a, b) => a.y - b.y);

// ──── PLAYER CONFIG ────
const BIRD_NAMES = ["Crow", "Magpie", "Rook", "Jackdaw"];
const BIRD_COLORS = ["#1a1a2e", "#c8baa8", "#3d2b5a", "#4a5d6b"];
const BIRD_ACCENTS = ["#ffd700", "#4488cc", "#b070e0", "#50b050"];
const BIRD_EMOJIS = ["\u{1F426}\u{200D}\u{2B1B}", "\u{1F426}", "\u{1FAB6}", "\u{1F54A}\u{FE0F}"];

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
      position: 0,
      feathers: [false, false, false, false, false, false],
      hints: diff.hintsPerPlayer,
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
      const p = state.players[state.currentPlayer];
      const newPos = Math.min(p.position + val, NUM_SPACES - 1);
      const space = BOARD_SPACES[newPos];
      const newPlayers = state.players.map((pl, i) => (i === state.currentPlayer ? { ...pl, position: newPos } : pl));
      const catIndex = space.catIndex;
      const diff = state.difficulty;
      const playerAge = p.age || 99;
      let qs = state.questions[CATEGORIES[catIndex]] || [];
      // Filter by difficulty
      if (diff === "easy") qs = qs.filter(q => q.difficulty !== "hard");
      else if (diff === "hard") qs = qs.filter(q => q.difficulty !== "easy");
      // Filter by player age
      qs = qs.filter(q => (q.ageMin || 0) <= playerAge);
      // Filter out already-asked
      let available = qs.filter(q => !state.askedQuestions.includes(q.question));
      // If none available, allow repeats
      if (available.length === 0) available = qs;
      // Fallback to all questions in category
      if (available.length === 0) available = state.questions[CATEGORIES[catIndex]] || [];
      if (available.length === 0) {
        return {
          ...state,
          players: newPlayers,
          diceValue: val,
          currentPlayer: (state.currentPlayer + 1) % state.playerCount,
          message: `${p.name} rolled ${val}. No questions! Next turn.`,
        };
      }
      const question = available[Math.floor(Math.random() * available.length)];
      return {
        ...state,
        players: newPlayers,
        diceValue: val,
        phase: "question",
        currentQuestion: question,
        currentCatIndex: catIndex,
        selectedAnswer: null,
        answerRevealed: false,
        eliminatedOptions: [],
        timerExpired: false,
        askedQuestions: [...state.askedQuestions, question.question],
        message: space.isHub
          ? `${p.name} rolled ${val} and landed on ${HUB_NAMES[space.hubIndex]}!`
          : `${p.name} rolled ${val}! ${CAT_LABELS_SHORT[catIndex]} question...`,
      };
    }
    case "ANSWER": {
      const correct = action.answer === state.currentQuestion.answer;
      const p = state.players[state.currentPlayer];
      const space = BOARD_SPACES[p.position];
      let newPlayers = state.players.map(pl => ({ ...pl }));
      let winner = null;
      if (correct && space.isHub) {
        const f = [...p.feathers];
        f[state.currentCatIndex] = true;
        newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], feathers: f };
        if (f.every(Boolean)) winner = state.currentPlayer;
      }
      return {
        ...state,
        selectedAnswer: action.answer,
        answerRevealed: true,
        players: newPlayers,
        winner,
        message: correct
          ? winner !== null
            ? `${p.name} wins the game!`
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
      const newPos = Math.max(0, p.position - action.value);
      const newPlayers = state.players.map((pl, i) =>
        i === state.currentPlayer ? { ...pl, position: newPos } : pl
      );
      return {
        ...state,
        players: newPlayers,
        message: `${p.name} moves back ${action.value} space${action.value !== 1 ? "s" : ""}!`,
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

// ──── ISOMETRIC SVG DECORATIONS ────
function IsoPine({ x, y, s = 1 }) {
  return (
    <g>
      <ellipse cx={x + 5 * s} cy={y + 3 * s} rx={14 * s} ry={5 * s} fill="rgba(0,0,0,0.15)" />
      <rect x={x - 2.5 * s} y={y - 28 * s} width={5 * s} height={30 * s} fill="#5a3a1a" />
      <polygon points={`${x},${y - 55 * s} ${x - 18 * s},${y - 15 * s} ${x + 18 * s},${y - 15 * s}`} fill="#1a4a10" />
      <polygon points={`${x},${y - 62 * s} ${x - 14 * s},${y - 26 * s} ${x + 14 * s},${y - 26 * s}`} fill="#226818" />
      <polygon points={`${x},${y - 68 * s} ${x - 10 * s},${y - 36 * s} ${x + 10 * s},${y - 36 * s}`} fill="#2a8020" />
      <polygon points={`${x},${y - 72 * s} ${x - 5 * s},${y - 46 * s} ${x + 5 * s},${y - 46 * s}`} fill="#34942a" />
    </g>
  );
}

function IsoOak({ x, y, s = 1 }) {
  return (
    <g>
      <ellipse cx={x + 6 * s} cy={y + 4 * s} rx={20 * s} ry={7 * s} fill="rgba(0,0,0,0.15)" />
      <rect x={x - 4 * s} y={y - 22 * s} width={8 * s} height={24 * s} fill="#6b4226" />
      <line x1={x} y1={y - 18 * s} x2={x - 10 * s} y2={y - 28 * s} stroke="#6b4226" strokeWidth={3 * s} />
      <line x1={x} y1={y - 16 * s} x2={x + 12 * s} y2={y - 26 * s} stroke="#6b4226" strokeWidth={3 * s} />
      <circle cx={x - 6 * s} cy={y - 34 * s} r={12 * s} fill="#2a5016" />
      <circle cx={x + 8 * s} cy={y - 32 * s} r={14 * s} fill="#1e4010" />
      <circle cx={x} cy={y - 40 * s} r={13 * s} fill="#2d6018" />
      <circle cx={x - 10 * s} cy={y - 38 * s} r={9 * s} fill="#3a7a24" />
      <circle cx={x + 6 * s} cy={y - 44 * s} r={10 * s} fill="#347020" />
      <circle cx={x - 2 * s} cy={y - 46 * s} r={5 * s} fill="#408a2a" opacity={0.6} />
    </g>
  );
}

function IsoBirch({ x, y, s = 1 }) {
  return (
    <g>
      <ellipse cx={x + 4 * s} cy={y + 3 * s} rx={12 * s} ry={4 * s} fill="rgba(0,0,0,0.12)" />
      <rect x={x - 2 * s} y={y - 38 * s} width={4 * s} height={40 * s} fill="#e8e0d0" />
      <rect x={x - 1.5 * s} y={y - 30 * s} width={3 * s} height={4 * s} fill="#a09080" rx={1} />
      <rect x={x - 1 * s} y={y - 18 * s} width={2 * s} height={3 * s} fill="#a09080" rx={1} />
      <rect x={x - 1.5 * s} y={y - 8 * s} width={3 * s} height={3 * s} fill="#a09080" rx={1} />
      <line x1={x} y1={y - 32 * s} x2={x - 8 * s} y2={y - 40 * s} stroke="#e8e0d0" strokeWidth={2 * s} />
      <line x1={x} y1={y - 28 * s} x2={x + 9 * s} y2={y - 36 * s} stroke="#e8e0d0" strokeWidth={2 * s} />
      <circle cx={x - 4 * s} cy={y - 42 * s} r={8 * s} fill="#5aaa38" opacity={0.8} />
      <circle cx={x + 5 * s} cy={y - 38 * s} r={9 * s} fill="#4a9830" opacity={0.8} />
      <circle cx={x} cy={y - 46 * s} r={7 * s} fill="#68b840" opacity={0.7} />
      <circle cx={x - 6 * s} cy={y - 36 * s} r={5 * s} fill="#78c848" opacity={0.5} />
    </g>
  );
}

function IsoRock({ x, y, s = 1 }) {
  return (
    <g>
      <ellipse cx={x + 3 * s} cy={y + 2 * s} rx={10 * s} ry={4 * s} fill="rgba(0,0,0,0.12)" />
      <path d={`M${x - 10 * s},${y} L${x - 8 * s},${y - 8 * s} L${x - 2 * s},${y - 12 * s} L${x + 6 * s},${y - 10 * s} L${x + 10 * s},${y - 4 * s} L${x + 8 * s},${y} Z`} fill="#808088" />
      <path d={`M${x - 8 * s},${y - 8 * s} L${x - 2 * s},${y - 12 * s} L${x + 6 * s},${y - 10 * s} L${x + 2 * s},${y - 6 * s} Z`} fill="#9898a0" />
      <ellipse cx={x - 2 * s} cy={y - 10 * s} rx={4 * s} ry={2 * s} fill="#3a6a22" opacity={0.5} />
    </g>
  );
}

function IsoBush({ x, y, s = 1 }) {
  return (
    <g>
      <ellipse cx={x + 3 * s} cy={y + 2 * s} rx={10 * s} ry={4 * s} fill="rgba(0,0,0,0.1)" />
      <ellipse cx={x - 3 * s} cy={y - 4 * s} rx={8 * s} ry={6 * s} fill="#2a5a18" />
      <ellipse cx={x + 4 * s} cy={y - 5 * s} rx={9 * s} ry={7 * s} fill="#1e4a12" />
      <ellipse cx={x} cy={y - 8 * s} rx={7 * s} ry={5 * s} fill="#347020" />
      <circle cx={x - 4 * s} cy={y - 6 * s} r={2 * s} fill="#c04050" />
      <circle cx={x + 3 * s} cy={y - 8 * s} r={1.5 * s} fill="#c04050" />
    </g>
  );
}

function IsoMushroom({ x, y }) {
  return (
    <g>
      <rect x={x - 1.5} y={y - 6} width={3} height={6} fill="#e8ddd0" />
      <ellipse cx={x} cy={y - 7} rx={6} ry={4} fill="#c04040" />
      <ellipse cx={x} cy={y - 8} rx={4} ry={2.5} fill="#d05050" />
      <circle cx={x - 2} cy={y - 8} r={1} fill="#f0e0e0" />
      <circle cx={x + 2} cy={y - 9} r={0.8} fill="#f0e0e0" />
      <rect x={x + 4} y={y - 4} width={2} height={4} fill="#e8ddd0" />
      <ellipse cx={x + 5} cy={y - 5} rx={3.5} ry={2.5} fill="#b87830" />
    </g>
  );
}

function IsoFlowers({ x, y, color = "#e080a0" }) {
  return (
    <g>
      <line x1={x - 3} y1={y} x2={x - 3} y2={y - 7} stroke="#3a6b1e" strokeWidth={1.5} />
      <line x1={x + 3} y1={y} x2={x + 3} y2={y - 9} stroke="#3a6b1e" strokeWidth={1.5} />
      <line x1={x} y1={y - 1} x2={x} y2={y - 8} stroke="#3a6b1e" strokeWidth={1.5} />
      <circle cx={x - 3} cy={y - 8} r={2.5} fill={color} />
      <circle cx={x + 3} cy={y - 10} r={3} fill={color} />
      <circle cx={x} cy={y - 9} r={2} fill={color} opacity={0.8} />
      <circle cx={x - 3} cy={y - 8} r={1} fill="#ffdd40" />
      <circle cx={x + 3} cy={y - 10} r={1.2} fill="#ffdd40" />
      <circle cx={x} cy={y - 9} r={0.8} fill="#ffdd40" />
    </g>
  );
}

function IsoLog({ x, y, angle = 0 }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      <ellipse cx={3} cy={2} rx={18} ry={5} fill="rgba(0,0,0,0.1)" />
      <rect x={-16} y={-5} width={32} height={8} rx={4} fill="#6b4226" />
      <rect x={-16} y={-5} width={32} height={4} rx={4} fill="#7a5230" />
      <ellipse cx={-16} cy={-1} rx={4} ry={4} fill="#5a3a1a" />
      <ellipse cx={-16} cy={-1} rx={3} ry={3} fill="#7a5a30" />
      <circle cx={-16} cy={-1} r={1} fill="#503018" />
      <ellipse cx={-8} cy={-4} rx={3} ry={1.5} fill="#2a5a18" opacity={0.6} />
    </g>
  );
}

function IsoRabbit({ x, y }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={5} ry={3} fill="#c0a888" />
      <ellipse cx={x + 4} cy={y - 2} rx={3} ry={2.5} fill="#c8b090" />
      <ellipse cx={x + 2} cy={y - 6} rx={1.2} ry={3.5} fill="#c0a888" />
      <ellipse cx={x + 4} cy={y - 6} rx={1.2} ry={3.5} fill="#c0a888" />
      <circle cx={x + 5} cy={y - 2.5} r={0.6} fill="#1a1a1a" />
      <circle cx={x - 5} cy={y + 1} r={2} fill="#c8b898" />
    </g>
  );
}

function IsoDeer({ x, y }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={8} ry={4} fill="#b08050" />
      <rect x={x - 5} y={y} width={2} height={8} fill="#906838" />
      <rect x={x + 3} y={y} width={2} height={8} fill="#906838" />
      <ellipse cx={x + 8} cy={y - 3} rx={3.5} ry={3} fill="#b88858" />
      <circle cx={x + 10} cy={y - 4} r={0.6} fill="#1a1a1a" />
      <line x1={x + 7} y1={y - 6} x2={x + 5} y2={y - 12} stroke="#906838" strokeWidth={1.2} />
      <line x1={x + 5} y1={y - 12} x2={x + 3} y2={y - 14} stroke="#906838" strokeWidth={1} />
      <line x1={x + 5} y1={y - 12} x2={x + 7} y2={y - 14} stroke="#906838" strokeWidth={1} />
      <line x1={x + 9} y1={y - 6} x2={x + 11} y2={y - 12} stroke="#906838" strokeWidth={1.2} />
      <line x1={x + 11} y1={y - 12} x2={x + 9} y2={y - 14} stroke="#906838" strokeWidth={1} />
      <line x1={x + 11} y1={y - 12} x2={x + 13} y2={y - 14} stroke="#906838" strokeWidth={1} />
    </g>
  );
}

function IsoFox({ x, y }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={6} ry={3.5} fill="#d07030" />
      <ellipse cx={x + 6} cy={y - 2} rx={3.5} ry={3} fill="#d07030" />
      <polygon points={`${x + 5},${y - 5} ${x + 4},${y - 9} ${x + 7},${y - 5}`} fill="#d07030" />
      <polygon points={`${x + 8},${y - 5} ${x + 7},${y - 9} ${x + 10},${y - 5}`} fill="#d07030" />
      <ellipse cx={x + 7} cy={y - 1} rx={2} ry={1.5} fill="#f0e0d0" />
      <circle cx={x + 8} cy={y - 3} r={0.5} fill="#1a1a1a" />
      <path d={`M${x - 6},${y} Q${x - 10},${y - 4} ${x - 8},${y - 6}`} stroke="#e08040" strokeWidth={2} fill="none" />
      <circle cx={x - 8} cy={y - 6} r={1.5} fill="#f0e0d0" />
    </g>
  );
}

function IsoOwl({ x, y }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={5} ry={6} fill="#8a7060" />
      <ellipse cx={x} cy={y - 4} rx={4.5} ry={4} fill="#9a8070" />
      <circle cx={x - 2} cy={y - 5} r={2} fill="#f0e8d0" />
      <circle cx={x + 2} cy={y - 5} r={2} fill="#f0e8d0" />
      <circle cx={x - 2} cy={y - 5} r={1} fill="#1a1a1a" />
      <circle cx={x + 2} cy={y - 5} r={1} fill="#1a1a1a" />
      <polygon points={`${x},${y - 3.5} ${x - 1},${y - 2.5} ${x + 1},${y - 2.5}`} fill="#d0a040" />
      <polygon points={`${x - 4},${y - 7} ${x - 2},${y - 8} ${x - 3},${y - 5}`} fill="#7a6050" />
      <polygon points={`${x + 4},${y - 7} ${x + 2},${y - 8} ${x + 3},${y - 5}`} fill="#7a6050" />
      <ellipse cx={x} cy={y + 2} rx={3} ry={1.5} fill="#786050" />
    </g>
  );
}

function DecoElement({ item }) {
  switch (item.type) {
    case "pine": return <IsoPine x={item.x} y={item.y} s={item.scale} />;
    case "oak": return <IsoOak x={item.x} y={item.y} s={item.scale} />;
    case "birch": return <IsoBirch x={item.x} y={item.y} s={item.scale} />;
    case "rock": return <IsoRock x={item.x} y={item.y} s={item.scale} />;
    case "bush": return <IsoBush x={item.x} y={item.y} s={item.scale} />;
    case "mushroom": return <IsoMushroom x={item.x} y={item.y} />;
    case "flowers": return <IsoFlowers x={item.x} y={item.y} color={item.color} />;
    case "log": return <IsoLog x={item.x} y={item.y} angle={item.angle} />;
    case "rabbit": return <IsoRabbit x={item.x} y={item.y} />;
    case "deer": return <IsoDeer x={item.x} y={item.y} />;
    case "fox": return <IsoFox x={item.x} y={item.y} />;
    case "owl": return <IsoOwl x={item.x} y={item.y} />;
    default: return null;
  }
}

// ──── GAME BOARD ────
function GameBoard({ spaces, players, currentPlayer }) {
  return (
    <svg viewBox="0 0 1800 1100" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="forestGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3a10" />
          <stop offset="40%" stopColor="#1e4214" />
          <stop offset="100%" stopColor="#2a5a20" />
        </linearGradient>
        <pattern id="grassTex" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="transparent" />
          <circle cx="4" cy="6" r="0.8" fill="#245018" opacity="0.4" />
          <circle cx="16" cy="3" r="0.6" fill="#1e4212" opacity="0.3" />
          <circle cx="10" cy="14" r="0.7" fill="#2a5a1a" opacity="0.35" />
          <circle cx="20" cy="18" r="0.5" fill="#1e4816" opacity="0.3" />
          <circle cx="6" cy="20" r="0.8" fill="#285a1e" opacity="0.25" />
        </pattern>
        <radialGradient id="forestLight" cx="0.25" cy="0.15" r="0.7">
          <stop offset="0%" stopColor="rgba(255,255,200,0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="forestMist" cx="0.6" cy="0.9" r="0.5">
          <stop offset="0%" stopColor="rgba(150,180,160,0.06)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground */}
      <rect width="1800" height="1100" fill="url(#forestGround)" />
      <rect width="1800" height="1100" fill="url(#grassTex)" />

      {/* Background decorations (behind path) */}
      {DECO.filter(d => d.y < 500).map((item, i) => (
        <DecoElement key={`dbg${i}`} item={item} />
      ))}

      {/* Trail path — wider, clearer, with edge markings */}
      <path d={TRAIL_PATH_D} stroke="#1a1008" strokeWidth={44} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
      <path d={TRAIL_PATH_D} stroke="#4a3018" strokeWidth={38} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={TRAIL_PATH_D} stroke="#6a4820" strokeWidth={32} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={TRAIL_PATH_D} stroke="#8a6030" strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={TRAIL_PATH_D} stroke="#a07838" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8,14" opacity={0.35} />

      {/* Start / Finish markers */}
      <g>
        <text x={spaces[0].x} y={spaces[0].y + 28} textAnchor="middle" fontSize="8" fill="#80e050" fontFamily="'Press Start 2P'" opacity={0.8}>START</text>
        <text x={spaces[NUM_SPACES - 1].x} y={spaces[NUM_SPACES - 1].y - 28} textAnchor="middle" fontSize="8" fill="#f0c040" fontFamily="'Press Start 2P'" opacity={0.8}>FINISH</text>
      </g>

      {/* Mid decorations */}
      {DECO.filter(d => d.y >= 500 && d.y < 800).map((item, i) => (
        <DecoElement key={`dmid${i}`} item={item} />
      ))}

      {/* Board spaces */}
      {spaces.map((s) => {
        const isHub = s.isHub;
        const r = isHub ? 22 : 14;
        return (
          <g key={`sp${s.id}`}>
            {/* Shadow */}
            <ellipse cx={s.x + 3} cy={s.y + 3} rx={r} ry={r * 0.6} fill="rgba(0,0,0,0.25)" />
            {/* Base circle */}
            <circle
              cx={s.x}
              cy={s.y}
              r={r}
              fill={CAT_COLORS[s.catIndex]}
              stroke={isHub ? "#f0c040" : "#1a1a1a"}
              strokeWidth={isHub ? 3 : 2}
              opacity={0.9}
            />
            {/* Inner highlight */}
            <circle
              cx={s.x - r * 0.2}
              cy={s.y - r * 0.2}
              r={r * 0.5}
              fill="rgba(255,255,255,0.12)"
            />
            {/* Hub glow */}
            {isHub && (
              <circle cx={s.x} cy={s.y} r={r + 4} fill="none" stroke="#f0c040" strokeWidth={1.5} opacity={0.4} filter="url(#glow)" />
            )}
            {/* Space number */}
            <text
              x={s.x}
              y={isHub ? s.y - 4 : s.y + 2}
              textAnchor="middle"
              fontSize={isHub ? "7" : "6"}
              fill="rgba(255,255,255,0.75)"
              fontFamily="'Press Start 2P'"
              style={{ pointerEvents: "none" }}
            >
              {s.id + 1}
            </text>
            {/* Category icon */}
            <text
              x={s.x}
              y={isHub ? s.y + 12 : s.y + 12}
              textAnchor="middle"
              fontSize={isHub ? "14" : "9"}
              style={{ pointerEvents: "none" }}
            >
              {CAT_ICONS[s.catIndex]}
            </text>
            {/* Hub name */}
            {isHub && (
              <text
                x={s.x}
                y={s.y + r + 14}
                textAnchor="middle"
                fontSize="5"
                fill="#f0c040"
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
        <DecoElement key={`dfg${i}`} item={item} />
      ))}

      {/* Light overlay */}
      <rect width="1800" height="1100" fill="url(#forestLight)" />
      <rect width="1800" height="1100" fill="url(#forestMist)" />

      {/* Light rays */}
      <g opacity={0.04}>
        <polygon points="200,0 280,0 400,1100 300,1100" fill="#ffffcc" />
        <polygon points="600,0 660,0 780,1100 700,1100" fill="#ffffcc" />
        <polygon points="1050,0 1100,0 1220,1100 1150,1100" fill="#ffffcc" />
        <polygon points="1450,0 1500,0 1620,1100 1550,1100" fill="#ffffcc" />
      </g>

      {/* Firefly particles */}
      {[
        { cx: 200, cy: 300, delay: 0 }, { cx: 900, cy: 200, delay: 1 },
        { cx: 500, cy: 600, delay: 2 }, { cx: 1300, cy: 400, delay: 0.5 },
        { cx: 350, cy: 800, delay: 1.5 }, { cx: 1100, cy: 700, delay: 2.5 },
        { cx: 1500, cy: 300, delay: 0.8 }, { cx: 700, cy: 950, delay: 1.8 },
      ].map((p, i) => (
        <circle
          key={`ff${i}`}
          cx={p.cx}
          cy={p.cy}
          r={2}
          fill="#f0e060"
          opacity={0.6}
          style={{ animation: `sparkle 3s ${p.delay}s infinite ease-in-out` }}
        />
      ))}

      {/* Players */}
      {players.map((p, i) => {
        const space = spaces[p.position];
        if (!space) return null;
        const sameSpacePlayers = players.filter(pl => pl.position === p.position);
        const myIdx = sameSpacePlayers.findIndex(pl => pl.id === p.id);
        const angle = (myIdx / sameSpacePlayers.length) * Math.PI * 2;
        const spread = sameSpacePlayers.length > 1 ? 16 : 0;
        const offsetX = Math.cos(angle) * spread;
        const offsetY = Math.sin(angle) * spread * 0.5;
        const px = space.x + offsetX;
        const py = space.y + offsetY - 20;
        const isCurr = i === currentPlayer;
        return (
          <g key={`pl${p.id}`} style={{ transition: "transform 0.6s ease" }}>
            {/* Shadow */}
            <ellipse cx={px} cy={space.y + offsetY + 4} rx={10} ry={4} fill="rgba(0,0,0,0.2)" />
            {/* Token body (diamond shape for isometric feel) */}
            <polygon
              points={`${px},${py - 14} ${px + 13},${py} ${px},${py + 10} ${px - 13},${py}`}
              fill={p.color}
              stroke={isCurr ? "#f0c040" : p.accent}
              strokeWidth={isCurr ? 3 : 2}
            />
            {/* Inner sheen */}
            <polygon
              points={`${px},${py - 10} ${px + 8},${py} ${px},${py + 6} ${px - 8},${py}`}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1.5}
            />
            {/* Emoji */}
            <text x={px} y={py + 3} textAnchor="middle" fontSize="13" style={{ pointerEvents: "none" }}>
              {p.emoji}
            </text>
            {/* Current player indicator */}
            {isCurr && (
              <g>
                <polygon
                  points={`${px - 4},${py - 22} ${px + 4},${py - 22} ${px},${py - 16}`}
                  fill="#f0c040"
                  style={{ animation: "bounce 1s infinite" }}
                />
                <rect x={px - 22} y={py - 36} width={44} height={12} fill="#f0c040" stroke="#1a1a1a" strokeWidth={1.5} rx={2} />
                <text x={px} y={py - 27} textAnchor="middle" fontSize="5" fill="#1a1a1a" fontFamily="'Press Start 2P'" style={{ pointerEvents: "none" }}>
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
        background: "#f0e8d0",
        border: "4px solid #1a1a1a",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "inset -3px -3px 0 rgba(0,0,0,0.2), inset 3px 3px 0 rgba(255,255,255,0.3), 4px 4px 0 #1a1a1a",
        transition: "transform 0.1s",
        animation: rolling ? "rollDice 0.3s infinite linear" : "none",
        borderRadius: 6,
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        {(dotPositions[displayVal] || []).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={9} fill="#1a1a2e" />
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
            background: has ? CAT_COLORS[i] : "rgba(100,100,120,0.3)",
            border: `2px solid ${has ? "#f0c040" : "#404060"}`,
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
        <span style={{ fontSize: "8px", color: "#8888a0", fontFamily: "var(--ui-font)", marginLeft: 4 }}>
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
        <span style={{ fontFamily: "var(--ui-font)", fontSize: "10px", color: danger ? "#ff4040" : warning ? "#f0c040" : "#80c080" }}>
          TIME
        </span>
        <span
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: "12px",
            color: danger ? "#ff4040" : warning ? "#f0c040" : "#80c080",
            animation: danger ? "pulse 0.5s infinite" : "none",
          }}
        >
          {timeLeft}s
        </span>
      </div>
      <div style={{ height: 8, background: "#1a1a2e", border: "2px solid #404060", borderRadius: 4 }}>
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
        background: "rgba(10,10,20,0.85)",
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
            borderBottom: "3px solid #1a1a1a",
          }}
        >
          <span style={{ fontSize: 22 }}>{CAT_ICONS[catIndex]}</span>
          <span style={{ fontFamily: "var(--ui-font)", fontSize: 14, color: "#fff", textShadow: "2px 2px 0 #1a1a1a" }}>
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
          <p style={{ fontFamily: "var(--ui-font)", fontSize: 14, lineHeight: 1.7, color: "#e0d8c8", margin: "0 0 16px" }}>
            {question.question}
          </p>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {question.options.map((opt, i) => {
              const isEliminated = eliminatedOptions.includes(opt);
              if (isEliminated && !answerRevealed) return null;
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === question.answer;
              let bg = "#303050";
              let border = "#505078";
              let textColor = "#e0d8c8";
              if (answerRevealed) {
                if (isCorrect) { bg = "#2a6a1e"; border = "#4aaa2e"; textColor = "#fff"; }
                else if (isSelected && !isCorrect) { bg = "#8a2020"; border = "#cc3030"; textColor = "#fff"; }
                else { bg = "#252540"; border = "#404060"; textColor = "#666"; }
              } else if (isSelected) {
                bg = CAT_COLORS[catIndex];
                border = "#f0c040";
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
                    boxShadow: isSelected && !answerRevealed ? `0 0 8px ${CAT_COLORS[catIndex]}88` : "2px 2px 0 #1a1a1a",
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
                background: "rgba(74,139,46,0.15)",
                borderLeft: `4px solid ${CAT_COLORS[catIndex]}`,
                borderRadius: 4,
                animation: "slideIn 0.3s ease",
              }}
            >
              <p style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#a0b890", lineHeight: 1.6, margin: 0 }}>
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
        background: "rgba(10,10,20,0.9)",
      }}
    >
      <div
        className="pixel-panel"
        style={{ maxWidth: 680, width: "95%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 8 }}
      >
        <div style={{ padding: "10px 16px", borderBottom: "3px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a3050" }}>
          <span style={{ fontFamily: "var(--ui-font)", fontSize: 14, color: "#f0c040" }}>QUESTION EDITOR</span>
          <button onClick={onClose} className="pixel-btn pixel-btn-red" style={{ fontSize: 8, padding: "4px 10px" }}>
            CLOSE
          </button>
        </div>
        <div style={{ display: "flex", padding: "8px 10px", gap: 4, flexWrap: "wrap", borderBottom: "2px solid #404060" }}>
          {CATEGORIES.map((c, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveCat(i);
                setEditingQ(null);
              }}
              style={{
                background: i === activeCat ? CAT_COLORS[i] : "#252540",
                border: `2px solid ${CAT_COLORS[i]}`,
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
                background: "#252540",
                border: "2px solid #404060",
                borderRadius: 3,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "var(--ui-font)", fontSize: 9, color: "#c0b8a8", flex: 1 }}>
                {q.question}
                <span style={{ fontSize: 7, color: "#8888a0", marginLeft: 6 }}>[{q.difficulty}, {q.ageMin || "?"}+]</span>
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
          <div style={{ marginTop: 12, padding: 12, background: "#1a1a30", border: "2px dashed #505078", borderRadius: 4 }}>
            <p style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#f0c040", margin: "0 0 8px" }}>
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
  background: "#252540",
  border: "2px solid #505078",
  color: "#e0d8c8",
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
        background: "rgba(10,10,20,0.9)",
      }}
    >
      <div className="pixel-panel" style={{ maxWidth: 500, width: "92%", padding: 20, animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#f0c040" }}>STATS</span>
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
            <div key={i} style={{ background: "#1a1a30", border: "2px solid #404060", padding: "10px 12px", borderRadius: 4 }}>
              <div style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#8888a0", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "'Press Start 2P'", fontSize: 16, color: "#f0c040" }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--ui-font)", fontSize: 9, color: "#8888a0", marginBottom: 8 }}>CATEGORY ACCURACY</div>
          {CATEGORIES.map((cat, i) => {
            const total = stats.categoryTotal?.[cat] || 0;
            const correct = stats.categoryCorrect?.[cat] || 0;
            const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{CAT_ICONS[i]}</span>
                <span style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#c0b8a8", width: 60 }}>{CAT_LABELS_SHORT[i]}</span>
                <div style={{ flex: 1, height: 10, background: "#1a1a30", border: "2px solid #404060", borderRadius: 3 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: CAT_COLORS[i], transition: "width 0.5s", borderRadius: 2 }} />
                </div>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#e0d8c8", width: 35, textAlign: "right" }}>
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
        background: "rgba(10,10,20,0.9)",
      }}
    >
      <div className="pixel-panel" style={{ maxWidth: 400, width: "90%", padding: 20, animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#f0c040" }}>SETTINGS</span>
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "8px 0", borderBottom: "1px solid #303050" }}>
      <span style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#c0b8a8" }}>{label}</span>
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
        background: active ? "#4a8b2e" : "#404060",
        border: "3px solid #1a1a1a",
        cursor: "pointer",
        position: "relative",
        boxShadow: "2px 2px 0 #1a1a1a",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          background: active ? "#80e050" : "#808090",
          position: "absolute",
          top: 1,
          left: active ? 26 : 2,
          transition: "left 0.15s",
          border: "2px solid #1a1a1a",
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
        background: "rgba(10,10,20,0.92)",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div className="pixel-panel" style={{ padding: "30px 40px", textAlign: "center", animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 16, color: "#ff4040", margin: "0 0 8px", textShadow: "3px 3px 0 #1a1a1a" }}>
          PENALTY!
        </h2>
        <p style={{ fontFamily: "var(--ui-font)", fontSize: 11, color: "#c0b8a8", marginBottom: 16 }}>
          {playerName} got it wrong! Rolling penalty...
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <PixelDice value={value} rolling={rolling} disabled size={80} />
        </div>
        {!rolling && value && (
          <p style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#ff6060", animation: "pulse 0.5s infinite", margin: 0 }}>
            Move back {value} space{value !== 1 ? "s" : ""}!
          </p>
        )}
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
    if (diceRolling || state.phase !== "playing") return;
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
        setTimeout(() => {
          dispatch({ type: "ROLL_DICE", value: finalValue });
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
      const finalPenalty = Math.floor(Math.random() * 6) + 1;
      let count = 0;
      const maxFrames = 14;
      const interval = setInterval(() => {
        setPenaltyDisplay(Math.floor(Math.random() * 6) + 1);
        count++;
        if (count >= maxFrames) {
          clearInterval(interval);
          setPenaltyDisplay(finalPenalty);
          setPenaltyRolling(false);
          playSound("wrong");
          setTimeout(() => {
            dispatch({ type: "PENALTY_MOVE", value: finalPenalty });
            setTimeout(() => {
              setShowPenalty(false);
              setPenaltyDisplay(null);
              dispatch({ type: "NEXT_TURN" });
            }, 1500);
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
          background: "linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #0a1428 100%)",
          fontFamily: "var(--ui-font)",
          padding: 16,
        }}
      >
        <div className="pixel-panel scanlines" style={{ padding: "28px 32px", maxWidth: 580, width: "100%", textAlign: "center", animation: "slideUp 0.5s ease", position: "relative", borderRadius: 8 }}>
          {/* Title */}
          <div style={{ fontSize: 32, marginBottom: 8, letterSpacing: 6 }}>
            {BIRD_EMOJIS.join("")}
          </div>
          <h1 style={{ fontFamily: "'Press Start 2P'", fontSize: 18, color: "#f0c040", margin: "8px 0", textShadow: "3px 3px 0 #1a1a1a" }}>
            WOODLAND TRIVIA
          </h1>
          <p style={{ color: "#8888a0", fontSize: 10, margin: "4px 0 20px", fontStyle: "italic" }}>
            A cozy corvid board game in the whispering woods
          </p>

          {/* Rules */}
          <div style={{ background: "#1a1a30", border: "2px solid #404060", padding: "10px 14px", marginBottom: 18, textAlign: "left", borderRadius: 4 }}>
            <p style={{ fontSize: 8, color: "#a0a0b8", lineHeight: 1.8, margin: 0 }}>
              Roll the dice and answer trivia as you wind through the woodland trail.
              Land on golden HUB spaces and answer correctly to earn feathers.
              Collect all 6 feathers to win! But beware — wrong answers mean
              a penalty roll that sends you backwards!
            </p>
          </div>

          {/* Player count */}
          <p style={{ color: "#c0b8a8", fontSize: 11, margin: "0 0 10px" }}>HOW MANY PLAYERS?</p>
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
                    background: p.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    margin: "0 auto 6px",
                    border: `3px solid ${p.accent}`,
                    boxShadow: "3px 3px 0 #1a1a1a",
                    borderRadius: 8,
                  }}
                >
                  {p.emoji}
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
                    background: "#252540",
                    border: "2px solid #505078",
                    color: "#e0d8c8",
                    fontFamily: "var(--ui-font)",
                    fontSize: 8,
                    outline: "none",
                    borderRadius: 3,
                  }}
                />
                {/* Age group selector — Child (8+) or Adult */}
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 7, color: "#8888a0", display: "block", marginBottom: 2 }}>AGE GROUP</span>
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
                          background: editAges[i] === opt.val ? "#4a8b2e" : "#252540",
                          border: `2px solid ${editAges[i] === opt.val ? "#80e050" : "#505078"}`,
                          color: editAges[i] === opt.val ? "#fff" : "#8888a0",
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
          <p style={{ color: "#c0b8a8", fontSize: 11, margin: "0 0 8px" }}>DIFFICULTY</p>
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
          background: "linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)",
          fontFamily: "var(--ui-font)",
        }}
      >
        <div className="pixel-panel scanlines" style={{ padding: 40, textAlign: "center", animation: "slideUp 0.5s ease", position: "relative", maxWidth: 480, width: "92%", borderRadius: 8 }}>
          <div style={{ fontSize: 56, animation: "float 2s ease infinite" }}>{w.emoji}</div>
          <h1 style={{ fontFamily: "'Press Start 2P'", fontSize: 16, color: "#f0c040", margin: "16px 0 8px", textShadow: "3px 3px 0 #1a1a1a" }}>
            {w.name} WINS!
          </h1>
          <p style={{ color: "#8888a0", margin: "0 0 20px", fontSize: 10 }}>All six feathers collected!</p>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <FeatherDisplay feathers={w.feathers} size={32} />
          </div>

          <div style={{ background: "#1a1a30", border: "2px solid #404060", padding: 12, marginBottom: 20, textAlign: "left", borderRadius: 4 }}>
            <p style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#8888a0", margin: "0 0 6px" }}>GAME SUMMARY</p>
            <p style={{ fontSize: 9, color: "#c0b8a8", margin: "2px 0" }}>
              Questions answered: {stats.questionsAnswered}
            </p>
            <p style={{ fontSize: 9, color: "#c0b8a8", margin: "2px 0" }}>
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

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a1a",
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
          background: "linear-gradient(180deg, #16162e 0%, #12122a 100%)",
          borderBottom: "3px solid #303050",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{"\u{1F426}\u{200D}\u{2B1B}"}</span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: "#f0c040", textShadow: "2px 2px 0 #1a1a1a" }}>
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
          <div style={{ width: "min(95vh, 98vw)", height: "min(78vh, 78vw)" }}>
            <GameBoard spaces={BOARD_SPACES} players={state.players} currentPlayer={state.currentPlayer} />
          </div>
        </div>

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
          padding: "8px 12px",
          background: "linear-gradient(180deg, #12122a 0%, #0e0e22 100%)",
          borderTop: "3px solid #303050",
          flexShrink: 0,
        }}
      >
        {/* Message */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 6,
            padding: "6px 10px",
            background: "#1a1a30",
            border: "2px solid #404060",
            borderRadius: 4,
          }}
        >
          <span
            style={{
              fontFamily: "var(--ui-font)",
              fontSize: 11,
              color: state.message.includes("Correct") || state.message.includes("earns")
                ? "#80e050"
                : state.message.includes("Wrong") || state.message.includes("Time") || state.message.includes("back")
                  ? "#ff6060"
                  : "#f0c040",
              textShadow: "1px 1px 0 #1a1a1a",
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
                  padding: "5px 10px",
                  background: isCurr ? "rgba(240,192,64,0.12)" : "transparent",
                  border: isCurr ? "2px solid #f0c040" : "2px solid transparent",
                  borderRadius: 6,
                  transition: "all 0.3s",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    background: p.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    border: `3px solid ${isCurr ? "#f0c040" : p.accent}`,
                    boxShadow: "2px 2px 0 #1a1a1a",
                    borderRadius: 6,
                  }}
                >
                  {p.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 9, color: isCurr ? "#f0c040" : "#c0b8a8", fontWeight: "bold" }}>
                    {p.name}
                    <span style={{ fontSize: 7, color: "#6868a0", marginLeft: 4 }}>({p.age >= 15 ? "Adult" : "Child"})</span>
                    {p.hints > 0 && (
                      <span style={{ fontSize: 7, color: "#8888a0", marginLeft: 4 }}>
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
                disabled={diceRolling || state.phase !== "playing"}
              />
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: "#8888a0" }}>
                {diceRolling ? "..." : "ROLL!"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Overlays ── */}
      {state.phase === "question" && state.currentQuestion && !showPenalty && (
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
