// ─── WOODLAND TRIVIA — QUESTION BANK INDEX ───
// Merges child and adult question sets by category
// Child = ages 8+, Adult = ages 15+

import CHILD_QUESTIONS from "./child.js";
import ADULT_QUESTIONS from "./adult.js";

const CATEGORIES = [
  "Nature & Wildlife",
  "History & Geography",
  "Science & Discovery",
  "Arts & Culture",
  "Food & Foraging",
  "Riddles & Whimsy",
];

// Merge both sets into a single bank per category
const DEFAULT_QUESTIONS = {};
for (const cat of CATEGORIES) {
  DEFAULT_QUESTIONS[cat] = [
    ...(CHILD_QUESTIONS[cat] || []),
    ...(ADULT_QUESTIONS[cat] || []),
  ];
}

const CAT_COLORS = ["#4a8b2e", "#b87830", "#5070b0", "#9050a0", "#308888", "#b8a020"];
const CAT_ICONS = ["\u{1F33F}", "\u{1F5FA}\u{FE0F}", "\u{1F52C}", "\u{1F3A8}", "\u{1F344}", "\u{2728}"];
const CAT_LABELS_SHORT = ["Nature", "History", "Science", "Arts", "Food", "Riddles"];

export { DEFAULT_QUESTIONS, CATEGORIES, CAT_COLORS, CAT_ICONS, CAT_LABELS_SHORT, CHILD_QUESTIONS, ADULT_QUESTIONS };
