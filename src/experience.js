/**
 * experience.js — DIRECTOR + entry point
 * Imports utils, copy, scenes, audio.
 * Runs the Start gate, timed phase sequence, rAF render loop,
 * line fades, transitions, Esc/skip.
 */

import { wait, fadeIn, fadeOut, prefersReducedMotion } from './utils.js';
import { buildScript } from './copy.js';
import { createRenderer } from './scenes.js';
import { createAudio } from './audio.js';

// ── DOM refs ─────────────────────────────────────────────────
const canvas      = document.getElementById('bg');
const startScreen = document.getElementById('start-screen');
const startBtn    = document.getElementById('start-btn');
const overlay     = document.getElementById('overlay');
const lineDisplay = document.getElementById('line-display');
const lineText    = document.getElementById('line-text');
const controls    = document.getElementById('controls');
const muteBtn     = document.getElementById('mute-btn');
const skipBtn     = document.getElementById('skip-btn');
const escHint     = document.getElementById('esc-hint');
const endCard     = document.getElementById('end-card');
const titleReturn = document.getElementById('title-return');
const restartBtnTitle = document.getElementById('restart-btn-title');
const restartBtnEnd   = document.getElementById('restart-btn-end');

// ── State ────────────────────────────────────────────────────
let renderer = null;
let audio    = null;
let rafId    = null;
let tStart   = null;
let running  = false;
let skipPhase = false;   // set true to jump to next phase
let escaped   = false;   // set true to exit to end card

// Clock tick state for the live-clock line
let clockInterval = null;

// ── rAF loop ─────────────────────────────────────────────────
function startRAF() {
  let prevT = null;
  function loop(now) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (tStart === null) tStart = now;
    const tSec  = (now - tStart) / 1000;
    const dtSec = prevT === null ? 0 : (now - prevT) / 1000;
    prevT = now;
    renderer.render(tSec, dtSec);
  }
  rafId = requestAnimationFrame(loop);
}

function stopRAF() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ── Resize ───────────────────────────────────────────────────
function onResize() {
  if (renderer) renderer.resize();
}
window.addEventListener('resize', onResize);

// ── Controls setup ───────────────────────────────────────────
function showControls() {
  controls.style.transition = 'opacity 0.8s ease';
  controls.style.opacity    = '0';
  controls.style.visibility = 'visible';
  controls.classList.remove('fade-hidden');
  requestAnimationFrame(() => {
    controls.style.opacity = '1';
  });
  escHint.style.transition = 'opacity 0.8s ease';
  escHint.style.opacity    = '0';
  escHint.style.visibility = 'visible';
  escHint.classList.remove('fade-hidden');
  requestAnimationFrame(() => {
    escHint.style.opacity = '1';
  });
}

function hideControls() {
  controls.style.transition = 'opacity 0.4s ease';
  controls.style.opacity = '0';
  escHint.style.opacity = '0';
  setTimeout(() => {
    controls.classList.add('fade-hidden');
    controls.style.visibility = 'hidden';
    escHint.classList.add('fade-hidden');
    escHint.style.visibility = 'hidden';
  }, 450);
}

muteBtn.addEventListener('click', () => {
  if (!audio) return;
  audio.mute();
  muteBtn.textContent = audio.isMuted() ? 'sound off' : 'sound on';
});

skipBtn.addEventListener('click', () => {
  skipPhase = true;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && running) {
    escaped = true;
    skipPhase = true;
  }
});

// ── Restart ──────────────────────────────────────────────────
function restartExperience() {
  // Hide end/return cards
  endCard.classList.remove('visible');
  titleReturn.classList.remove('visible');
  // Clean up old audio
  if (audio) {
    audio.stop();
    audio = null;
  }
  // Re-show start screen
  startScreen.style.display = 'flex';
  startScreen.style.opacity = '0';
  startScreen.style.transition = 'opacity 0.8s ease';
  requestAnimationFrame(() => {
    startScreen.style.opacity = '1';
  });
  // Renderer goes back to title
  if (renderer) {
    renderer.setScene('title', {});
  }
  tStart  = null;
  running = true;
  if (!rafId) startRAF();

  // Re-register the start button (was { once: true })
  startBtn.addEventListener('click', async () => {
    audio = createAudio();
    audio.start();
    startScreen.style.transition = 'opacity 0.9s ease';
    startScreen.style.opacity    = '0';
    await wait(900);
    startScreen.style.display = 'none';
    await runExperience();
  }, { once: true });
}

restartBtnTitle.addEventListener('click', restartExperience);
restartBtnEnd.addEventListener('click', restartExperience);

// ── Line display helpers ──────────────────────────────────────
const FADE_MS = 900;

function stopClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}

function formatClock(d) {
  const h  = d.getHours();
  const m  = String(d.getMinutes()).padStart(2, '0');
  const s  = String(d.getSeconds()).padStart(2, '0');
  return `It is ${h}:${m}:${s}.`;
}

/**
 * Display a single line, hold it, then fade out.
 * Returns a promise that resolves when done (or skipPhase flips).
 */
async function showLine(line) {
  stopClock();
  lineText.classList.remove('is-clock');

  if (line.liveClock) {
    // Live ticking clock
    lineText.classList.add('is-clock');
    lineText.textContent = formatClock(new Date());
    clockInterval = setInterval(() => {
      lineText.textContent = formatClock(new Date());
    }, 1000);
  } else {
    lineText.textContent = line.text;
  }

  // Fade in
  lineDisplay.style.transition = `opacity ${FADE_MS}ms ease`;
  lineDisplay.style.opacity    = '0';
  lineDisplay.style.visibility = 'visible';
  lineDisplay.classList.remove('fade-hidden');
  await new Promise(r => setTimeout(r, 20)); // small tick for reflow
  lineDisplay.style.opacity = '1';
  await wait(FADE_MS);

  // Hold
  const holdMs = line.hold || 4000;
  const holdStart = performance.now();
  await new Promise(resolve => {
    function checkSkip() {
      if (skipPhase) { resolve(); return; }
      if (performance.now() - holdStart >= holdMs) { resolve(); return; }
      requestAnimationFrame(checkSkip);
    }
    checkSkip();
  });

  // Fade out
  lineDisplay.style.transition = `opacity ${FADE_MS}ms ease`;
  lineDisplay.style.opacity    = '0';
  await wait(FADE_MS);
  lineDisplay.style.visibility = 'hidden';
  lineDisplay.classList.add('fade-hidden');
  stopClock();
}

// ── Phase runner ──────────────────────────────────────────────
async function runPhase(phase) {
  skipPhase = false;

  // Set scene
  renderer.setScene(phase.scene, phase.sceneOpts || {});
  audio.setIntensity(phase.audioIntensity);

  // Bell on entry for some phases
  if (['present', 'improbability', 'return'].includes(phase.id)) {
    audio.bell();
  }

  // Show lines
  for (const line of phase.lines) {
    if (escaped) break;
    await showLine(line);
    if (escaped) break;
    // Brief pause between lines
    if (!skipPhase && !escaped) {
      await wait(prefersReducedMotion() ? 100 : 500);
    }
  }

  skipPhase = false;
}

// ── Exit to end card ─────────────────────────────────────────
async function showEndCard() {
  stopClock();
  // Hide line display
  lineDisplay.classList.add('fade-hidden');
  lineDisplay.style.visibility = 'hidden';
  hideControls();
  // Fade to end card
  endCard.style.opacity = '0';
  endCard.classList.add('visible');
  endCard.style.transition = 'opacity 1.2s ease';
  await wait(50);
  endCard.style.opacity = '1';
  audio.stop();
}

// ── Final title-return card ───────────────────────────────────
async function showTitleReturn() {
  stopClock();
  lineDisplay.classList.add('fade-hidden');
  lineDisplay.style.visibility = 'hidden';
  hideControls();
  renderer.setScene('title', {});
  titleReturn.style.opacity = '0';
  titleReturn.classList.add('visible');
  titleReturn.style.transition = 'opacity 1.4s ease';
  await wait(50);
  titleReturn.style.opacity = '1';
  audio.stop();
}

// ── Main experience ───────────────────────────────────────────
async function runExperience() {
  escaped   = false;
  skipPhase = false;
  const script = buildScript(new Date());

  showControls();

  for (const phase of script) {
    if (escaped) break;
    await runPhase(phase);
    if (escaped) break;
    // Breath between phases
    if (!escaped) {
      await wait(prefersReducedMotion() ? 200 : 1200);
    }
  }

  if (escaped) {
    await showEndCard();
  } else {
    await showTitleReturn();
  }
}

// ── Start gate ───────────────────────────────────────────────
function init() {
  renderer = createRenderer(canvas);
  renderer.resize();
  renderer.setScene('title', {});
  running = true;
  startRAF();

  startBtn.addEventListener('click', async () => {
    // Gesture gate: init audio here
    audio = createAudio();
    audio.start();

    // Fade out start screen
    startScreen.style.transition = 'opacity 0.9s ease';
    startScreen.style.opacity    = '0';
    await wait(900);
    startScreen.style.display = 'none';

    // Begin
    await runExperience();
  }, { once: true });
}

// Boot
init();
