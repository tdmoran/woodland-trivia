import { FELT_BIRDS } from "../../data/constants.js";
import FeltBirdSvgBody from "./FeltBirdSvgBody.jsx";

export default function FeltBirdToken({ birdIndex }) {
  const b = FELT_BIRDS[birdIndex] || FELT_BIRDS[0];
  return (
    <g transform="translate(0,-45) scale(1.5)">
      <FeltBirdSvgBody b={b} />
    </g>
  );
}
