export default function ConfettiEffect() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 300, overflow: "hidden" }}>
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${(i * 19.3) % 100}%`,
          top: "-10px",
          width: 6 + (i % 4) * 2,
          height: 4 + (i % 3) * 2,
          background: ["#c89030", "#c05040", "#5a8a38", "#4878a0", "#8a5898", "#d07030", "#3a8878"][i % 7],
          animation: `confettiDrop ${1.8 + (i % 5) * 0.4}s ${(i * 0.07) % 2.5}s infinite ease-in`,
          borderRadius: i % 2 === 0 ? "50%" : "2px",
        }} />
      ))}
    </div>
  );
}
