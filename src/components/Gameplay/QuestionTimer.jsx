import { useState, useEffect, useRef } from "react";
import { SFX } from "../../state/sound.js";

export default function QuestionTimer({ duration, onExpire, soundEnabled }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setTimeLeft(duration);
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          if (!expiredRef.current) {
            expiredRef.current = true;
            setTimeout(onExpire, 0);
          }
          return 0;
        }
        if (t <= 6 && soundEnabled) SFX.tick();
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [duration]);

  const pct = (timeLeft / duration) * 100;
  const danger = pct < 25;
  const warning = pct < 50;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--ui-font)", fontSize: "10px", color: danger ? "#c05040" : warning ? "#c89030" : "#5a8a38" }}>
          TIME
        </span>
        <span
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: "12px",
            color: danger ? "#c05040" : warning ? "#c89030" : "#5a8a38",
            animation: danger ? "pulse 0.5s infinite" : "none",
          }}
        >
          {timeLeft}s
        </span>
      </div>
      <div style={{ height: 8, background: "#d8c8a8", border: "2px solid #b8a888", borderRadius: 4 }}>
        <div
          className={`timer-bar ${danger ? "danger" : warning ? "warning" : ""}`}
          style={{ width: `${pct}%`, height: "100%", borderRadius: 2 }}
        />
      </div>
    </div>
  );
}
