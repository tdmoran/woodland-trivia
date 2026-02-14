import PixelDice from "./PixelDice.jsx";

export default function PenaltyOverlay({ rolling, value, playerName }) {
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
