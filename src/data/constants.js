// ──── GAME CONSTANTS ────

export const NUM_SPACES = 100;
export const BOARD_W = 1800;
export const BOARD_H = 1100;

export const DIFFICULTY_CONFIG = {
  easy: { timer: 30, hintsPerPlayer: 3, label: "Easy" },
  medium: { timer: 20, hintsPerPlayer: 2, label: "Medium" },
  hard: { timer: 12, hintsPerPlayer: 0, label: "Hard" },
};

export const DEFAULT_SETTINGS = { sound: true, timer: true, timerSeconds: 20, difficulty: "medium" };
export const DEFAULT_STATS = {
  gamesPlayed: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  categoryCorrect: {},
  categoryTotal: {},
};

export const STORE_KEYS = { questions: "wt_questions", stats: "wt_stats", settings: "wt_settings" };

// ──── EVENT SPACE DEFINITIONS ────
export const EVENT_DEFS = {
  tailwind: { label: "Tailwind!", icon: "\u{1F4A8}", desc: "A forest breeze pushes you forward 3 spaces!" },
  shortcut: { label: "Forest Shortcut!", icon: "\u{1F31F}", desc: "You found a hidden path! Jump forward 5 spaces!" },
  hint_gift: { label: "Wise Owl's Gift!", icon: "\u{1F381}", desc: "The wise owl grants you an extra hint!" },
  swap: { label: "Magical Swap!", icon: "\u{1F500}", desc: "A woodland sprite swaps your position with another player!" },
  double_or_nothing: { label: "Double or Nothing!", icon: "\u{26A1}", desc: "A bold challenge! Correct = +6, Wrong = -6!" },
  bonus_roll: { label: "Bonus Roll!", icon: "\u{1F3B2}", desc: "Lucky you! Roll again for extra movement!" },
};
export const EVENT_CYCLE = ["tailwind", "hint_gift", "bonus_roll", "shortcut", "swap", "double_or_nothing"];

// ──── HUB DEFINITIONS ────
export const HUB_INDICES = [14, 30, 46, 62, 78, 94];
export const HUB_NAMES = ["The Old Oak", "Mossy Bridge", "Bramble Hollow", "Rookery Tower", "Magpie's Market", "Blackbird Pond"];

// ──── PLAYER CONFIG ────
export const BIRD_NAMES = ["Pheasant", "Hen", "Pigeon", "Duck"];
export const BIRD_COLORS = ["#8a5a30", "#c8baa8", "#7888a0", "#b8a070"];
export const BIRD_ACCENTS = ["#c05040", "#d4a850", "#5878a8", "#508848"];
export const BIRD_EMOJIS = ["\u{1F426}\u{200D}\u{2B1B}", "\u{1F414}", "\u{1F54A}\u{FE0F}", "\u{1F986}"];
export const BIRD_IMAGES = ["felt/bird-pheasant.png", "felt/bird-chicken.png", "felt/bird-pigeon.png", "felt/bird-duck.png"];

// ──── FELT BIRD SVG DATA ────
export const FELT_BIRDS = [
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

// ──── FELT IMAGE CONFIGURATION ────
export const FELT_IMAGES = {
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
