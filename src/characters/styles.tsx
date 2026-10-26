/**
 * Character motion, as one stylesheet React 19 hoists into <head> once
 * (deduped by `href`), however many characters are on screen. Everything
 * animates transform/opacity only. Loops are keyframes (they run off the main
 * thread); expression changes are transitions (interruptible, they retarget).
 *
 * Inside SVG, `px` in a transform is a user unit of the 120×120 viewBox.
 */
const OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
const RISE = "cubic-bezier(0.2, 0.7, 0.4, 1)";
const FALL = "cubic-bezier(0.55, 0, 0.85, 0.45)";

const CSS = `
.ch-t{transition:transform 200ms ${OUT},opacity 160ms ease}
.ch-pose{transition:transform 200ms ${OUT}}
.ch-pose-slow{transition:transform 800ms ${IN_OUT}}

@keyframes ch-bob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-1.6px) scale(0.99,1.016)}}
@keyframes ch-bob-s{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.94);opacity:.85}}
.ch-bob{animation:ch-bob 2.8s ease-in-out infinite}
.ch-bob-s{animation:ch-bob-s 2.8s ease-in-out infinite}
.ch-bob-fast{animation:ch-bob 1.9s ease-in-out infinite}
.ch-bob-fast-s{animation:ch-bob-s 1.9s ease-in-out infinite}

@keyframes ch-jelly{0%,100%{transform:scale(1,1)}25%{transform:scale(1.025,0.975)}50%{transform:translateY(-1px) scale(0.985,1.02)}75%{transform:scale(1.01,0.99)}}
.ch-jelly{animation:ch-jelly 2.6s ease-in-out infinite}
.ch-jelly-s{animation:ch-bob-s 1.3s ease-in-out infinite}

@keyframes ch-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4.5px)}}
@keyframes ch-float-s{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.8);opacity:.6}}
.ch-float{animation:ch-float 2.1s ease-in-out infinite}
.ch-float-s{animation:ch-float-s 2.1s ease-in-out infinite}

@keyframes ch-hop{
  0%{transform:translateY(0) scale(1,1);animation-timing-function:${OUT}}
  10%{transform:translateY(0) scale(1.1,0.88);animation-timing-function:${RISE}}
  30%{transform:translateY(-14px) scale(0.93,1.08);animation-timing-function:${RISE}}
  42%{transform:translateY(-18px) scale(1,1);animation-timing-function:${FALL}}
  57%{transform:translateY(0) scale(0.95,1.06);animation-timing-function:${OUT}}
  64%{transform:translateY(0) scale(1.09,0.9);animation-timing-function:ease-in-out}
  76%{transform:translateY(0) scale(0.98,1.02);animation-timing-function:ease-in-out}
  86%,100%{transform:translateY(0) scale(1,1)}
}
@keyframes ch-hop-s{
  0%{transform:scale(1);opacity:1}
  10%{transform:scale(1.08);opacity:1;animation-timing-function:${RISE}}
  42%{transform:scale(0.6);opacity:.4;animation-timing-function:${FALL}}
  57%{transform:scale(1);opacity:1}
  64%{transform:scale(1.1);opacity:1}
  86%,100%{transform:scale(1);opacity:1}
}
.ch-hop{animation:ch-hop 1.35s infinite}
.ch-hop-s{animation:ch-hop-s 1.35s infinite}

@keyframes ch-sigh{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,0.984)}}
.ch-sigh{animation:ch-sigh 3.8s ease-in-out infinite}

@keyframes ch-doze{0%,100%{transform:rotate(-1.8deg) scale(1,1)}50%{transform:rotate(1.8deg) scale(1.018,0.982)}}
.ch-doze{animation:ch-doze 4.2s ease-in-out infinite}
@keyframes ch-doze-s{0%,100%{transform:translateX(-1px)}50%{transform:translateX(1px)}}
.ch-doze-s{animation:ch-doze-s 4.2s ease-in-out infinite}

@keyframes ch-pop{0%{transform:scale(1,1)}28%{transform:translateY(-5px) scale(0.93,1.1)}62%{transform:translateY(0) scale(1.05,0.95)}100%{transform:translateY(0) scale(1,1)}}
.ch-pop{animation:ch-pop 380ms ${OUT}}
@keyframes ch-perk{0%{transform:translateY(0) scale(1,1)}35%{transform:translateY(-3.5px) scale(0.97,1.04)}70%{transform:translateY(0) scale(1.02,0.98)}100%{transform:translateY(0) scale(1,1)}}
.ch-perk{animation:ch-perk 360ms ${OUT}}

@keyframes ch-blink{0%,100%{transform:scaleY(1)}40%,55%{transform:scaleY(0.08)}}
.ch-blink{animation:ch-blink 160ms ease-in-out}

@keyframes ch-sway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
.ch-sway{animation:ch-sway 2.8s ease-in-out infinite}
.ch-sway-fast{animation:ch-sway 1.4s ease-in-out infinite}

@keyframes ch-twinkle{0%,100%{transform:scale(0.55) rotate(0deg);opacity:.25}50%{transform:scale(1.1) rotate(25deg);opacity:1}}
.ch-twinkle{animation:ch-twinkle 1.5s ease-in-out infinite}

@keyframes ch-z{0%{transform:translate(0,0) scale(0.7);opacity:0}25%{opacity:1}80%{opacity:.85}100%{transform:translate(7px,-13px) scale(1.15);opacity:0}}
.ch-z{animation:ch-z 2.7s ease-out infinite}

@keyframes ch-dot{0%,100%{opacity:.35}50%{opacity:1}}
.ch-dot{animation:ch-dot 1.2s ease-in-out infinite}

@keyframes ch-burst{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
.ch-burst{animation:ch-burst 260ms ${OUT} both}

@keyframes ch-flicker{0%,100%{opacity:1}45%{opacity:1}50%{opacity:.15}58%{opacity:1}}
.ch-flicker{animation:ch-flicker 1.7s steps(1,end) infinite}

@media (prefers-reduced-motion: reduce){
  .ch-t{transition:opacity 160ms ease}
  .ch-pose,.ch-pose-slow{transition:none}
}
:root[data-reduce-motion="true"] .ch-t{transition:opacity 160ms ease}
:root[data-reduce-motion="true"] .ch-pose,:root[data-reduce-motion="true"] .ch-pose-slow{transition:none}
`;

/** Renders nothing in place: React hoists it to <head> and dedupes it. */
export function CharacterStyles() {
  return (
    <style href="scientifically-characters" precedence="default">
      {CSS}
    </style>
  );
}
