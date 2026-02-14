import { CATEGORIES, CAT_COLORS, CAT_ICONS } from "../../data/questions/index.js";
import QuestionTimer from "./QuestionTimer.jsx";

export default function QuestionCard({ question, catIndex, selectedAnswer, answerRevealed, eliminatedOptions, onAnswer, timerDuration, timerEnabled, soundEnabled, onTimerExpire, hints, onHint, doubleOrNothing }) {
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
        {doubleOrNothing && (
          <div style={{ background: "linear-gradient(135deg, #c05040, #e07030)", padding: "6px 18px", textAlign: "center" }}>
            <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: "#fff" }}>
              {"\u{26A1}"} DOUBLE OR NOTHING {"\u{26A1}"}
            </span>
          </div>
        )}
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
          {timerEnabled && !answerRevealed && (
            <QuestionTimer duration={timerDuration} onExpire={onTimerExpire} soundEnabled={soundEnabled} />
          )}

          <p style={{ fontFamily: "var(--ui-font)", fontSize: 14, lineHeight: 1.7, color: "#3a2a1a", margin: "0 0 16px" }}>
            {question.question}
          </p>

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
          {!answerRevealed && (
            <p style={{ fontFamily: "var(--ui-font)", fontSize: 8, color: "#b8a888", textAlign: "center", margin: "10px 0 0" }}>
              Press 1-{question.options.length} to answer
            </p>
          )}

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
