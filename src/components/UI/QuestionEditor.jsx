import { useState } from "react";
import { CATEGORIES, CAT_COLORS, CAT_ICONS, CAT_LABELS_SHORT } from "../../data/questions/index.js";

const inputStyle = {
  width: "100%",
  padding: "7px 10px",
  background: "#f0e8d8",
  border: "2px solid #b8a888",
  color: "#3a2a1a",
  fontFamily: "var(--ui-font)",
  fontSize: 10,
  boxSizing: "border-box",
  outline: "none",
  borderRadius: 3,
};

export default function QuestionEditor({ questions, onUpdate, onClose }) {
  const [activeCat, setActiveCat] = useState(0);
  const [editingQ, setEditingQ] = useState(null);
  const [form, setForm] = useState({ question: "", options: ["", "", "", ""], answer: "", flavour: "", difficulty: "medium", ageMin: 8 });
  const catName = CATEGORIES[activeCat];
  const qs = questions[catName] || [];

  const saveQ = () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    const n = { ...questions };
    if (editingQ !== null) n[catName][editingQ] = { ...form };
    else n[catName] = [...(n[catName] || []), { ...form }];
    onUpdate(n);
    setEditingQ(null);
    setForm({ question: "", options: ["", "", "", ""], answer: "", flavour: "", difficulty: "medium", ageMin: 8 });
  };
  const deleteQ = (idx) => {
    const n = { ...questions };
    n[catName] = n[catName].filter((_, i) => i !== idx);
    onUpdate(n);
  };

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
      <div
        className="pixel-panel"
        style={{ maxWidth: 680, width: "95%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 8 }}
      >
        <div style={{ padding: "10px 16px", borderBottom: "3px solid #b8a888", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#b8a888" }}>
          <span style={{ fontFamily: "var(--ui-font)", fontSize: 14, color: "#8a6828" }}>QUESTION EDITOR</span>
          <button onClick={onClose} className="pixel-btn pixel-btn-red" style={{ fontSize: 8, padding: "4px 10px" }}>
            CLOSE
          </button>
        </div>
        <div style={{ display: "flex", padding: "8px 10px", gap: 4, flexWrap: "wrap", borderBottom: "2px solid #b8a888" }}>
          {CATEGORIES.map((c, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveCat(i);
                setEditingQ(null);
              }}
              style={{
                background: i === activeCat ? CAT_COLORS[i] : "#252540",
                border: `2px solid ${CAT_COLORS[i]}88`,
                padding: "3px 8px",
                fontSize: 9,
                cursor: "pointer",
                fontFamily: "var(--ui-font)",
                color: "#fff",
                borderRadius: 3,
              }}
            >
              {CAT_ICONS[i]} {CAT_LABELS_SHORT[i]} ({(questions[c] || []).length})
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
          {qs.map((q, idx) => (
            <div
              key={idx}
              style={{
                padding: "6px 10px",
                marginBottom: 4,
                background: "#e0d4be",
                border: "2px solid #b8a888",
                borderRadius: 3,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "var(--ui-font)", fontSize: 9, color: "#5a4a35", flex: 1 }}>
                {q.question}
                <span style={{ fontSize: 7, color: "#8a7a68", marginLeft: 6 }}>[{q.difficulty}, {q.ageMin || "?"}+]</span>
              </span>
              <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                <button
                  onClick={() => {
                    setEditingQ(idx);
                    setForm({ ...qs[idx], ageMin: qs[idx].ageMin || 8 });
                  }}
                  className="pixel-btn pixel-btn-blue"
                  style={{ fontSize: 7, padding: "2px 8px" }}
                >
                  EDIT
                </button>
                <button onClick={() => deleteQ(idx)} className="pixel-btn pixel-btn-red" style={{ fontSize: 7, padding: "2px 8px" }}>
                  DEL
                </button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 12, background: "#e8dcc8", border: "2px dashed #b8a888", borderRadius: 4 }}>
            <p style={{ fontFamily: "var(--ui-font)", fontSize: 10, color: "#8a6828", margin: "0 0 8px" }}>
              {editingQ !== null ? "EDIT QUESTION" : "ADD NEW QUESTION"}
            </p>
            <input
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Question..."
              style={inputStyle}
            />
            {form.options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => {
                  const o = [...form.options];
                  o[i] = e.target.value;
                  setForm({ ...form, options: o });
                }}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                style={{ ...inputStyle, marginTop: 3 }}
              />
            ))}
            <select value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} style={{ ...inputStyle, marginTop: 4 }}>
              <option value="">Select correct answer...</option>
              {form.options.filter(Boolean).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <select value={form.difficulty || "medium"} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select value={form.ageMin || 8} onChange={(e) => setForm({ ...form, ageMin: parseInt(e.target.value) })} style={{ ...inputStyle, flex: 1 }}>
                <option value={8}>Child (8+)</option>
                <option value={15}>Adult (15+)</option>
              </select>
            </div>
            <input
              value={form.flavour}
              onChange={(e) => setForm({ ...form, flavour: e.target.value })}
              placeholder="Fun fact (optional)"
              style={{ ...inputStyle, marginTop: 3 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={saveQ} className="pixel-btn pixel-btn-green" style={{ fontSize: 9 }}>
                {editingQ !== null ? "UPDATE" : "ADD"}
              </button>
              {editingQ !== null && (
                <button
                  onClick={() => {
                    setEditingQ(null);
                    setForm({ question: "", options: ["", "", "", ""], answer: "", flavour: "", difficulty: "medium", ageMin: 8 });
                  }}
                  className="pixel-btn pixel-btn-dark"
                  style={{ fontSize: 9 }}
                >
                  CANCEL
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
