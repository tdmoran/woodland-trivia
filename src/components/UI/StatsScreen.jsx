import { CATEGORIES, CAT_COLORS, CAT_ICONS, CAT_LABELS_SHORT } from "../../data/questions/index.js";

export default function StatsScreen({ stats, onClose }) {
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
