export default function CardDepthChrome() {
  return (
    <>
      <div
        className="absolute inset-y-2 -right-[0.95rem] w-[1.35rem] border-y border-r bg-[linear-gradient(90deg,#010201,#06110e_42%,#0a1613_58%,#010201)] [clip-path:polygon(0_0,72%_0,100%_0.7rem,100%_calc(100%-0.7rem),72%_100%,0_100%)] [transform:rotateY(90deg)_translateZ(0.64rem)] [transform-origin:left_center]"
        style={{
          borderColor: "var(--card-accent)",
          boxShadow: "inset 0 0 14px var(--card-accent-soft)",
        }}
      />
      <div
        className="absolute inset-x-3 -bottom-[0.95rem] h-[1.35rem] border-x border-b bg-[linear-gradient(180deg,#010201,#06110e_42%,#0a1613_58%,#010201)] [clip-path:polygon(0.7rem_0,calc(100%-0.7rem)_0,100%_48%,calc(100%-0.7rem)_100%,0.7rem_100%,0_48%)] [transform:rotateX(-90deg)_translateZ(0.64rem)] [transform-origin:top_center]"
        style={{
          borderColor: "var(--card-accent)",
          boxShadow: "inset 0 0 14px var(--card-accent-soft)",
        }}
      />
      <div
        className="absolute -inset-[0.28rem] border border-transparent transition-[border-color,box-shadow] duration-150 [clip-path:polygon(0.75rem_0,calc(100%-0.75rem)_0,100%_0.75rem,100%_calc(100%-0.75rem),calc(100%-0.75rem)_100%,0.75rem_100%,0_calc(100%-0.75rem),0_0.75rem)] group-hover:border-[var(--card-accent)] group-focus-visible:border-[var(--card-accent)]"
        style={{ boxShadow: "0 0 18px transparent" }}
      />
    </>
  );
}
