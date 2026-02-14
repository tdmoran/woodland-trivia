import { CATEGORIES, CAT_COLORS, CAT_ICONS, CAT_LABELS_SHORT } from "../../data/questions/index.js";

export default function CategoryPicker({ feathers, onPick }) {
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
                    {has && <div style={{ fontFamily: "var(--ui-font)", fontSize: 7, color: "#8a7a68" }}>EARNED ✓</div>}
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
