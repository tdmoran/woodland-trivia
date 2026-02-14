import { useState, useReducer, useCallback, useRef, useEffect } from "react";

// ── Data & State ──
import { CATEGORIES } from "./data/questions/index.js";
import { BOARD_SPACES } from "./data/board.js";
import {
  NUM_SPACES, DIFFICULTY_CONFIG, STORE_KEYS, DEFAULT_SETTINGS, DEFAULT_STATS,
  BIRD_NAMES, FELT_BIRDS,
} from "./data/constants.js";
import { loadStore, saveStore } from "./state/storage.js";
import { SFX } from "./state/sound.js";
import { gameReducer, makeInitialState } from "./state/reducer.js";

// ── Components ──
import GameBoard from "./components/Board/GameBoard.jsx";
import FeltBirdIcon from "./components/Players/FeltBirdIcon.jsx";
import FeatherDisplay from "./components/Players/FeatherDisplay.jsx";
import PixelDice from "./components/Gameplay/PixelDice.jsx";
import QuestionCard from "./components/Gameplay/QuestionCard.jsx";
import CategoryPicker from "./components/Gameplay/CategoryPicker.jsx";
import EventOverlay from "./components/Gameplay/EventOverlay.jsx";
import PenaltyOverlay from "./components/Gameplay/PenaltyOverlay.jsx";
import QuestionEditor from "./components/UI/QuestionEditor.jsx";
import StatsScreen from "./components/UI/StatsScreen.jsx";
import SettingsPanel from "./components/UI/SettingsPanel.jsx";
import ConfettiEffect from "./components/UI/ConfettiEffect.jsx";
import TitleBackground from "./components/UI/TitleBackground.jsx";
import TurnHistoryPanel from "./components/UI/TurnHistoryPanel.jsx";

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

    let newPos = oldPos;
    if (event === "tailwind") newPos = Math.min(oldPos + 3, NUM_SPACES - 1);
    else if (event === "shortcut") newPos = Math.min(oldPos + 5, NUM_SPACES - 1);
    else if (event === "bonus_roll") newPos = Math.min(oldPos + (eventData.bonusValue || 0), NUM_SPACES - 1);

    const steps = newPos - oldPos;
    if (steps > 0) {
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
    if (wasWrong && state.winner === null && !state.doubleOrNothing) {
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
      if (s.phase === "question" && !s.answerRevealed && s.currentQuestion) {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < (s.currentQuestion.options?.length || 0)) {
          handleAnswer(s.currentQuestion.options[idx]);
          return;
        }
      }
      if (e.key === " " && s.phase === "playing" && !diceRollingRef.current && !tokenAnimRef.current.active) {
        e.preventDefault();
        rollDice();
        return;
      }
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

      {state.phase === "hub_choice" && !tokenAnim.active && (
        <CategoryPicker
          feathers={currentP.feathers}
          onPick={(catIdx) => {
            playSound("click");
            dispatch({ type: "CHOOSE_HUB_CATEGORY", catIndex: catIdx });
          }}
        />
      )}

      {state.phase === "event" && state.currentEvent && !tokenAnim.active && (
        <EventOverlay
          event={state.currentEvent}
          players={state.players}
          currentPlayer={state.currentPlayer}
          onResolve={handleResolveEvent}
        />
      )}

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

      {showPenalty && (
        <PenaltyOverlay
          rolling={penaltyRolling}
          value={penaltyDisplay}
          playerName={currentP.name}
        />
      )}

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
