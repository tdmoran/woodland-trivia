import { CAT_COLORS, CAT_LABELS_SHORT } from "../../data/questions/index.js";

export default function FeatherDisplay({ feathers, size = 24, showLabels = false }) {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {feathers.map((has, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            background: has ? CAT_COLORS[i] : "rgba(180,168,136,0.4)",
            border: `2px solid ${has ? "#c89030" : "#b8a888"}`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${size * 0.5}px`,
            transition: "all 0.3s",
            boxShadow: has ? `0 0 8px ${CAT_COLORS[i]}88` : "none",
          }}
          title={CAT_LABELS_SHORT[i]}
          className={has ? "feather-collect" : ""}
        >
          {has ? "\u{1FAB6}" : ""}
        </div>
      ))}
      {showLabels && (
        <span style={{ fontSize: "8px", color: "#8a7a68", fontFamily: "var(--ui-font)", marginLeft: 4 }}>
          {feathers.filter(Boolean).length}/6
        </span>
      )}
    </div>
  );
}
