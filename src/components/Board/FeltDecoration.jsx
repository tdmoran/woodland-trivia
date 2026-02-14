import { FELT_IMAGES } from "../../data/constants.js";

export default function FeltDecoration({ item }) {
  const cfg = FELT_IMAGES[item.type];
  if (!cfg) return null;
  const s = item.scale || 1;
  const w = cfg.w * s;
  const h = cfg.h * s;
  const isTree = item.type.includes("pine") || item.type.includes("birch");
  const isAnimal = ["fox","rabbit","owl","hedgehog","squirrel","bear","snail"].includes(item.type);
  const shouldAnimate = isTree ? (Math.round(item.x + item.y) % 4 === 0) : true;
  const animStyle = (isTree && shouldAnimate) ? {
    transformOrigin: `${item.x}px ${item.y}px`,
    animation: `treeSway ${5 + s * 3}s ease-in-out ${((item.x * 7 + item.y * 3) % 400) / 100}s infinite`,
  } : isAnimal ? {
    transformOrigin: `${item.x}px ${item.y}px`,
    animation: `animalBreathe ${3 + ((item.x * 13) % 200) / 100}s ease-in-out ${((item.y * 11) % 300) / 100}s infinite`,
  } : {};
  return (
    <g style={animStyle}>
      <image
        href={cfg.src}
        x={item.x - w / 2}
        y={item.y - h}
        width={w}
        height={h}
        opacity={0.92}
      />
    </g>
  );
}
