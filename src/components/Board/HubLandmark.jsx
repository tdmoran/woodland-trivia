export default function HubLandmark({ hubIndex, x, y }) {
  const st = "rgba(90,74,53,0.45)";
  const landmarks = [
    () => ( // The Old Oak
      <g transform={`translate(${x},${y - 10})`} opacity={0.55}>
        <path d="M-6,25 L-10,55 L10,55 L6,25Z" fill="#6a4a28" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <path d="M-6,30 L-3,25 L3,25 L6,30" fill="#5a3a18" opacity={0.4} />
        <ellipse cx={0} cy={-8} rx={42} ry={32} fill="#3a6828" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <ellipse cx={-14} cy={-14} rx={18} ry={16} fill="#4a7838" opacity={0.6} />
        <ellipse cx={16} cy={-4} rx={20} ry={18} fill="#3a5828" opacity={0.5} />
        <ellipse cx={-1} cy={18} rx={4} ry={6} fill="#2a1a08" opacity={0.5} />
      </g>
    ),
    () => ( // Mossy Bridge
      <g transform={`translate(${x},${y})`} opacity={0.55}>
        <path d="M-38,12 C-28,-12 28,-12 38,12" fill="#8a8070" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <path d="M-38,12 C-25,-2 25,-2 38,12" fill="#9a9080" opacity={0.7} />
        <rect x={-38} y={12} width={8} height={16} rx={2} fill="#7a7060" stroke={st} strokeWidth={1} strokeDasharray="3,2" />
        <rect x={30} y={12} width={8} height={16} rx={2} fill="#7a7060" stroke={st} strokeWidth={1} strokeDasharray="3,2" />
        <circle cx={-8} cy={-4} r={5} fill="#5a8838" opacity={0.45} />
        <circle cx={12} cy={-2} r={4} fill="#4a7828" opacity={0.35} />
        <path d="M-28,18 C-12,24 12,24 28,18" fill="none" stroke="#7aaccc" strokeWidth={2.5} opacity={0.35} />
      </g>
    ),
    () => ( // Bramble Hollow
      <g transform={`translate(${x},${y})`} opacity={0.55}>
        <ellipse cx={0} cy={5} rx={38} ry={22} fill="#5a7838" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <ellipse cx={-12} cy={0} rx={16} ry={14} fill="#4a6828" opacity={0.7} />
        <ellipse cx={14} cy={2} rx={18} ry={15} fill="#3a5818" opacity={0.6} />
        {[-18,-14,20,8,-6].map((bx, i) => (
          <circle key={i} cx={bx} cy={[-4,2,-2,6,-8][i]} r={[3,2.5,3,2,2.5][i]} fill="#c04050" opacity={0.6 + i * 0.02} />
        ))}
      </g>
    ),
    () => ( // Rookery Tower
      <g transform={`translate(${x},${y})`} opacity={0.55}>
        <rect x={-12} y={-50} width={24} height={65} rx={3} fill="#8a8078" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <rect x={-16} y={-55} width={32} height={10} rx={2} fill="#7a7068" stroke={st} strokeWidth={1} strokeDasharray="3,2" />
        <polygon points="0,-68 -18,-55 18,-55" fill="#6a6058" stroke={st} strokeWidth={1} strokeDasharray="3,2" />
        <rect x={-5} y={-35} width={10} height={12} rx={4} fill="#4a3a28" opacity={0.6} />
        <rect x={-3} y={-18} width={6} height={8} rx={2} fill="#4a3a28" opacity={0.5} />
      </g>
    ),
    () => ( // Magpie's Market
      <g transform={`translate(${x},${y})`} opacity={0.55}>
        <polygon points="0,-40 -35,-10 35,-10" fill="#c8a050" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <polygon points="0,-40 -30,-12 30,-12" fill="#d8b060" opacity={0.5} />
        <rect x={-30} y={-10} width={60} height={28} rx={2} fill="#a08858" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <line x1={-30} y1={-10} x2={-30} y2={18} stroke={st} strokeWidth={2} />
        <line x1={30} y1={-10} x2={30} y2={18} stroke={st} strokeWidth={2} />
        {[-20,-4,12].map((bx, i) => (
          <rect key={i} x={bx} y={-4} width={12} height={8} rx={2} fill={["#e8c850","#d0a840","#c89838"][i]} opacity={0.5} />
        ))}
      </g>
    ),
    () => ( // Blackbird Pond
      <g transform={`translate(${x},${y + 5})`} opacity={0.55}>
        <ellipse cx={0} cy={8} rx={42} ry={18} fill="#6a9cbc" stroke={st} strokeWidth={1.5} strokeDasharray="4,3" />
        <ellipse cx={0} cy={6} rx={32} ry={12} fill="#7aaccc" opacity={0.6} />
        <ellipse cx={-5} cy={4} rx={14} ry={6} fill="#9acce8" opacity={0.3} />
        <line x1={-35} y1={-8} x2={-34} y2={10} stroke="#5a7838" strokeWidth={2} />
        <ellipse cx={-35} cy={-12} rx={4} ry={6} fill="#5a7838" opacity={0.7} />
        <line x1={-30} y1={-4} x2={-29} y2={12} stroke="#4a6828" strokeWidth={1.5} />
        <ellipse cx={-30} cy={-7} rx={3} ry={5} fill="#4a6828" opacity={0.6} />
        <line x1={32} y1={-6} x2={33} y2={10} stroke="#5a7838" strokeWidth={2} />
        <ellipse cx={32} cy={-10} rx={4} ry={5} fill="#5a7838" opacity={0.7} />
      </g>
    ),
  ];
  const render = landmarks[hubIndex];
  return render ? render() : null;
}
