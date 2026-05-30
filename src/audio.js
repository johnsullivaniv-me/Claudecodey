/**
 * audio.js — Web Audio ambient engine + mute
 * Exports: createAudio() → { start(), stop(), mute(force?), isMuted(), bell(), setIntensity(x) }
 * Everything generated — no audio files, no external refs.
 */

export function createAudio() {
  let ctx = null;
  let masterGain = null;
  let droneGains = [];
  let padGain = null;
  let lfoNode = null;
  let filterNode = null;
  let _muted = false;
  let _started = false;
  let _targetIntensity = 0.15;

  function _buildGraph() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain (fades in on start)
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Low-pass filter — intensity modulates cutoff
    filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(320, ctx.currentTime);
    filterNode.Q.setValueAtTime(0.8, ctx.currentTime);
    filterNode.connect(masterGain);

    // LFO — very slow, modulates filter cutoff for subtle movement
    lfoNode = ctx.createOscillator();
    lfoNode.type = 'sine';
    lfoNode.frequency.setValueAtTime(0.04, ctx.currentTime); // ~25 s cycle
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(40, ctx.currentTime);
    lfoNode.connect(lfoGain);
    lfoGain.connect(filterNode.frequency);
    lfoNode.start();

    // Drone oscillators: root (65 Hz ≈ C2), fifth (97.5 Hz), octave (130 Hz)
    const freqs = [65, 97.5, 130];
    const detunes = [0, 3, -4]; // slight detuning for richness
    const types = ['sine', 'triangle', 'sine'];
    const levels = [0.32, 0.18, 0.12];

    droneGains = freqs.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = types[i];
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.detune.setValueAtTime(detunes[i], ctx.currentTime);

      const g = ctx.createGain();
      g.gain.setValueAtTime(levels[i], ctx.currentTime);
      osc.connect(g);
      g.connect(filterNode);
      osc.start();
      return g;
    });

    // Higher pad — faint, for intensity build
    const padOsc = ctx.createOscillator();
    padOsc.type = 'sine';
    padOsc.frequency.setValueAtTime(260, ctx.currentTime); // C4
    padOsc.detune.setValueAtTime(7, ctx.currentTime);
    padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0, ctx.currentTime);
    padOsc.connect(padGain);
    padGain.connect(filterNode);
    padOsc.start();
  }

  function start() {
    if (_started) return;
    _started = true;
    _buildGraph();
    // Fade master gain in over 2.5 s
    masterGain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.5);
  }

  function stop() {
    if (!_started || !ctx) return;
    const t = ctx.currentTime;
    masterGain.gain.linearRampToValueAtTime(0, t + 2.0);
    setTimeout(() => {
      try { ctx.close(); } catch (_) {}
    }, 2500);
  }

  function mute(force) {
    if (!_started || !ctx) return;
    if (force !== undefined) {
      _muted = !!force;
    } else {
      _muted = !_muted;
    }
    const t = ctx.currentTime;
    if (_muted) {
      masterGain.gain.linearRampToValueAtTime(0, t + 0.3);
    } else {
      masterGain.gain.linearRampToValueAtTime(0.55, t + 0.5);
    }
  }

  function isMuted() {
    return _muted;
  }

  function bell() {
    if (!_started || !ctx) return;
    // A single soft sine tone, slow exponential decay
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, ctx.currentTime); // soft A4
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.0);
    osc.connect(env);
    env.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 4.5);
  }

  function setIntensity(x) {
    if (!_started || !ctx) { _targetIntensity = x; return; }
    _targetIntensity = x;
    const t = ctx.currentTime;
    const clampedX = Math.max(0, Math.min(1, x));

    // Filter cutoff rises with intensity (320 → 1800 Hz range)
    const cutoff = 320 + clampedX * 1480;
    filterNode.frequency.linearRampToValueAtTime(cutoff, t + 3.0);

    // Pad emerges at higher intensities
    const padLevel = clampedX > 0.4 ? (clampedX - 0.4) / 0.6 * 0.09 : 0;
    padGain.gain.linearRampToValueAtTime(padLevel, t + 3.0);

    // LFO depth also scales
    // (Already connected; this is fine as-is)
  }

  return { start, stop, mute, isMuted, bell, setIntensity };
}
