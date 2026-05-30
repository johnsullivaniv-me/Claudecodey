/**
 * scenes.js — generative canvas rendering per scene
 * Exports: createRenderer(canvas) → { setScene(name, opts), render(tSec, dtSec), resize() }
 * Scene names: title, breath, present, improbability, scale, weeks, return
 * Pure canvas 2D, devicePixelRatio-aware, no external assets.
 */

import { lerp, clamp, easeInOut, rand, prefersReducedMotion } from './utils.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let _scene = 'title';
  let _opts = {};
  let _reduced = false;

  // Shared particle pools / state per scene (re-init on setScene)
  let state = {};

  // Text-readability dimming (eased toward target each frame).
  // The director raises this while a line is on screen so bright
  // central elements recede behind the text.
  let _dim = 0, _dimTarget = 0;
  let _lastT = 0;

  // Directed breathing: when the "In…/…and out." lines are showing,
  // the director drives the circle so inhale = expand, exhale = contract.
  let _breathDirected = false;
  let _breathFrom = 0, _breathTo = 0, _breathStart = 0, _breathDur = 4, _breathT = 0;

  function setDim(v) { _dimTarget = clamp(v, 0, 1); }

  function setBreath(dir, durSec) {
    _breathDirected = true;
    _breathFrom = _breathT;
    _breathTo = dir === 'in' ? 1 : 0;
    _breathStart = _lastT;
    _breathDur = durSec || 4;
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    _initScene(_scene, _opts);
  }

  function setScene(name, opts) {
    _scene = name;
    _opts = opts || {};
    _reduced = prefersReducedMotion();
    if (name === 'breath') {
      // Start autonomous; the director takes over on the In/out lines.
      _breathDirected = false;
      _breathT = 0;
    }
    _initScene(name, _opts);
  }

  // ── Scene initialisers ────────────────────────────────────
  function _initScene(name, opts) {
    switch (name) {
      case 'title':      state = _initTitle(); break;
      case 'breath':     state = _initBreath(); break;
      case 'present':    state = _initPresent(); break;
      case 'improbability': state = _initImprobability(); break;
      case 'scale':      state = _initScale(); break;
      case 'weeks':      state = _initWeeks(opts); break;
      case 'return':     state = _initReturn(); break;
      default:           state = _initTitle(); break;
    }
  }

  // ── title ─────────────────────────────────────────────────
  function _initTitle() {
    return { dotRadius: 4, pulse: 0 };
  }

  function _renderTitle(t) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const pulse = _reduced ? 0.5 : (Math.sin(t * 1.1) * 0.5 + 0.5);
    const r = 4 + pulse * 2.5;
    const alpha = 0.55 + pulse * 0.3;
    // Soft glow ring
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 6);
    grd.addColorStop(0, `rgba(200,200,190,${alpha * 0.18})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 6, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    // Dot
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,220,210,${alpha})`;
    ctx.fill();
  }

  // ── breath ────────────────────────────────────────────────
  function _initBreath() {
    return { phase: 0 };
  }

  function _renderBreath(t) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    let breathT;
    if (_reduced) {
      breathT = 0.55; // static mid-breath
    } else if (_breathDirected) {
      // Driven by the In/out lines: inhale expands, exhale contracts.
      const p = clamp((t - _breathStart) / _breathDur, 0, 1);
      breathT = lerp(_breathFrom, _breathTo, easeInOut(p));
    } else {
      // Autonomous 8s cycle (4s in, 4s out) until the director takes over.
      const cycle = (t % 8) / 8;
      breathT = cycle < 0.5 ? easeInOut(cycle * 2) : easeInOut(1 - (cycle - 0.5) * 2);
    }
    _breathT = breathT;

    // Dim bright central elements while a line is on screen (readability).
    const dimK = 1 - _dim * 0.82;

    const baseR = Math.min(W, H) * 0.06;
    const maxR = Math.min(W, H) * 0.18;
    const r = baseR + (maxR - baseR) * breathT;
    const alpha = (0.15 + breathT * 0.2) * dimK;

    // Outer glow
    const grd = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3.5);
    grd.addColorStop(0, `rgba(180,200,210,${alpha * 0.5})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Circle rim
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200,215,220,${(0.35 + breathT * 0.35) * dimK})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Inner soft fill
    const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    ig.addColorStop(0, `rgba(190,210,220,${alpha * 0.6})`);
    ig.addColorStop(1, `rgba(150,180,195,${alpha * 0.1})`);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = ig;
    ctx.fill();
  }

  // ── present ───────────────────────────────────────────────
  function _initPresent() {
    const N = _reduced ? 60 : 220;
    const cx = W / 2, cy = H / 2;
    const particles = [];
    for (let i = 0; i < N; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(60, Math.min(W, H) * 0.48);
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        ox: cx + Math.cos(angle) * dist,
        oy: cy + Math.sin(angle) * dist,
        r: rand(0.8, 2.2),
        alpha: rand(0.08, 0.35),
        speed: rand(0.008, 0.025),
        drift: rand(-0.4, 0.4),
      });
    }
    return { particles, cx, cy };
  }

  function _renderPresent(t) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);
    const { particles, cx, cy } = state;
    for (const p of particles) {
      if (!_reduced) {
        // Drift toward center over time with gentle oscillation
        const progress = clamp(t * p.speed, 0, 1);
        const ease = easeInOut(progress);
        p.x = lerp(p.ox, cx + Math.sin(t * 0.3 + p.drift) * 8, ease * 0.6);
        p.y = lerp(p.oy, cy + Math.cos(t * 0.25 + p.drift) * 8, ease * 0.6);
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,190,${p.alpha})`;
      ctx.fill();
    }
    // Bright center point = now (dimmed while text is on screen)
    const dimK = 1 - _dim * 0.82;
    const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
    pg.addColorStop(0, `rgba(240,235,220,${0.9 * dimK})`);
    pg.addColorStop(0.3, `rgba(220,215,200,${0.35 * dimK})`);
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,250,235,${0.95 * dimK})`;
    ctx.fill();
  }

  // ── improbability ─────────────────────────────────────────
  function _initImprobability() {
    const N = _reduced ? 300 : 1800;
    const dots = [];
    for (let i = 0; i < N; i++) {
      dots.push({
        x: rand(0, W),
        y: rand(0, H),
        r: rand(0.4, 1.4),
        alpha: rand(0.04, 0.18),
        twinkleSpeed: rand(0.3, 1.2),
        twinklePhase: rand(0, Math.PI * 2),
      });
    }
    const youX = W / 2 + rand(-30, 30);
    const youY = H / 2 + rand(-20, 20);
    return { dots, youX, youY, ignited: false, igniteT: -1 };
  }

  function _renderImprobability(t) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, W, H);
    const { dots, youX, youY } = state;
    for (const d of dots) {
      let a = d.alpha;
      if (!_reduced) {
        a *= 0.7 + 0.3 * Math.sin(t * d.twinkleSpeed + d.twinklePhase);
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,190,${a})`;
      ctx.fill();
    }
    // The bright "you" dot ignites softly
    const igniteProgress = _reduced ? 1 : clamp(t / 4, 0, 1);
    const youAlpha = easeInOut(igniteProgress);
    const youR = 2 + youAlpha * 3;
    const grd = ctx.createRadialGradient(youX, youY, 0, youX, youY, youR * 10);
    grd.addColorStop(0, `rgba(255,248,220,${youAlpha * 0.85})`);
    grd.addColorStop(0.2, `rgba(220,200,160,${youAlpha * 0.35})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(youX, youY, youR * 10, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(youX, youY, youR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,252,230,${youAlpha})`;
    ctx.fill();
  }

  // ── scale ─────────────────────────────────────────────────
  function _initScale() {
    const N = _reduced ? 120 : 500;
    const stars = [];
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < N; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(10, Math.min(W, H) * 0.6);
      stars.push({
        angle,
        dist,
        baseDist: dist,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        r: rand(0.5, 1.8),
        alpha: rand(0.1, 0.55),
        speed: rand(0.002, 0.012),
      });
    }
    return { stars, cx, cy, rings: [] };
  }

  function _renderScale(t) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, W, H);
    const { stars, cx, cy } = state;

    // Slow expansion
    const zoom = _reduced ? 1 : (1 + Math.sin(t * 0.18) * 0.08);

    for (const s of stars) {
      if (!_reduced) {
        s.dist = s.baseDist * zoom + t * s.speed * 18;
        if (s.dist > Math.min(W, H) * 0.7) s.dist = rand(2, 20);
        s.x = cx + Math.cos(s.angle) * s.dist;
        s.y = cy + Math.sin(s.angle) * s.dist;
      }
      const twinkle = _reduced ? s.alpha : s.alpha * (0.7 + 0.3 * Math.sin(t * 0.8 + s.angle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,210,200,${twinkle})`;
      ctx.fill();
    }

    // Rings expanding outward
    if (!_reduced) {
      for (let i = 0; i < 3; i++) {
        const ringT = ((t * 0.12 + i * 0.33) % 1);
        const ringR = ringT * Math.min(W, H) * 0.55;
        const ringA = (1 - ringT) * 0.06;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180,185,200,${ringA})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Center glow = here (dimmed while text is on screen)
    const dimK = 1 - _dim * 0.82;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    cg.addColorStop(0, `rgba(240,238,225,${0.7 * dimK})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,252,235,${0.92 * dimK})`;
    ctx.fill();
  }

  // ── weeks ─────────────────────────────────────────────────
  function _initWeeks(opts) {
    // ~4000 dots in a grid
    const TOTAL = 4000;
    const COLS = 80;
    const ROWS = Math.ceil(TOTAL / COLS); // 50
    const dotSpacing = Math.min(W / (COLS + 2), H / (ROWS + 2), 9);
    const dotR = dotSpacing * 0.28;
    const gridW = COLS * dotSpacing;
    const gridH = ROWS * dotSpacing;
    const startX = (W - gridW) / 2 + dotSpacing / 2;
    const startY = (H - gridH) / 2 + dotSpacing / 2;

    // Represent current week via ISO week of year (1–52) as pulse dot
    const now = (opts && opts.now) ? opts.now : new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / 86400000);
    const weekOfYear = Math.floor(dayOfYear / 7); // 0-based, 0–51
    // Map into the grid: treat as a horizontal position within the middle row band
    const pulseIndex = clamp(Math.round(COLS * 25 + weekOfYear), 0, TOTAL - 1);

    const dots = [];
    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      dots.push({
        x: startX + col * dotSpacing,
        y: startY + row * dotSpacing,
        r: dotR,
        i,
        revealT: rand(0, 1), // staggered reveal
      });
    }
    return { dots, pulseIndex, startT: null };
  }

  function _renderWeeks(t) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, W, H);
    const { dots, pulseIndex } = state;
    if (state.startT === null) state.startT = t;
    const elapsed = t - state.startT;

    for (const d of dots) {
      const isPulse = d.i === pulseIndex;
      let alpha;
      if (_reduced) {
        alpha = isPulse ? 0.85 : 0.12;
      } else {
        const revealProgress = clamp((elapsed - d.revealT * 3.5) / 1.5, 0, 1);
        alpha = easeInOut(revealProgress) * (isPulse ? 0.85 : 0.12);
      }
      if (isPulse) {
        // Soft pulse on the current week
        const pulse = _reduced ? 0.85 : (0.7 + 0.3 * Math.sin(t * 2.2));
        const pg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 5);
        pg.addColorStop(0, `rgba(220,210,175,${pulse * alpha})`);
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235,225,190,${pulse})`;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,180,170,${alpha})`;
        ctx.fill();
      }
    }
  }

  // ── return ────────────────────────────────────────────────
  function _initReturn() {
    const cx = W / 2, cy = H / 2;
    // Soft glowing dot — same as title but even warmer
    return { cx, cy };
  }

  function _renderReturn(t) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, W, H);
    const { cx, cy } = state;
    const pulse = _reduced ? 0.5 : (Math.sin(t * 0.65) * 0.5 + 0.5);
    const r = 5 + pulse * 3;
    const alpha = 0.45 + pulse * 0.35;

    // Very wide warm glow
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.38);
    grd.addColorStop(0, `rgba(180,165,130,${alpha * 0.18})`);
    grd.addColorStop(0.4, `rgba(140,125,100,${alpha * 0.08})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(W, H) * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Dot glow (dimmed while text is on screen)
    const dimK = 1 - _dim * 0.82;
    const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 7);
    dg.addColorStop(0, `rgba(220,205,170,${alpha * 0.55 * dimK})`);
    dg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 7, 0, Math.PI * 2);
    ctx.fillStyle = dg;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(235,220,185,${alpha * dimK})`;
    ctx.fill();
  }

  // ── Dispatch render ───────────────────────────────────────
  function render(tSec, dtSec) {
    if (W === 0 || H === 0) return;
    _lastT = tSec;
    // Ease the dim toward its target (frame-rate independent).
    const k = dtSec > 0 ? Math.min(1, dtSec * 3.5) : 1;
    _dim += (_dimTarget - _dim) * k;
    switch (_scene) {
      case 'title':         _renderTitle(tSec); break;
      case 'breath':        _renderBreath(tSec); break;
      case 'present':       _renderPresent(tSec); break;
      case 'improbability': _renderImprobability(tSec); break;
      case 'scale':         _renderScale(tSec); break;
      case 'weeks':         _renderWeeks(tSec); break;
      case 'return':        _renderReturn(tSec); break;
      default:              _renderTitle(tSec); break;
    }
  }

  return { setScene, render, resize, setDim, setBreath };
}
