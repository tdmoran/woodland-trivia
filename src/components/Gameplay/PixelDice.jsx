export default function PixelDice({ value, rolling, onRoll, disabled, size = 72 }) {
  const displayVal = rolling ? Math.floor(Math.random() * 6) + 1 : value || 1;
  const dotPositions = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
  };
  return (
    <button
      onClick={disabled ? undefined : onRoll}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        padding: 0,
        background: "#f5edd8",
        border: "4px solid #8a7a68",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "inset -2px -2px 0 rgba(0,0,0,0.1), inset 2px 2px 0 rgba(255,255,255,0.3), 3px 3px 0 rgba(80,60,40,0.25)",
        transition: "transform 0.1s",
        animation: rolling ? "rollDice 0.3s infinite linear" : "none",
        borderRadius: 6,
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        {(dotPositions[displayVal] || []).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={9} fill="#5a4a35" />
        ))}
      </svg>
    </button>
  );
}
