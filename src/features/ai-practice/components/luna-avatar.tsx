/*
 * Luna, the practice assistant: a Maya woman from Guatemala (tocoyal ribbon
 * crown, braids and a woven huipil), drawn as a small animated SVG (no model
 * call). She blinks and breathes; while speaking her mouth moves, her head
 * nods and sound waves come out; while listening a green ring pulses.
 */

import { useId } from "react";

const STYLE = `
.luna-eyes{animation:luna-blink 4.6s infinite;transform-box:fill-box;transform-origin:center}
.luna-head{animation:luna-bob 3.4s ease-in-out infinite;transform-origin:60px 96px}
.luna-waves path{opacity:0}
.luna-talking .luna-head{animation:luna-nod .9s ease-in-out infinite}
.luna-talking .luna-mouth{animation:luna-talk .26s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
.luna-talking .luna-brows{animation:luna-brow 1.8s ease-in-out infinite}
.luna-talking .luna-waves path{animation:luna-wave 1.1s ease-out infinite}
.luna-talking .luna-waves path:nth-child(2){animation-delay:.25s}
.luna-talking .luna-waves path:nth-child(3){animation-delay:.5s}
.luna-talking .luna-glow{opacity:1;animation:luna-glow 1.1s ease-in-out infinite alternate}
.luna-glow{opacity:0;transition:opacity .3s}
.luna-ring{opacity:0}
.luna-listening .luna-ring{opacity:1;animation:luna-pulse 1.4s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes luna-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes luna-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes luna-nod{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(-2.5deg) translateY(-1px)}75%{transform:rotate(2deg) translateY(.5px)}}
@keyframes luna-talk{from{transform:scaleY(.3) scaleX(.9)}to{transform:scaleY(1.35) scaleX(1.05)}}
@keyframes luna-brow{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2px)}}
@keyframes luna-wave{0%{opacity:0;transform:translateX(0)}30%{opacity:1}100%{opacity:0;transform:translateX(5px)}}
@keyframes luna-glow{from{opacity:.35}to{opacity:.85}}
@keyframes luna-pulse{0%{transform:scale(.92);opacity:.9}100%{transform:scale(1.08);opacity:0}}
@media (prefers-reduced-motion:reduce){.luna-eyes,.luna-head,.luna-mouth,.luna-ring,.luna-brows,.luna-waves path,.luna-glow{animation:none!important}}
`;

const HAIR = "#1d1512";
const SKIN = "#b9784f";
const SKIN_SHADE = "#a1643f";
const HUIPIL = "#c62f3a";

export function LunaAvatar({
  size = 120,
  talking = false,
  listening = false,
}: {
  size?: number;
  talking?: boolean;
  listening?: boolean;
}) {
  const clipId = `luna-clip-${useId().replace(/:/g, "")}`;
  const state = [talking ? "luna-talking" : "", listening ? "luna-listening" : ""].join(" ").trim();
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Luna"
      className={state || undefined}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      <style>{STYLE}</style>
      <circle className="luna-ring" cx="60" cy="60" r="57" fill="none" stroke="#5fbf8f" strokeWidth="4" />
      <circle className="luna-glow" cx="60" cy="60" r="57" fill="none" stroke="#f7c873" strokeWidth="3" />
      <circle cx="60" cy="60" r="54" fill="#efe9fb" />
      <clipPath id={clipId}>
        <circle cx="60" cy="60" r="54" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {/* huipil: red blouse with a woven band at the neck */}
        <path d="M24 122c2-22 16-31 36-31s34 9 36 31z" fill={HUIPIL} />
        <path d="M44 93q16 10 32 0l3 9q-19 11-38 0z" fill="#f2c14e" />
        <path
          d="M47 97l3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3"
          stroke="#2f6db5"
          strokeWidth="1.6"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M30 112h60" stroke="#2a8f6a" strokeWidth="3" strokeDasharray="4 3" />
        <path d="M28 118h64" stroke="#f2c14e" strokeWidth="2" />
        <g className="luna-head">
          {/* hair (back) */}
          <path d="M34 60c0-22 12-34 26-34s26 12 26 34v14H34z" fill={HAIR} />
          {/* braids over the shoulders, with ribbon ends */}
          <path d="M36 70q-4 14 0 28" stroke={HAIR} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M84 70q4 14 0 28" stroke={HAIR} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M33 78l5 2M33 85l5 2M33 92l5 2M82 80l5-2M82 87l5-2M82 94l5-2" stroke="#3a2a24" strokeWidth="1.2" />
          <circle cx="36" cy="99" r="2.6" fill="#e2445c" />
          <circle cx="84" cy="99" r="2.6" fill="#e2445c" />
          {/* neck and face */}
          <rect x="53" y="78" width="14" height="14" rx="5" fill={SKIN_SHADE} />
          <ellipse cx="60" cy="60" rx="20" ry="23" fill={SKIN} />
          {/* hair parted in the middle */}
          <path d="M40 54c2-13 10-20 20-20s18 7 20 20c-6-7-13-10-20-10s-14 3-20 10z" fill={HAIR} />
          <path d="M60 35v8" stroke="#3a2a24" strokeWidth="1" />
          {/* tocoyal: the woven ribbon wrapped round the head like a crown */}
          <path d="M37 42q23-16 46 0l-3 7q-20-13-40 0z" fill="#e2445c" />
          <path d="M39 44q21-13 42 0" stroke="#f2c14e" strokeWidth="2" fill="none" />
          <path d="M42 41l3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3" stroke="#2a8f6a" strokeWidth="1.2" fill="none" />
          <circle cx="38" cy="46" r="3.2" fill="#8e3fb0" />
          <circle cx="82" cy="46" r="3.2" fill="#2f6db5" />
          {/* earrings */}
          <circle cx="40" cy="68" r="2.4" fill="#f7c873" />
          <circle cx="80" cy="68" r="2.4" fill="#f7c873" />
          {/* cheeks */}
          <circle cx="48" cy="67" r="3.6" fill="#d9715e" opacity=".5" />
          <circle cx="72" cy="67" r="3.6" fill="#d9715e" opacity=".5" />
          <g className="luna-eyes">
            <ellipse cx="51.5" cy="59" rx="2.3" ry="2.6" fill="#1d1512" />
            <ellipse cx="68.5" cy="59" rx="2.3" ry="2.6" fill="#1d1512" />
            <circle cx="52.3" cy="58.2" r=".7" fill="#fff" />
            <circle cx="69.3" cy="58.2" r=".7" fill="#fff" />
          </g>
          <path
            className="luna-brows"
            d="M47 53.5q4.5-2.5 9 0M64 53.5q4.5-2.5 9 0"
            stroke={HAIR}
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M60 61q-2 5 0 6" stroke={SKIN_SHADE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <ellipse className="luna-mouth" cx="60" cy="72.5" rx="5" ry="2.6" fill="#8f2f2c" />
        </g>
      </g>
      {/* sound waves next to her mouth while she speaks */}
      <g className="luna-waves" stroke="#f0a43a" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M90 64q4 6 0 12" />
        <path d="M96 60q6 10 0 20" />
        <path d="M102 56q8 14 0 28" />
      </g>
    </svg>
  );
}
