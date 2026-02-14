export default function TitleBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {[
        { src: "felt/pine-tree.png", x: "2%", y: "10%", w: 80, opacity: 0.2 },
        { src: "felt/pine-tree.png", x: "88%", y: "5%", w: 70, opacity: 0.18 },
        { src: "felt/birch-tree.png", x: "12%", y: "60%", w: 65, opacity: 0.15 },
        { src: "felt/birch-tree-2.png", x: "82%", y: "55%", w: 60, opacity: 0.17 },
        { src: "felt/fox.png", x: "6%", y: "75%", w: 55, opacity: 0.2 },
        { src: "felt/owl.png", x: "90%", y: "72%", w: 50, opacity: 0.18 },
        { src: "felt/mushroom-red.png", x: "20%", y: "85%", w: 40, opacity: 0.15 },
        { src: "felt/oak-leaf.png", x: "75%", y: "82%", w: 40, opacity: 0.14 },
        { src: "felt/rabbit.png", x: "92%", y: "30%", w: 50, opacity: 0.15 },
        { src: "felt/acorn.png", x: "4%", y: "40%", w: 35, opacity: 0.16 },
        { src: "felt/fern.png", x: "70%", y: "12%", w: 45, opacity: 0.13 },
        { src: "felt/snail.png", x: "25%", y: "15%", w: 40, opacity: 0.14 },
        { src: "felt/squirrel.png", x: "78%", y: "88%", w: 50, opacity: 0.16 },
        { src: "felt/hedgehog.png", x: "15%", y: "35%", w: 45, opacity: 0.13 },
      ].map((d, i) => (
        <img key={i} src={d.src} alt="" style={{
          position: "absolute", left: d.x, top: d.y, width: d.w,
          opacity: d.opacity, filter: "blur(1px)",
        }} />
      ))}
    </div>
  );
}
