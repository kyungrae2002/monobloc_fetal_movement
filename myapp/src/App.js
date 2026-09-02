import { useEffect, useRef, useState } from 'react';
import {
  CONTENT, SHARED, CARD_KEYS, ENTRANCE, STEP_KEYS, SURVEY_KEYS, TEAM,
  ZONE_LAMPS,
} from './content';
import PHOTOS from './photos';
import { sendFeedback, configured } from './survey';
import logo from './logo.png';
import './App.css';

// Two rhythms, deliberately separate.
//
// The drifting cards are the site's own pulse, tuned by eye and deliberately
// quicker than the machine: two seconds still, two turning. A screen held in
// the hand can afford to be more restless than a wall.
const CANVAS_MS = 4000;
const CANVAS_REST = 2 / 4;

// The zone diagram inside card 02 is a picture of the actual machine, so it
// keeps the firmware's real idle rhythm - four seconds still, two stirring.
// Tying it to the canvas would make the drawing lie about the piece.
const PIECE_MS = 6000;
const PIECE_REST = 4 / 6;

// How far right of centre the hub sits, in real centimetres. Off-axis on
// purpose: a ring with its hub dead in the middle reads as a diagram, and the
// composition wants to look found rather than drawn.
const HUB_SHIFT_CM = 0.7;

// And how far above centre the whole ring sits. Measured the same way, so the
// composition lifts by the same amount on a phone and on a laptop.
const RING_LIFT_CM = 0.5;
const PX_PER_CM = 37.8;          // CSS definition of a centimetre

// Wall-clock time for one full turn. The ring does not turn steadily: it only
// moves during the stirring two seconds of each cycle and holds still for the
// other two, so a revolution arrives as a handful of shoves rather than a
// glide - at this rate, roughly eight of them.
const ORBIT_MS = 30000;

// How long a turn takes while the hub is held down. Four times the usual pace,
// and continuous rather than in shoves - holding it should feel like winding
// the piece up, not like nudging it.
const HELD_ORBIT_MS = 7500;

// Where each card sits on the orbit, and how big it is. rx and ry are percent
// of the canvas, not vw/vh: the spokes are drawn in an SVG that spans the same
// box, and one shared coordinate system is what lets a line land exactly on a
// card's centre without measuring anything at runtime.
//
// Radii and sizes all differ so the five never read as a mechanism: the
// reference layouts feel floating precisely because nothing is evenly spaced.
// seed offsets the squirming so the five never deform in unison - five things
// wobbling on the same beat reads as a machine, not as something alive.
const ORBIT = [
  { at: 0.00, rx: 38, ry: 33, size: 101, depth: 0.0, seed: 0.0 },
  { at: 0.23, rx: 42, ry: 28, size: 105, depth: 0.4, seed: 1.9 },
  { at: 0.43, rx: 34, ry: 36, size: 101, depth: 0.1, seed: 3.4 },
  { at: 0.64, rx: 40, ry: 30, size: 121, depth: 0.6, seed: 5.1 },
  { at: 0.83, rx: 36, ry: 34, size: 110, depth: 0.3, seed: 6.6 },
];

// Milliseconds of running time. One clock for the whole page, so the breath,
// the turning and the glow cannot drift apart.
//
// It stops when `active` goes false and banks what it has, then carries on from
// there. That matters more than it sounds: a panel covers the canvas entirely,
// and without this the ring keeps redrawing at 60fps behind an opaque sheet for
// as long as someone is reading - which, for a page reached from a card in
// someone's pocket, could be minutes.
function useElapsed(active = true) {
  const [ms, setMs] = useState(0);
  const banked = useRef(0);

  useEffect(() => {
    if (!active) return;
    // Guarded rather than assumed: matchMedia is missing in jsdom, and treating
    // its absence as "no preference" is the right default anywhere it is gone.
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;               // honour the system setting; hold still

    let raf;
    const start = performance.now();
    const tick = (now) => {
      setMs(banked.current + (now - start));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      banked.current += performance.now() - start;
    };
  }, [active]);

  return ms;
}

// Speed of the stirring, 0 while resting: nothing at all, then a smooth swell
// and fall. rest is the fraction of the cycle spent holding still.
function stir(phase, rest) {
  if (phase < rest) return 0;
  return Math.sin(((phase - rest) / (1 - rest)) * Math.PI);
}

// How far through this cycle's shove we are, 0 to 1. It is the integral of
// stir(), so the ring accelerates and settles instead of starting and stopping
// dead - and it always lands on exactly one step per cycle.
function shove(phase, rest) {
  if (phase < rest) return 0;
  return (1 - Math.cos(((phase - rest) / (1 - rest)) * Math.PI)) / 2;
}

/* ---------- the squirming outline ---------- */

// The cards are drawn as a path rather than a bordered box so the edge itself
// can bulge and sink - something pressing out from inside, which a rotation or
// a scale cannot express no matter how it is eased.
const VB_W = 100;
const VB_H = 132;
const INSET = 9;          // room for a bulge to grow into without clipping

// Points anchored around the rectangle, each with the direction it pushes when
// it swells. Corners are left out: displacing them turns the rectangle into a
// lozenge, and it should still read as a rectangle at rest.
const EDGE = (() => {
  const pts = [];
  const x0 = INSET, x1 = VB_W - INSET, y0 = INSET, y1 = VB_H - INSET;
  const along = (a, b, n, fn) => {
    for (let i = 0; i < n; i++) fn(a + ((b - a) * i) / n, i / n);
  };
  along(x0, x1, 5, (x) => pts.push({ x, y: y0, nx: 0, ny: -1 }));
  along(y0, y1, 6, (y) => pts.push({ x: x1, y, nx: 1, ny: 0 }));
  along(x1, x0, 5, (x) => pts.push({ x, y: y1, nx: 0, ny: 1 }));
  along(y1, y0, 6, (y) => pts.push({ x: x0, y, nx: -1, ny: 0 }));
  return pts;
})();

// Two waves whose periods do not divide into one another, so the surface never
// settles back into a pose it has already held.
function swell(i, t, seed) {
  return (
    Math.sin(t * 1.6 + i * 0.85 + seed) * 0.62 +
    Math.sin(t * 2.7 + i * 1.9 + seed * 1.4) * 0.38
  );
}

// Closed curve through the midpoints, using each anchor as a control point.
// Quadratics rather than straight lines: a polygon of bulges looks dented,
// a curve looks like a surface.
function outline(t, seed, amp) {
  const p = EDGE.map((e, i) => {
    const d = swell(i, t, seed) * amp;
    return { x: e.x + e.nx * d, y: e.y + e.ny * d };
  });
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const n = p.length;
  const m0 = mid(p[n - 1], p[0]);
  let d = `M${m0.x.toFixed(2)},${m0.y.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const m = mid(p[i], p[(i + 1) % n]);
    d += `Q${p[i].x.toFixed(2)},${p[i].y.toFixed(2)} ${m.x.toFixed(2)},${m.y.toFixed(2)}`;
  }
  return d + 'Z';
}

// Pixel size of the canvas. The spokes have to be trimmed where they meet a
// card, and that intersection can only be worked out in real pixels: the SVG
// is stretched to a square viewBox, so its x and y units are different lengths
// and a rectangle hit test done in them would come out skewed.
function useBox(ref) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

// Ends of the falloff along a spoke. The overall line opacity is set on the
// stroke and these multiply into it, so the visible values are the product of
// the two - see the note on strokeOpacity below.
const SPOKE_HUB = 1;      // at the centre
const SPOKE_EDGE = 0.05;  // where it touches a card

// Clearances kept between a card's edge and the edge of the canvas. The bottom
// is the largest because the label hangs below the shape and would be the first
// thing cut off.
const MARGIN_X = 10;
const MARGIN_TOP = 10;
const MARGIN_BOTTOM = 32;

// The orbit above is what the layout wants; this is what the screen can take.
// Radii are pulled in until the card fits, so a narrow phone quietly gets a
// tighter ring instead of shapes sliced off at the edge.
function radii(o, s, box, cyPct) {
  if (!box.w || !box.h) return { rx: o.rx, ry: o.ry };
  const scale = 1 - o.depth * 0.25 + s * 0.05;
  const hw = (o.size * scale) / 2;
  const hh = (o.size * 1.32 * scale) / 2;
  const cy = (cyPct / 100) * box.h;
  const maxRx = ((box.w / 2 - hw - MARGIN_X) / box.w) * 100;
  // Lifting the ring leaves less room above it and more below, so the two
  // limits are no longer the same number.
  const maxRyTop = ((cy - hh - MARGIN_TOP) / box.h) * 100;
  const maxRyBottom = ((box.h - cy - hh - MARGIN_BOTTOM) / box.h) * 100;
  return {
    rx: Math.max(0, Math.min(o.rx, maxRx)),
    ry: Math.max(0, Math.min(o.ry, maxRyTop, maxRyBottom)),
  };
}

// The drawn rectangle does not fill the card: the path is inset to leave room
// for the surface to bulge. These are the fractions of the element the shape
// actually covers, so the spoke stops at the outline rather than short of it.
const SHAPE_W = (VB_W - INSET * 2) / VB_W;
const SHAPE_H = (VB_H - INSET * 2) / VB_H;

// Position on the ring, as a number of turns. Pulsed by default; smooth and
// quick for as long as the hub is being held.
function rawTurns(ms, held) {
  if (held) return ms / HELD_ORBIT_MS;
  const cycles = ms / CANVAS_MS;
  // Whole cycles already taken, plus how far into this one's shove we are.
  // Each cycle advances the ring by CANVAS_MS/ORBIT_MS of a turn, so the stated
  // revolution time still holds even though the motion arrives in bursts.
  return (Math.floor(cycles) + shove(cycles % 1, CANVAS_REST)) * (CANVAS_MS / ORBIT_MS);
}

// Brightness of the whole composition. Holding keeps it lit, but still moving:
// a flat value would leave the surfaces frozen mid-bulge, since the squirm is
// scaled by this.
function glow(ms, held) {
  if (held) return 0.7 + 0.3 * Math.sin((ms / 1000) * 2.4);
  return stir((ms / CANVAS_MS) % 1, CANVAS_REST);
}

// A tick at every change of state, so the piece can be felt as well as seen.
// The cycle is two seconds still and two turning, so ticking on each boundary
// lands one every two seconds - and each one marks something actually
// happening on screen rather than running to its own clock.
//
// Two things make this best-effort rather than a feature to rely on. iOS Safari
// does not implement the Vibration API at all, so roughly half of visitors will
// never feel it; and browsers that do implement it refuse until the page has
// been touched, which is why the first tap arms it. Everything else on the
// screen has to work without it.
function useTick(ms, active) {
  const armed = useRef(false);
  const lastHalf = useRef(0);

  useEffect(() => {
    const arm = () => {
      armed.current = true;
    };
    window.addEventListener('pointerdown', arm, { once: true });
    return () => window.removeEventListener('pointerdown', arm);
  }, []);

  // 0 while resting, 1 while turning. Every change is a boundary worth marking.
  const half = ((ms / CANVAS_MS) % 1) >= CANVAS_REST ? 1 : 0;
  useEffect(() => {
    const changed = half !== lastHalf.current;
    lastHalf.current = half;
    if (!changed || !active || !armed.current) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);   // a tick, not a buzz
    }
  }, [half, active]);
}

/* ---------- opening screen ---------- */

function Canvas({ ms, s, turns, held, onHold, onOpen }) {
  const canvasRef = useRef(null);
  const box = useBox(canvasRef);

  // The hub, in viewBox units. Shifting by a real measurement rather than a
  // percentage keeps the offset the same on a phone and on a laptop.
  const hubX = 50 + (box.w ? ((HUB_SHIFT_CM * PX_PER_CM) / box.w) * 100 : 0);
  const cyPct = 50 - (box.h ? ((RING_LIFT_CM * PX_PER_CM) / box.h) * 100 : 0);

  return (
    <>
    {/* Defined once and referenced by every card. Turbulence displaces the
        outline by a pixel or two, which is what turns an even machine curve
        into something that looks drawn by hand.
        Only the cards use it: their viewBox is almost 1:1 with their pixel size,
        so the displacement lands evenly. The spokes are stretched across the
        whole canvas, where the same filter would wobble far harder vertically
        than horizontally. */}
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="rough" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      {/* The same idea at letter scale. Finer grain and a much smaller push:
          the outlines can take a two pixel wobble, but a counter inside an O is
          only a few pixels across and the same displacement closes it up. */}
      <filter id="roughText" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>

    <section
      className="canvas"
      ref={canvasRef}
      // Hold anywhere in the field to spin it, not just on the dot. The cards
      // stop this from firing themselves - pressing one is how you open it, and
      // it should not also wind the ring up.
      onPointerDown={() => onHold(true)}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {/* The spokes sit under every card - the lowest card z-index is 4 - so a
          line disappears the moment it reaches a shape, from either side. */}
      <svg
        className="spokes"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          filter: s > 0.01 ? `drop-shadow(0 0 ${s * 9}px rgba(239,236,228,${s * 0.4}))` : 'none',
        }}
      >
        {/* One gradient per spoke, in user space so its ends track the line as
            it swings round. Strong at the hub, all but gone where it meets a
            card: the spokes should read as something the centre puts out, not
            as a diagram with five equal legs. */}
        <defs>
          {ORBIT.map((o, i) => {
            const a = (turns + o.at) * Math.PI * 2;
            const end = spokeEnd(o, a, s, box, hubX, cyPct);
            const col = s > 0.01 ? `rgba(239,236,228,${0.18 + s * 0.5})` : '#a8a8a8';
            return (
              <linearGradient
                key={i}
                id={`spoke${i}`}
                gradientUnits="userSpaceOnUse"
                x1={hubX}
                y1={cyPct}
                x2={end.x}
                y2={end.y}
              >
                <stop offset="0" stopColor={col} stopOpacity={SPOKE_HUB} />
                <stop offset="1" stopColor={col} stopOpacity={SPOKE_EDGE} />
              </linearGradient>
            );
          })}
        </defs>

        {ORBIT.map((o, i) => {
          const a = (turns + o.at) * Math.PI * 2;
          const end = spokeEnd(o, a, s, box, hubX, cyPct);
          return (
            <path
              key={i}
              d={spokePath(hubX, cyPct, end, o.seed, box)}
              fill="none"
              vectorEffect="non-scaling-stroke"
              stroke={`url(#spoke${i})`}
              strokeOpacity={0.34 - o.depth * 0.16 + s * 0.28}
            />
          );
        })}
      </svg>

      {/* The point every spoke meets, and the only other thing on the screen
          that can be pressed. Its own element rather than part of the SVG so it
          can carry a proper 44px touch target around a 3px dot. */}
      <button
        className={`hub${held ? ' held' : ''}`}
        // Pointer holding is handled by the canvas beneath, which covers this
        // dot as well. What is left here is the keyboard equivalent, and a
        // visible target that says the screen can be held at all.
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onHold(true)}
        onKeyUp={(e) => (e.key === 'Enter' || e.key === ' ') && onHold(false)}
        aria-pressed={held}
        aria-label="hold to spin"
        style={{
          left: `${hubX}%`,
          top: `${cyPct}%`,
          background: s > 0.01 ? `rgba(239,236,228,${0.4 + s * 0.5})` : 'var(--ink-faint)',
          boxShadow: s > 0.01 ? `0 0 ${s * 14}px ${s * 3}px rgba(239,236,228,${s * 0.4})` : 'none',
        }}
      />

      {CARD_KEYS.map((card, i) => {
        const o = ORBIT[i];
        const a = (turns + o.at) * Math.PI * 2;
        const r = radii(o, s, box, cyPct);
        const scale = 1 - o.depth * 0.25 + s * 0.05;

        // Gated by s: the surface only works while the card is lit and moving,
        // and settles back to a clean rectangle as the light goes out.
        const d = outline(ms / 1000, o.seed, s * 7);

        return (
          <button
            key={card.id}
            className="card"
            onPointerDown={(e) => e.stopPropagation()}
            // The rect goes with the index so the panel can start life exactly
            // where the card was, rather than appearing from nowhere.
            onClick={(e) => onOpen(i, e.currentTarget.getBoundingClientRect())}
            style={{
              left: `${50 + Math.cos(a) * r.rx}%`,
              top: `${cyPct + Math.sin(a) * r.ry}%`,
              width: o.size,
              height: o.size * 1.32,
              opacity: 0.46 - o.depth * 0.2 + s * 0.38,
              transform: `translate(-50%,-50%) scale(${scale})`,
              zIndex: Math.round((1 - o.depth) * 10),
              // drop-shadow rather than box-shadow: it follows the bulging
              // outline, where a box-shadow would glow around a rectangle that
              // is no longer there.
              filter: s > 0.01 ? `drop-shadow(0 0 ${s * 12}px rgba(239,236,228,${s * 0.45}))` : 'none',
            }}
          >
            <svg
              className={`blob${card.preview ? ' previewed' : ''}`}
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* Under the outline, not over it: the path is drawn after this
                  with a translucent fill, which both tints the preview back
                  and leaves the stroke crisp on top. Clipping the preview over
                  a finished shape instead would have covered the inner half of
                  that stroke and thinned it by half. */}
              {card.preview && (
                <>
                  <defs>
                    <clipPath id={`in-${card.id}`}>
                      <path d={d} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#in-${card.id})`} opacity={0.62 + s * 0.38}>
                    {card.preview.photo && PHOTOS[card.preview.photo] && (
                      <image
                        href={
                          process.env.PUBLIC_URL +
                          (PHOTOS[card.preview.photo].thumb ||
                            PHOTOS[card.preview.photo].src)
                        }
                        x="0"
                        y="0"
                        width={VB_W}
                        height={VB_H}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    )}
                    {card.preview.lines &&
                      card.preview.lines.map((line, k) => (
                        <text
                          key={line}
                          className="ptext"
                          x={VB_W / 2}
                          y={
                            VB_H / 2 -
                            ((card.preview.lines.length - 1) * 11) / 2 +
                            k * 11 +
                            3
                          }
                          textAnchor="middle"
                        >
                          {line}
                        </text>
                      ))}
                  </g>
                </>
              )}
              <path
                d={d}
                filter="url(#rough)"
                vectorEffect="non-scaling-stroke"
                stroke={s > 0.01 ? `rgba(239,236,228,${0.3 + s * 0.6})` : 'var(--ink-faint)'}
              />
            </svg>
            {/* Every label now lights, and none of them drop far: on a dark
                ground a resting label at the old dim value was barely legible,
                so the floor is high and the pulse rides above it. The feedback
                card still lifts furthest, because it is the one asking for
                something. */}
            <span
              className="mono tag"
              style={{
                color: `rgba(239,236,228,${(card.lit ? 0.72 : 0.6) + s * (card.lit ? 0.28 : 0.24)})`,
                textShadow: `0 0 ${6 + s * (card.lit ? 14 : 10)}px rgba(239,236,228,${
                  (card.lit ? 0.22 : 0.16) + s * (card.lit ? 0.5 : 0.34)
                })`,
              }}
            >
              {card.tag}
            </span>
          </button>
        );
      })}
    </section>
    </>
  );
}

// Where the spoke should stop: the point at which the straight run from the hub
// first touches the card's outline. Without this the line carries on to the
// centre and shows through, because the cards are deliberately translucent -
// stacking order alone cannot hide it.
function spokeEnd(o, a, s, box, hubX, cyPct) {
  const r = radii(o, s, box, cyPct);
  const cx = 50 + Math.cos(a) * r.rx;
  const cy = cyPct + Math.sin(a) * r.ry;
  if (!box.w || !box.h) return { x: cx, y: cy };   // not measured yet

  const scale = 1 - o.depth * 0.25 + s * 0.05;
  const hx = (o.size * SHAPE_W * scale) / 2;               // half width, px
  const hy = (o.size * 1.32 * SHAPE_H * scale) / 2;        // half height, px

  // Run the hit test in pixels, where the rectangle really is a rectangle.
  const px = (cx / 100) * box.w;
  const py = (cy / 100) * box.h;
  let dx = (hubX / 100) * box.w - px;
  let dy = (cyPct / 100) * box.h - py;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { x: cx, y: cy };
  dx /= len;
  dy /= len;

  // Distance from the centre to the edge along that direction.
  const t = Math.min(
    Math.abs(dx) > 1e-4 ? hx / Math.abs(dx) : Infinity,
    Math.abs(dy) > 1e-4 ? hy / Math.abs(dy) : Infinity
  );
  const stop = Math.min(t, len);   // never overshoot the hub itself

  return {
    x: ((px + dx * stop) / box.w) * 100,
    y: ((py + dy * stop) / box.h) * 100,
  };
}

// A spoke as a drawn line rather than a ruled one: sampled along its length and
// nudged sideways, then smoothed into a curve.
//
// Done in geometry rather than with the turbulence filter the cards use. This
// SVG is a square viewBox stretched across the whole canvas, so a filter would
// displace far harder vertically than horizontally and the lines would come out
// combed. Working out the sideways push in pixels and converting back per axis
// keeps the wobble the same size in every direction.
//
// The offsets are fixed per spoke, not animated: a line that is drawn should
// keep its own crookedness as it swings round, not squirm in place.
function spokePath(hubX, cyPct, end, seed, box) {
  const N = 9;
  const AMP = 2.6;                       // px
  if (!box.w || !box.h) return `M${hubX},${cyPct} L${end.x},${end.y}`;

  const x0 = (hubX / 100) * box.w, y0 = (cyPct / 100) * box.h;
  const x1 = (end.x / 100) * box.w, y1 = (end.y / 100) * box.h;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;   // unit normal, in pixels

  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // Zero at both ends so the line still meets the hub and the card exactly.
    const taper = Math.sin(t * Math.PI);
    const w =
      (Math.sin(t * 5.3 + seed) * 0.6 + Math.sin(t * 9.1 + seed * 1.7) * 0.4) *
      AMP * taper;
    const px = x0 + dx * t + nx * w;
    const py = y0 + dy * t + ny * w;
    pts.push({ x: (px / box.w) * 100, y: (py / box.h) * 100 });
  }

  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += `Q${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;
  }
  const last = pts[pts.length - 1];
  return d + `L${last.x.toFixed(2)},${last.y.toFixed(2)}`;
}

/* ---------- the zone detail, inside card 02 ---------- */

// A vertical track beside the chart: dragging down is coming closer, which is
// the same direction the bars grow and the same gesture as lowering a hand over
// the sensor.
//
// Built by hand rather than with a rotated <input type="range">. Vertical range
// inputs are still spelled differently in every engine - writing-mode in one,
// an orient attribute in another - and the ones that do work cannot be styled
// to sit flush against the chart.
function ZoneTrack({ zone, setZone, max, label }) {
  const ref = useRef(null);

  const fromEvent = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setZone(Math.round(p * max));
  };

  return (
    <div
      ref={ref}
      className="vtrack"
      // Stops the box's tap-to-step from firing as well: this control sets an
      // absolute position, and stepping on top of it would land somewhere else.
      onClick={(e) => e.stopPropagation()}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={zone}
      onPointerDown={(e) => {
        // Capture so a finger that slides off the narrow track keeps control.
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        fromEvent(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) fromEvent(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          setZone(Math.min(max, zone + 1));
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          setZone(Math.max(0, zone - 1));
        } else {
          return;
        }
        e.preventDefault();
      }}
    >
      <div className="vline" />
      {Array.from({ length: max + 1 }, (_, i) => (
        <span key={i} className="vtick" style={{ top: `${(i / max) * 100}%` }} />
      ))}
      <div className="vthumb" style={{ top: `${(zone / max) * 100}%` }} />
    </div>
  );
}

function Zones({ copy }) {
  // Everything about how many zones there are comes from ZONE_LAMPS, so the
  // chart and the piece cannot end up disagreeing about it.
  const last = ZONE_LAMPS.length - 1;
  const [zone, setZone] = useState(0);
  const breath = (useElapsed() / PIECE_MS) % 1;
  const s = stir(breath, PIECE_REST);

  const amp = zone === 0 ? 0.08 : 0.08 + (zone / last) * 0.92;
  // Zone 0 only moves during the stirring part of the breath, exactly as the
  // actuators do; from zone 1 on the piece runs continuously.
  const drive = zone === 0 ? s : 1;

  // How much of the room is lit, 0 to 1. In zone 0 the lamps blink, so the
  // wash has to blink with them - the box brightening while the lamps are dark
  // would read as two different lights.
  const lampsOn = zone === 0 ? (s > 0.15 ? ZONE_LAMPS[0] : 0) : ZONE_LAMPS[zone];
  const wash = lampsOn / 4;

  return (
    <div className="zones">
      {/* The tap lives on the whole box so the padding counts too. A div, not a
          button: the track inside is already interactive, and nesting one
          control in another is invalid and confuses assistive tech. Keyboard
          users reach the same states through the track's arrow keys. */}
      <div
        className="stage"
        onClick={() => setZone((z) => Math.min(last, z + 1))}
        style={{
          // The lit room, not the lamp: this is what a visitor actually sees
          // when the relays close. Kept inside the box so nothing resizes.
          // Two insets: a wide one that fills the box and a tight one that hugs
          // the edge, so the light reads as coming from the frame inwards
          // rather than as a flat tint laid over the top.
          boxShadow: wash
            ? `inset 0 0 ${40 + wash * 70}px rgba(239,236,228,${wash * 0.22}),` +
              ` inset 0 0 ${8 + wash * 14}px rgba(239,236,228,${wash * 0.14})`
            : 'none',
          borderColor: wash ? `rgba(239,236,228,${0.25 + wash * 0.5})` : 'var(--rule)',
        }}
      >
        <div className="stage-main">
        <div className="axes" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => {
            // Each axis leans on the breath at its own offset so the five never
            // line up - the real ones drift apart too, because their strokes
            // are different lengths.
            const off = stir((breath + i * 0.13) % 1, PIECE_REST);
            const reach = amp * (0.55 + 0.45 * off) * drive;
            return (
              <div key={i} className="axis">
                <div className="bar" style={{ height: `${3 + reach * 95}%` }} />
                <span className="mono idx">{`0${i + 1}`}</span>
              </div>
            );
          })}
        </div>

        <div className="lamps" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => {
            const lit = i < ZONE_LAMPS[zone];
            // Zone 0's lamps blink with the breath instead of holding steady.
            const on = zone === 0 ? lit && s > 0.15 : lit;
            return (
              <span
                key={i}
                className={`lamp${on ? ' on' : ''}`}
                style={on ? { boxShadow: '0 0 8px 1px rgba(239,236,228,0.5)' } : undefined}
              />
            );
          })}
        </div>
        </div>

        <ZoneTrack zone={zone} setZone={setZone} max={last} label={copy.zoneWord} />
      </div>

      <span className="mono lbl drag">{copy.drag}</span>
    </div>
  );
}

/* ---------- survey, inside card 05 ---------- */

function Survey({ copy, onSent }) {
  const q = copy.survey;
  const [answers, setAnswers] = useState({});
  const [free, setFree] = useState('');
  const [state, setState] = useState('idle');   // idle | sending | done | failed

  if (state === 'done') {
    return (
      <div className="survey done">
        {/* The four lines light one after another, a second and a half apart,
            so the note is read in the order it was written rather than arriving
            at once. It happens once and then settles: a note that keeps
            flashing at someone who has finished reading is just noise. The
            delay is set here because it depends on position in the list. */}
        <p className="thanks lit" style={{ animationDelay: '0s' }}>
          {q.thanks}
        </p>
        {q.thanksBody.map((line, i) => (
          <p key={i} className="body lit" style={{ animationDelay: `${(i + 1) * 1.5}s` }}>
            {line}
          </p>
        ))}
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    try {
      await sendFeedback({ ...answers, note: free.trim() || null });
      setState('done');
      onSent();
    } catch (err) {
      // Logged rather than shown: the visitor gets a plain sentence, and the
      // detail is for whoever is looking after the exhibition.
      console.error(err);
      setState('failed');
    }
  };

  return (
    <form className="survey" onSubmit={submit}>
      {q.questions.map((question, qi) => {
        // Labels come from the translation, the stored value from SURVEY_KEYS.
        // The two are matched by position, which is why both lists are written
        // in the same order and neither is sorted anywhere.
        const { key, values } = SURVEY_KEYS[qi];
        return (
          <fieldset key={key} className="qblock">
            <legend className="mono lbl">{question.label}</legend>
            <p className="desc">{question.prompt}</p>
            <div className="opts">
              {question.options.map((label, oi) => {
                const value = values[oi];
                const on = answers[key] === value;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`opt${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [key]: on ? undefined : value }))
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <fieldset className="qblock">
        <legend className="mono lbl">{q.freeLabel}</legend>
        <p className="desc">{q.freePrompt}</p>
        <textarea
          className="note"
          rows="4"
          maxLength="600"
          value={free}
          onChange={(e) => setFree(e.target.value)}
          placeholder={q.placeholder}
        />
      </fieldset>

      {!configured && <p className="mono lbl warn">{q.unconfigured}</p>}
      {state === 'failed' && <p className="mono lbl warn">{q.failed}</p>}

      <button
        className="send"
        type="submit"
        disabled={!configured || state === 'sending'}
        aria-label={state === 'sending' ? q.sending : q.submit}
      >
        {state === 'sending' ? SHARED.sendingMark : SHARED.submitMark}
      </button>
    </form>
  );
}

/* ---------- detail panel ---------- */

// Contact marks, drawn rather than set as emoji. The emoji were rendered by the
// phone's own font: full colour, sitting on their own baseline, and a different
// shape on every device - three things this page controls everywhere else.
// These follow the link's colour like the rest of the panel does.
//
// aria-hidden throughout: the address beside each one is already the link's
// accessible name, and "postbox" announced in front of it is only noise.
function PinIcon() {
  return (
    <svg
      className="picon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21.5s7-6.1 7-11.2A7 7 0 0 0 5 10.3c0 5.1 7 11.2 7 11.2Z" />
      <circle cx="12" cy="10.1" r="2.6" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="cicon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2.5" fill="currentColor" />
      {/* The flap is knocked out in the panel's own colour rather than drawn as
          a line over the fill - it has to read as the gap between two folds. */}
      <path
        d="M3 5.4 L12 13.2 L21 5.4"
        fill="none"
        stroke="var(--ground)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IgIcon() {
  return (
    <svg
      className="cicon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.4" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Panel({ copy, keys, card, from, onClose, onLang }) {
  // Once an answer is in, the heading goes with the form: what replaces them is
  // a note to the visitor, and leaving "Feedback" above it would read as though
  // there were still something to fill in.
  const [sent, setSent] = useState(false);
  const [closing, setClosing] = useState(false);

  // Leaving the thank-you note fades rather than cuts. Everywhere else closes
  // at once: a delay on a panel someone is only browsing feels like lag, but
  // here the note has just finished lighting itself and a hard cut undoes it.
  const timer = useRef(null);
  const close = () => {
    if (!sent) return onClose();
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(onClose, 500);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // Held in a ref so the effect below can run once for the life of the panel.
  // onClose arrives as a fresh arrow on every render, and a panel re-renders
  // constantly - every answer tapped, every character typed into the note.
  const escape = useRef(onClose);
  escape.current = onClose;

  useEffect(() => {
    // The canvas behind keeps drifting; stopping the body from scrolling keeps
    // the two from fighting on a phone.
    //
    // Restoring what was there rather than clearing it, and doing it exactly
    // once: if this effect re-ran while the panel was open it would read back
    // its own "hidden" as the value to restore, and closing would leave the
    // page locked.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && escape.current();   // never waits
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // The panel grows out of the card that was tapped. Only a plain rectangle of
  // the background is scaled - the text is faded in over it - because scaling a
  // panel non-uniformly would stretch every line of type on the way.
  const grow = from
    ? {
        '--gx': `${from.left}px`,
        '--gy': `${from.top}px`,
        '--gsx': from.width / window.innerWidth,
        '--gsy': from.height / window.innerHeight,
      }
    : undefined;

  return (
    <div
      className={`panel${from ? ' growing' : ''}${closing ? ' closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={keys.title}
      // Once the answer is in there is nothing left to read carefully, so the
      // whole panel becomes the way out. Only then: making the panel dismiss on
      // any tap while a form is on screen would close it under someone who was
      // still filling it in.
      onClick={sent ? close : undefined}
    >
      <div className="panel-ground" style={grow} aria-hidden="true" />

      <div className="panel-top">
        <span className="mono">{keys.tag}</span>
        <div className="panel-actions">
          {/* Only offered where there is something to read. The opening screen
              is a handful of English labels, and a switch there would promise
              a translation that does not exist. */}
          {/* Stopping the tap here matters only after the form has been sent:
              the panel itself becomes the way out at that point, and without
              this, switching the thank-you note to English would close it. */}
          <button
            className="pill ghost"
            onClick={(e) => {
              e.stopPropagation();
              onLang();
            }}
            aria-label="language"
          >
            {copy.other}
          </button>
          {/* An SVG rather than a x or a glyph: the character's size and
              position shift with whatever font ends up loading, and this one
              has to sit dead centre in a round button. The word stays as the
              accessible name so it is still announced as "close". */}
          <button className="pill icon" onClick={close} aria-label={copy.close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="panel-body">
        {!sent && <h2 className="panel-title">{keys.title}</h2>}

        {/* Above the address rather than below it: the card answers "where is
            this", and a photograph of the doorway says that faster than a
            street name does. Each is skipped if its file is not there, so the
            card stays usable while the photographs are still being taken. */}
        {card.photos && (
          <div className="shots">
            {ENTRANCE.filter(([k]) => PHOTOS[k]).map(([k, label]) => (
              <figure key={k} className="shot">
                <img
                  src={process.env.PUBLIC_URL + PHOTOS[k].src}
                  width={PHOTOS[k].w}
                  height={PHOTOS[k].h}
                  alt={card.photoAlt}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption className="mono lbl">{label}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {card.body.map((line, i) => (
          <p key={i} className="body">
            {line}
          </p>
        ))}

        {card.roles && (
          <ol className="roles">
            {TEAM.map(([who, role, contact], i) => (
              <li key={who}>
                {/* Name and contacts share a row and wrap together, so a long
                    address drops to the next line still attached to the person
                    it belongs to rather than to the role below. */}
                <div className="whorow">
                  <p className="who">{who}</p>
                  {contact && (
                    <p className="contact mono">
                      {contact.mail && (
                        <a href={`mailto:${contact.mail}`}>
                          {/* Decoration only: the address is the link's name,
                              and a screen reader announcing "postbox" first
                              would just be in the way. */}
                          <MailIcon />
                          {contact.mail}
                        </a>
                      )}
                      {contact.ig && (
                        // Opens the app on a phone, the web profile elsewhere.
                        <a
                          href={`https://instagram.com/${contact.ig}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IgIcon />
                          @{contact.ig}
                        </a>
                      )}
                    </p>
                  )}
                </div>
                <p className="mono lbl">{role}</p>
                {/* Plain spans, not buttons: these look like the contact chips
                    above them and must not invite the same tap. The dotted
                    outline is reserved for the two things that actually go
                    somewhere. */}
                {/* Matched to TEAM by position: card.roles holds only the
                    translated skill lists, in the same order. */}
                <ul className="skills">
                  {card.roles[i].map((skill) => (
                    <li key={skill} className="mono">{skill}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}

        {card.map && (
          // A search rather than a pin: a query for the building lands right on
          // any map app without this having to carry coordinates it cannot be
          // checked against.
          //
          // Given the width of the card because it is the one thing this card
          // asks anyone to do. As a chip it sat among the addresses looking
          // like a footnote to them rather than the way out of the page.
          <a
            className="maplink"
            href={`https://map.naver.com/p/search/${encodeURIComponent(card.map)}`}
            target="_blank"
            rel="noreferrer"
          >
            <PinIcon />
            <span className="mono">{card.mapLabel}</span>
            <span className="mono away" aria-hidden="true">↗</span>
          </a>
        )}

        {/* Dates on their own line rather than beside anything: on a phone a
            second column would squeeze the address into four wrapped lines to
            make room for two short ones. They follow the map button because
            the address and the way to reach it belong together. */}
        {card.when && (
          <div className="when">
            <p className="mono lbl">{card.whenLabel}</p>
            {card.when.map((line) => (
              <p key={line} className="body">{line}</p>
            ))}
          </div>
        )}

        {/* Its own section below a rule rather than one more photograph in the
            run: the card holds two different things - where the piece is, and
            what is written beside it once you are standing there - and without
            the break they read as one list. */}
        {card.caption && PHOTOS[card.caption] && (
          <section className="sect">
            <h3 className="panel-title">{SHARED.captionHeading}</h3>
            <figure className="shot">
              <img
                src={process.env.PUBLIC_URL + PHOTOS[card.caption].src}
                width={PHOTOS[card.caption].w}
                height={PHOTOS[card.caption].h}
                alt={card.captionAlt}
                loading="lazy"
                decoding="async"
              />
            </figure>
          </section>
        )}

        {card.steps && (
          <ol className="steps">
            {STEP_KEYS.map((key, i) => {
              // Matched to STEP_KEYS by position: card.steps holds only the
              // translated title and sentence, in the same order.
              const [title, what] = card.steps[i];
              const num = String(i + 1).padStart(2, '0');
              const photo = PHOTOS[num];
              return (
                <li key={key}>
                  <p className="mono lbl">
                    {num} · {key}
                  </p>
                  <p className="steptitle">{title}</p>
                  {photo && (
                    <figure className="shot">
                      {/* width and height are the file's own, so the browser
                          holds the right space before it arrives - six photos
                          of mixed orientation would otherwise shove the text
                          down the page one load at a time. Lazy, because this
                          card is behind a tap and most visitors never open it. */}
                      <img
                        src={process.env.PUBLIC_URL + photo.src}
                        width={photo.w}
                        height={photo.h}
                        alt={title}
                        loading="lazy"
                        decoding="async"
                      />
                    </figure>
                  )}
                  <p className="body">{what}</p>
                </li>
              );
            })}
          </ol>
        )}

        {card.zones && <Zones copy={copy} />}

        {card.survey && <Survey copy={copy} onSent={() => setSent(true)} />}

        {card.colophon && (
          <dl className="colophon">
            {card.colophon.map(([k, v]) => (
              <div key={k}>
                <dt className="mono lbl">{k}</dt>
                <dd className="mono val">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function App() {
  const [open, setOpen] = useState(null);   // { idx, rect }
  const [lang, setLang] = useState('ko');
  const [held, setHeld] = useState(false);
  const copy = CONTENT[lang];

  // One clock for the whole page. The masthead breathes on the same beat as the
  // ring, so the screen reads as a single thing rather than two - and it stands
  // still while a panel is covering all of it.
  const ms = useElapsed(open === null);
  const s = glow(ms, held);

  // Silent while a panel is open: the canvas is covered, and buzzing under a
  // page someone is reading is just noise.
  useTick(ms, open === null && !held);

  // Crossing between the two speeds must not teleport the ring. The offset is
  // set so the position either side of the change is identical, and it
  // accumulates across every press and release.
  const off = useRef(0);
  const onHold = (next) => {
    if (next === held) return;
    off.current = off.current + rawTurns(ms, held) - rawTurns(ms, next);
    setHeld(next);
  };
  const turns = rawTurns(ms, held) + off.current;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="app">
      <header className="hdr">
        {/* The drawn wordmark, lit on the same beat as everything else. It was
            supplied as dark ink on a hatched white sheet; the scribbles are
            cut away and the strokes recoloured to the ivory, so what is left is
            the drawing itself with the page showing through it.
            The alt text carries the words for anyone who cannot see it. */}
        <img
          className="masthead"
          src={logo}
          alt={SHARED.masthead}
          style={{
            opacity: 0.78 + s * 0.22,
            filter: `drop-shadow(0 0 ${6 + s * 12}px rgba(239,236,228,${0.16 + s * 0.4}))`,
          }}
        />
      </header>

      <Canvas
        ms={ms}
        s={s}
        turns={turns}
        held={held}
        onHold={onHold}
        onOpen={(idx, rect) => setOpen({ idx, rect })}
      />

      {open !== null && (
        <Panel
          copy={copy}
          keys={CARD_KEYS[open.idx]}
          card={copy.cards[open.idx]}
          from={open.rect}
          onClose={() => setOpen(null)}
          onLang={() => setLang(lang === 'en' ? 'ko' : 'en')}
        />
      )}
    </div>
  );
}
