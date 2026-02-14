import { useState, useEffect } from "react";
import { EVENT_DEFS } from "../../data/constants.js";
import PixelDice from "./PixelDice.jsx";

export default function EventOverlay({ event, players, currentPlayer, onResolve }) {
  const [bonusDice, setBonusDice] = useState(null);
  const def = EVENT_DEFS[event];
  useEffect(() => {
    if (event === "bonus_roll") {
      setBonusDice(Math.floor(Math.random() * 6) + 1);
    }
  }, [event]);
  if (!def) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(120,100,70,0.85)", animation: "fadeIn 0.2s ease" }}>
      <div className="pixel-panel" style={{ padding: "30px 40px", textAlign: "center", maxWidth: 420, width: "90%", animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: "bounce 1s infinite" }}>{def.icon}</div>
        <h2 style={{ fontFamily: "'Press Start 2P'", fontSize: 13, color: "#8a6828", margin: "0 0 8px", textShadow: "1px 1px 0 rgba(80,60,40,0.2)" }}>
          {def.label}
        </h2>
        <p style={{ fontFamily: "var(--ui-font)", fontSize: 11, color: "#5a4a35", marginBottom: 16, lineHeight: 1.6 }}>
          {def.desc}
        </p>
        {event === "bonus_roll" && bonusDice && (
          <div style={{ marginBottom: 16 }}>
            <PixelDice value={bonusDice} disabled size={64} />
            <p style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: "#5a8a38", marginTop: 8 }}>
              +{bonusDice} spaces!
            </p>
          </div>
        )}
        {event === "swap" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 10, color: "#6a5a48", fontFamily: "var(--ui-font)" }}>Choose a player to swap with:</p>
            {players.map((p, i) => i !== currentPlayer && (
              <button
                key={i}
                onClick={() => onResolve({ targetPlayer: i })}
                className="pixel-btn pixel-btn-gold"
                style={{ fontSize: 10, padding: "8px 16px" }}
              >
                {p.emoji} {p.name} (Space {p.position + 1})
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => onResolve(event === "bonus_roll" ? { bonusValue: bonusDice } : {})}
            className="pixel-btn pixel-btn-green"
            style={{ fontSize: 12, padding: "10px 28px" }}
          >
            {event === "double_or_nothing" ? "ACCEPT CHALLENGE" : "OK"}
          </button>
        )}
      </div>
    </div>
  );
}
