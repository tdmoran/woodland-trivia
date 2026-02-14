// ──── GAME REDUCER ────

import { CATEGORIES, CAT_LABELS_SHORT } from "../data/questions/index.js";
import { BOARD_SPACES } from "../data/board.js";
import {
  NUM_SPACES, DIFFICULTY_CONFIG, STORE_KEYS,
  BIRD_NAMES, BIRD_COLORS, BIRD_ACCENTS, BIRD_EMOJIS, BIRD_IMAGES,
  HUB_NAMES, EVENT_DEFS,
} from "../data/constants.js";
import { loadStore, saveStore } from "./storage.js";
import { DEFAULT_QUESTIONS } from "../data/questions/index.js";

export function makeInitialState(playerCount, names, ages, difficulty) {
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

function selectQuestion(state, catIndex, diceDifficulty) {
  const p = state.players[state.currentPlayer];
  const playerAge = p.age || 99;
  let qs = state.questions[CATEGORIES[catIndex]] || [];
  const diffFiltered = qs.filter(q => q.difficulty === diceDifficulty);
  if (diffFiltered.length > 0) qs = diffFiltered;
  qs = qs.filter(q => (q.ageMin || 0) <= playerAge);
  let available = qs.filter(q => !state.askedQuestions.includes(q.question));
  if (available.length === 0) available = qs;
  if (available.length === 0) available = state.questions[CATEGORIES[catIndex]] || [];
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function gameReducer(state, action) {
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
          turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: `Rolled ${rollMsg}${catchupMsg} → ${HUB_NAMES[space.hubIndex]}` }],
        };
      }

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
          turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: `Rolled ${rollMsg}${catchupMsg} → ${EVENT_DEFS[space.eventType].label}` }],
        };
      }

      const question = selectQuestion(state, catIndex, diceDifficulty);
      if (!question) {
        return {
          ...state,
          players: newPlayers,
          diceValue: val,
          preRollPosition: preRollPos,
          currentPlayer: (state.currentPlayer + 1) % state.playerCount,
          message: `${p.name} rolled ${val}. No questions! Next turn.`,
        };
      }
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
        turnHistory: [...state.turnHistory, { player: p.name, emoji: p.emoji, text: `Rolled ${rollMsg}${catchupMsg} → ${CAT_LABELS_SHORT[catIndex]} question` }],
      };
    }
    case "CHOOSE_HUB_CATEGORY": {
      const catIndex = action.catIndex;
      const diceDifficulty = state.diceDifficulty || "medium";
      const question = selectQuestion(state, catIndex, diceDifficulty);
      if (!question) {
        return { ...state, phase: "playing", message: `No ${CAT_LABELS_SHORT[catIndex]} questions available!` };
      }
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
        message: `${state.players[state.currentPlayer].name} chose ${CATEGORIES[catIndex]}!`,
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

      const catIndex = landSpace.catIndex;
      const diceDifficulty = event === "double_or_nothing" ? "hard" : (state.diceDifficulty || "medium");
      const question = selectQuestion({ ...state, players: newPlayers }, catIndex, diceDifficulty);
      if (!question) {
        return {
          ...state, players: newPlayers, phase: "playing", currentEvent: null,
          currentPlayer: (state.currentPlayer + 1) % state.playerCount,
          message: historyText + " No questions available!",
        };
      }
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

      const oldStreak = newPlayers[state.currentPlayer].correctStreak || 0;
      const newStreak = correct ? oldStreak + 1 : 0;
      newPlayers[state.currentPlayer] = {
        ...newPlayers[state.currentPlayer],
        wrongStreak: correct ? 0 : (newPlayers[state.currentPlayer].wrongStreak || 0) + 1,
        correctStreak: newStreak,
      };

      let streakReward = null;
      if (newStreak === 3) {
        newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], hints: newPlayers[state.currentPlayer].hints + 1 };
        streakReward = "3 in a row! +1 Hint!";
      } else if (newStreak === 5) {
        const sPos = Math.min(newPlayers[state.currentPlayer].position + 3, NUM_SPACES - 1);
        newPlayers[state.currentPlayer] = { ...newPlayers[state.currentPlayer], position: sPos };
        streakReward = "5 in a row! +3 Spaces!";
      }

      const gs = { ...state.gameStats };
      const ps = { ...(gs.byPlayer[state.currentPlayer] || { questions: 0, correct: 0, bestStreak: 0 }) };
      ps.questions++;
      if (correct) ps.correct++;
      ps.bestStreak = Math.max(ps.bestStreak, newStreak);
      gs.byPlayer = { ...gs.byPlayer, [state.currentPlayer]: ps };

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
