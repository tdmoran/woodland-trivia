import { CAT_COLORS, CAT_ICONS } from "../../data/questions/index.js";
import { NUM_SPACES, EVENT_DEFS, HUB_NAMES } from "../../data/constants.js";
import {
  TRAIL_PATH_D, DECO, STREAM_PATH_D, FALLING_LEAVES,
  TERRAIN_REGIONS, FIREFLIES,
} from "../../data/board.js";
import FeltDecoration from "./FeltDecoration.jsx";
import HubLandmark from "./HubLandmark.jsx";
import FeltBirdToken from "../Players/FeltBirdToken.jsx";

export default function GameBoard({ spaces, players, currentPlayer, animatingPlayerId }) {
  return (
    <svg viewBox="0 0 1800 1100" style={{ width: "100%", height: "100%" }}>
      <defs>
        <pattern id="woodGrain" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="transparent" />
          <line x1="0" y1="18" x2="200" y2="20" stroke="#bfae88" strokeWidth="0.8" opacity="0.25" />
          <line x1="0" y1="38" x2="200" y2="36" stroke="#bfae88" strokeWidth="0.4" opacity="0.15" />
          <line x1="0" y1="52" x2="200" y2="50" stroke="#bfae88" strokeWidth="0.5" opacity="0.22" />
          <line x1="0" y1="75" x2="200" y2="77" stroke="#bfae88" strokeWidth="0.3" opacity="0.12" />
          <line x1="0" y1="88" x2="200" y2="90" stroke="#bfae88" strokeWidth="0.7" opacity="0.18" />
          <line x1="0" y1="108" x2="200" y2="106" stroke="#bfae88" strokeWidth="0.35" opacity="0.14" />
          <line x1="0" y1="125" x2="200" y2="123" stroke="#bfae88" strokeWidth="0.4" opacity="0.24" />
          <line x1="0" y1="148" x2="200" y2="150" stroke="#bfae88" strokeWidth="0.45" opacity="0.13" />
          <line x1="0" y1="160" x2="200" y2="162" stroke="#bfae88" strokeWidth="0.6" opacity="0.19" />
          <line x1="0" y1="178" x2="200" y2="176" stroke="#bfae88" strokeWidth="0.3" opacity="0.16" />
          <line x1="0" y1="190" x2="200" y2="188" stroke="#bfae88" strokeWidth="0.5" opacity="0.15" />
        </pattern>
        <radialGradient id="woodVignette" cx="0.5" cy="0.5" r="0.65">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="70%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(60,45,25,0.22)" />
        </radialGradient>
        <filter id="softShadow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="hubGlow">
          <stop offset="0%" stopColor="#c89030" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c89030" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Wood background */}
      <rect width="1800" height="1100" fill="#c8b898" />
      <rect width="1800" height="1100" fill="url(#woodGrain)" />

      {/* Terrain color zones */}
      {TERRAIN_REGIONS.map((z, i) => (
        <ellipse key={`tz${i}`} cx={z.cx} cy={z.cy} rx={z.rx * 1.3} ry={z.ry * 1.3} fill={z.fill} />
      ))}

      {/* Felt stream ribbon */}
      <g opacity={0.55}>
        <path d={STREAM_PATH_D} stroke="#7aaccc" strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={STREAM_PATH_D} stroke="#8abcda" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={STREAM_PATH_D} stroke="#9acce8" strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="5,8" style={{ animation: "streamFlow 2.5s linear infinite" }} />
      </g>
      {/* Felt pond */}
      <g opacity={0.5}>
        <ellipse cx={155} cy={740} rx={50} ry={30} fill="#7aaccc" />
        <ellipse cx={155} cy={740} rx={38} ry={22} fill="#8abcda" />
        <ellipse cx={150} cy={736} rx={16} ry={9} fill="#9acce8" opacity={0.5} />
      </g>

      {/* Background decorations (behind path) */}
      {DECO.filter(d => d.y < 500).map((item, i) => (
        <FeltDecoration key={`dbg${i}`} item={item} />
      ))}

      {/* Trail ribbon */}
      <g>
        <path d={TRAIL_PATH_D} stroke="rgba(100,80,50,0.25)" strokeWidth={140} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#8a7050" strokeWidth={125} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#a08060" strokeWidth={110} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#b89870" strokeWidth={95} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={TRAIL_PATH_D} stroke="#c8a878" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="7,10" />
      </g>

      {/* Start / Finish markers */}
      <g>
        <text x={spaces[0].x} y={spaces[0].y + 48} textAnchor="middle" fontSize="12" fill="#5a8a38" fontFamily="'Press Start 2P'" opacity={0.9}>START</text>
        <text x={spaces[NUM_SPACES - 1].x} y={spaces[NUM_SPACES - 1].y + 48} textAnchor="middle" fontSize="12" fill="#c89030" fontFamily="'Press Start 2P'" opacity={0.9}>FINISH</text>
      </g>

      {/* Mid decorations */}
      {DECO.filter(d => d.y >= 500 && d.y < 800).map((item, i) => (
        <FeltDecoration key={`dmid${i}`} item={item} />
      ))}

      {/* Hub landmarks */}
      {spaces.filter(s => s.isHub).map(s => (
        <HubLandmark key={`hl${s.hubIndex}`} hubIndex={s.hubIndex} x={s.x} y={s.y} />
      ))}

      {/* Connectors between adjacent spaces */}
      {spaces.slice(0, -1).map((s, i) => {
        const next = spaces[i + 1];
        const dx = next.x - s.x;
        const dy = next.y - s.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <g key={`conn${i}`} transform={`translate(${s.x}, ${s.y}) rotate(${angle})`}>
            <rect x={0} y={-30} width={len} height={60} rx={20} fill="#b89870" opacity={0.55} />
            <rect x={0} y={-22} width={len} height={44} rx={15} fill="#c8a878" opacity={0.35} />
          </g>
        );
      })}

      {/* Board spaces */}
      {spaces.map((s) => {
        const isHub = s.isHub;
        const isBonus = s.isBonus;
        const hw = isHub ? 52 : isBonus ? 40 : 36;
        const hh = isHub ? 40 : isBonus ? 32 : 28;
        const rx = isHub ? 18 : 13;
        return (
          <g key={`sp${s.id}`} transform={`translate(${s.x}, ${s.y})`}>
            {isHub && (
              <ellipse cx={0} cy={0} rx={85} ry={70} fill="url(#hubGlow)" style={{ animation: "hubPulse 4s ease-in-out infinite" }} />
            )}
            <rect x={-hw - 1} y={-hh + 4} width={(hw + 1) * 2} height={hh * 2} rx={rx} fill="rgba(60,40,20,0.3)" />
            <rect x={-hw - 4} y={-hh - 4} width={(hw + 4) * 2} height={(hh + 4) * 2} rx={rx + 3} fill={isBonus ? "#fff8e0" : "#f0e8d8"} opacity={0.85} />
            <rect
              x={-hw}
              y={-hh}
              width={hw * 2}
              height={hh * 2}
              rx={rx}
              fill={isBonus ? "#e8c840" : CAT_COLORS[s.catIndex]}
              stroke={isHub ? "#c89030" : isBonus ? "#c8a020" : "#5a4a35"}
              strokeWidth={isHub ? 4 : isBonus ? 3.5 : 3}
              strokeDasharray={isHub ? "none" : isBonus ? "none" : "5,4"}
            />
            <rect x={-hw + 5} y={-hh + 4} width={(hw - 5) * 2} height={(hh - 4) * 2} rx={rx - 3} fill="rgba(255,255,255,0.12)" />
            {(isHub || isBonus) && (
              <rect x={-hw + 3} y={-hh + 3} width={(hw - 3) * 2} height={(hh - 3) * 2} rx={rx - 2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="3,3" />
            )}
            {isHub && (
              <rect x={-hw - 8} y={-hh - 8} width={(hw + 8) * 2} height={(hh + 8) * 2} rx={rx + 5} fill="none" stroke="#c89030" strokeWidth={3} strokeDasharray="6,5" opacity={0.6} />
            )}
            <text
              x={0}
              y={isHub ? -8 : -2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isHub ? "24" : "20"}
              fill="#fff"
              stroke="#3a2a1a"
              strokeWidth={3}
              paintOrder="stroke"
              fontFamily="'Press Start 2P'"
              fontWeight="bold"
              style={{ pointerEvents: "none" }}
            >
              {s.id + 1}
            </text>
            <text
              x={0}
              y={isHub ? 22 : 20}
              textAnchor="middle"
              fontSize={isHub ? "24" : isBonus ? "20" : "18"}
              style={{ pointerEvents: "none" }}
            >
              {s.isEvent && s.eventType && EVENT_DEFS[s.eventType] ? EVENT_DEFS[s.eventType].icon : CAT_ICONS[s.catIndex]}
            </text>
            {isHub && (
              <text
                x={0}
                y={hh + 22}
                textAnchor="middle"
                fontSize="9"
                fill="#8a6828"
                fontFamily="'Press Start 2P'"
                style={{ pointerEvents: "none" }}
              >
                {HUB_NAMES[s.hubIndex]}
              </text>
            )}
          </g>
        );
      })}

      {/* Foreground decorations */}
      {DECO.filter(d => d.y >= 800).map((item, i) => (
        <FeltDecoration key={`dfg${i}`} item={item} />
      ))}

      {/* Vignette overlay */}
      <rect width="1800" height="1100" fill="url(#woodVignette)" />

      {/* Fireflies */}
      {FIREFLIES.map((f, i) => (
        <circle
          key={`ff${i}`}
          cx={f.x}
          cy={f.y}
          r={f.size}
          fill="#e8d878"
          opacity={0}
          style={{ animation: `fireflyFloat ${f.duration}s ${f.delay}s infinite ease-in-out` }}
        />
      ))}

      {/* Falling leaves */}
      {FALLING_LEAVES.map((leaf, i) => (
        <g key={`leaf${i}`} transform={`translate(${leaf.x}, 0)`}>
          <g style={{ animation: `fallLeaf ${leaf.duration}s ${leaf.delay}s infinite linear` }}>
            <path
              d="M0,-3 C-2,-1 -2,3 0,5 C2,3 2,-1 0,-3Z"
              fill={leaf.color}
              opacity={0.7}
              transform={`scale(${leaf.size * 3.5})`}
            />
          </g>
        </g>
      ))}

      {/* Players */}
      {players.map((p, i) => {
        const space = spaces[p.position];
        if (!space) return null;
        const sameSpacePlayers = players.filter(pl => pl.position === p.position);
        const myIdx = sameSpacePlayers.findIndex(pl => pl.id === p.id);
        const angle = (myIdx / sameSpacePlayers.length) * Math.PI * 2;
        const spread = sameSpacePlayers.length > 1 ? 35 : 0;
        const offsetX = Math.cos(angle) * spread;
        const offsetY = Math.sin(angle) * spread * 0.5;
        const tx = space.x + offsetX;
        const ty = space.y + offsetY;
        const isCurr = i === currentPlayer;
        const isHopping = p.id === animatingPlayerId;
        return (
          <g key={`pl${p.id}`} transform={`translate(${tx}, ${ty})`} className={isHopping ? "token-hopping" : ""}>
            <ellipse cx={0} cy={10} rx={28} ry={9} fill="rgba(0,0,0,0.25)" />
            <g style={{ filter: isCurr ? "drop-shadow(0 0 6px #f0c040)" : "none" }}>
              <FeltBirdToken birdIndex={p.id} />
            </g>
            {isCurr && (
              <ellipse cx={0} cy={-45} rx={60} ry={60} fill="none" stroke="#f0c040" strokeWidth={2.5} strokeDasharray="6,4" style={{ animation: "pulse 1.5s infinite" }} />
            )}
            <rect x={-20} y={-120} width={40} height={22} rx={5} fill="#f0e8d8" stroke="#8a7a68" strokeWidth={1.5} />
            <text x={0} y={-104} textAnchor="middle" fontSize="14" fill="#3a2a1a" fontFamily="'Press Start 2P'" fontWeight="bold" style={{ pointerEvents: "none" }}>
              {p.position + 1}
            </text>
            {isCurr && (
              <g>
                <polygon
                  points="-6,-130 6,-130 0,-122"
                  fill="#f0c040"
                  style={{ animation: "bounce 1s infinite" }}
                />
                <rect x={-40} y={-150} width={80} height={20} fill="#c89030" stroke="#8a7a68" strokeWidth={1.5} rx={5} />
                <text x={0} y={-137} textAnchor="middle" fontSize="9" fill="#f5edd8" fontFamily="'Press Start 2P'" style={{ pointerEvents: "none" }}>
                  {p.name}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
