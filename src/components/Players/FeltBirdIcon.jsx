import { FELT_BIRDS } from "../../data/constants.js";
import FeltBirdSvgBody from "./FeltBirdSvgBody.jsx";

export default function FeltBirdIcon({ birdIndex, size = 40 }) {
  const b = FELT_BIRDS[birdIndex] || FELT_BIRDS[0];
  return (
    <svg width={size} height={size} viewBox="-40 -28 80 55" style={{ display: "block" }}>
      <FeltBirdSvgBody b={b} />
    </svg>
  );
}
