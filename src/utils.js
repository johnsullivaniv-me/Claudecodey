/**
 * utils.js — timing, easing, fade, rng, motion helpers
 * Exports: wait, lerp, clamp, easeInOut, rand, prefersReducedMotion, fadeIn, fadeOut
 */

export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * fadeIn — sets element opacity from 0 to 1 over ms milliseconds.
 * Returns a promise that resolves when done.
 */
export function fadeIn(el, ms) {
  return new Promise(resolve => {
    if (prefersReducedMotion() || ms <= 0) {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      resolve();
      return;
    }
    el.style.opacity = '0';
    el.style.visibility = 'visible';
    el.style.transition = `opacity ${ms}ms ease`;
    // Force reflow
    void el.offsetHeight;
    el.style.opacity = '1';
    setTimeout(resolve, ms);
  });
}

/**
 * fadeOut — sets element opacity from 1 to 0 over ms milliseconds.
 * Returns a promise that resolves when done.
 */
export function fadeOut(el, ms) {
  return new Promise(resolve => {
    if (prefersReducedMotion() || ms <= 0) {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      resolve();
      return;
    }
    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.visibility = 'hidden';
      resolve();
    }, ms);
  });
}
