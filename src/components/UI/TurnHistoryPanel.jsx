export default function TurnHistoryPanel({ history, onClose }) {
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
