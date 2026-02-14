export default function FeltBirdSvgBody({ b }) {
  const st = "rgba(90,74,53,0.7)";
  return (
    <>
      {/* Tail feathers */}
      <path d="M-22,2 C-32,-8 -38,-18 -34,-25 C-28,-15 -24,-8 -20,0Z" fill={b.tail1} stroke={st} strokeWidth={1} strokeDasharray="3,2" />
      <path d="M-20,5 C-35,0 -40,-8 -36,-18 C-30,-6 -25,0 -18,4Z" fill={b.tail2} stroke={st} strokeWidth={1} strokeDasharray="3,2" opacity={0.9} />
      <path d="M-18,6 C-30,6 -36,2 -34,-5 C-28,2 -22,5 -16,6Z" fill={b.tail3} stroke={st} strokeWidth={0.8} strokeDasharray="2,2" opacity={0.8} />
      {/* Body */}
      <ellipse cx={0} cy={0} rx={22} ry={15} fill={b.body} stroke={st} strokeWidth={1.5} strokeDasharray="3,2" />
      <ellipse cx={2} cy={4} rx={14} ry={8} fill={b.belly} opacity={0.5} />
      {/* Wing */}
      <path d="M-4,-4 C0,-12 10,-12 14,-8 C10,-2 4,2 -2,2Z" fill={b.wing} stroke={st} strokeWidth={1} strokeDasharray="2,2" />
      <path d="M0,-4 C3,-9 8,-9 11,-7 C8,-3 4,0 1,0Z" fill={b.wingInner} opacity={0.5} />
      {/* Head */}
      <circle cx={19} cy={-9} r={10} fill={b.head} stroke={st} strokeWidth={1.2} strokeDasharray="3,2" />
      {b.wattle && <path d="M22,-4 C25,-2 27,-5 26,-8 C24,-5 23,-4 22,-4Z" fill={b.wattle} opacity={0.7} />}
      {b.comb && <path d="M15,-18 C16,-23 18,-22 19,-18 C20,-23 22,-22 23,-18" fill={b.comb} stroke={st} strokeWidth={0.8} strokeDasharray="2,2" />}
      {b.neckRing && <ellipse cx={14} cy={-1} rx={5} ry={2} fill={b.neckRing} opacity={0.7} />}
      {b.neckSheen && <path d="M12,-2 C15,-5 18,-6 20,-3 C17,-1 14,0 12,-2Z" fill={b.neckSheen} opacity={0.4} />}
      {/* Eye */}
      <circle cx={23} cy={-11} r={2.2} fill="#1a1a1a" />
      <circle cx={23.8} cy={-11.8} r={0.7} fill="white" />
      {/* Beak */}
      {b.flatBill ? (
        <path d="M28,-8 L37,-6.5 L36,-3.5 L28,-5Z" fill={b.beak} stroke={st} strokeWidth={0.8} />
      ) : (
        <polygon points="28,-9 35,-7 28,-5" fill={b.beak} stroke={st} strokeWidth={0.8} />
      )}
      {/* Feet */}
      <g stroke={st} strokeWidth={1.2} strokeLinecap="round" fill="none">
        <line x1={-4} y1={14} x2={-6} y2={22} /><line x1={-9} y1={22} x2={-3} y2={22} />
        <line x1={6} y1={14} x2={8} y2={22} /><line x1={5} y1={22} x2={11} y2={22} />
      </g>
    </>
  );
}
