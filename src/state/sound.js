// ──── SOUND SYSTEM (Web Audio API chiptune) ────

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new AudioCtx();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

function playTone(freq, dur, type = "square", vol = 0.12) {
  try {
    const ctx = getAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {}
}

export const SFX = {
  click: () => playTone(660, 0.06),
  roll: () => {
    for (let i = 0; i < 6; i++) setTimeout(() => playTone(180 + i * 80, 0.04, "square", 0.08), i * 40);
  },
  land: () => playTone(440, 0.1, "triangle", 0.15),
  correct: () => {
    playTone(523, 0.1, "square", 0.1);
    setTimeout(() => playTone(659, 0.1, "square", 0.1), 100);
    setTimeout(() => playTone(784, 0.15, "square", 0.12), 200);
  },
  wrong: () => {
    playTone(300, 0.15, "sawtooth", 0.1);
    setTimeout(() => playTone(200, 0.2, "sawtooth", 0.1), 120);
  },
  feather: () => {
    [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => playTone(n, 0.12, "square", 0.1), i * 80));
  },
  win: () => {
    [523, 659, 784, 1047, 784, 1047].forEach((n, i) => setTimeout(() => playTone(n, 0.18, "square", 0.12), i * 120));
  },
  tick: () => playTone(1200, 0.02, "sine", 0.06),
  hint: () => {
    playTone(880, 0.08, "triangle", 0.1);
    setTimeout(() => playTone(1100, 0.1, "triangle", 0.1), 80);
  },
  penalty: () => {
    playTone(200, 0.15, "square", 0.12);
    setTimeout(() => playTone(150, 0.2, "square", 0.12), 100);
    setTimeout(() => playTone(100, 0.3, "sawtooth", 0.1), 200);
  },
  hop: () => {
    const f = 280 + Math.random() * 180;
    playTone(f, 0.04, "square", 0.1);
    setTimeout(() => playTone(f * 2, 0.06, "sine", 0.1), 20);
    setTimeout(() => playTone(f * 1.4, 0.05, "triangle", 0.06), 50);
  },
  hopBack: () => {
    const f = 400 + Math.random() * 100;
    playTone(f, 0.06, "sawtooth", 0.08);
    setTimeout(() => playTone(f * 0.6, 0.08, "square", 0.07), 30);
  },
  bonus: () => {
    [660, 880, 1100, 1320].forEach((n, i) => setTimeout(() => playTone(n, 0.08, "square", 0.1), i * 60));
  },
};
