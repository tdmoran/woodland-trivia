function SettingRow({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "8px 0", borderBottom: "1px solid #c8b898" }}>
      <span style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#5a4a35" }}>{label}</span>
      {children}
    </div>
  );
}

function ToggleBtn({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 48,
        height: 24,
        background: active ? "#5a8a38" : "#c8b898",
        border: "3px solid #8a7a68",
        cursor: "pointer",
        position: "relative",
        boxShadow: "2px 2px 0 rgba(80,60,40,0.25)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          background: active ? "#7ab850" : "#a09880",
          position: "absolute",
          top: 1,
          left: active ? 26 : 2,
          transition: "left 0.15s",
          border: "2px solid #8a7a68",
          borderRadius: 8,
        }}
      />
    </button>
  );
}

export default function SettingsPanel({ settings, onUpdate, onClose }) {
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
      <div className="pixel-panel" style={{ maxWidth: 400, width: "90%", padding: 20, animation: "slideUp 0.3s ease", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: "#8a6828" }}>SETTINGS</span>
          <button onClick={onClose} className="pixel-btn pixel-btn-red" style={{ fontSize: 8, padding: "4px 10px" }}>
            CLOSE
          </button>
        </div>
        <SettingRow label="Sound Effects">
          <ToggleBtn active={settings.sound} onClick={() => onUpdate({ ...settings, sound: !settings.sound })} />
        </SettingRow>
        <SettingRow label="Question Timer">
          <ToggleBtn active={settings.timer} onClick={() => onUpdate({ ...settings, timer: !settings.timer })} />
        </SettingRow>
        {settings.timer && (
          <SettingRow label="Timer (seconds)">
            <div style={{ display: "flex", gap: 4 }}>
              {[10, 15, 20, 30].map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdate({ ...settings, timerSeconds: s })}
                  className={`pixel-btn ${settings.timerSeconds === s ? "pixel-btn-green" : "pixel-btn-dark"}`}
                  style={{ fontSize: 8, padding: "3px 8px" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </SettingRow>
        )}
        <SettingRow label="Difficulty">
          <div style={{ display: "flex", gap: 4 }}>
            {["easy", "medium", "hard"].map((d) => (
              <button
                key={d}
                onClick={() => onUpdate({ ...settings, difficulty: d })}
                className={`pixel-btn ${settings.difficulty === d ? "pixel-btn-green" : "pixel-btn-dark"}`}
                style={{ fontSize: 8, padding: "3px 8px", textTransform: "uppercase" }}
              >
                {d}
              </button>
            ))}
          </div>
        </SettingRow>
      </div>
    </div>
  );
}
