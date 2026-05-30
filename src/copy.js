/**
 * copy.js — authored script + live-moment resolution
 * Exports: buildScript(now = new Date()) → ordered array of phase objects
 * Each phase: { id, scene, audioIntensity, lines: [ { text, hold, live? } ] }
 */

function greeting(now) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function longDate(now) {
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function buildScript(now = new Date()) {
  const greet = greeting(now);
  const dateStr = longDate(now);

  return [
    // ── PHASE: breath ──────────────────────────────────────────────
    {
      id: 'breath',
      scene: 'breath',
      audioIntensity: 0.15,
      lines: [
        { text: `${greet}.`, hold: 3500 },
        { text: 'Before anything else, let\'s just breathe. Three slow breaths, together.', hold: 5000 },
        { text: 'In…', hold: 4000, breathIn: true },
        { text: '…and out.', hold: 4000, breathOut: true },
        { text: 'In…', hold: 4000, breathIn: true },
        { text: '…and out.', hold: 4000, breathOut: true },
        { text: 'In…', hold: 4000, breathIn: true },
        { text: '…and out.', hold: 4000, breathOut: true },
        { text: 'Good.', hold: 3500 },
      ],
    },

    // ── PHASE: present ─────────────────────────────────────────────
    {
      id: 'present',
      scene: 'present',
      audioIntensity: 0.3,
      lines: [
        { text: 'The past is memory. It\'s gone.', hold: 4500 },
        { text: 'The future is imagination. It isn\'t here yet.', hold: 4500 },
        { text: 'There is only ever this — the present moment.', hold: 5000 },
        {
          text: 'Right now, reading this, you are the one place in the whole universe where this exact instant is being lived.',
          hold: 6000,
        },
        // live clock — special marker; experience.js will render a live ticking clock
        { text: 'It is {CLOCK}.', hold: 6000, liveClock: true },
        { text: '…and now that second is gone forever. And this one. And this one.', hold: 5500 },
      ],
    },

    // ── PHASE: improbability ───────────────────────────────────────
    {
      id: 'improbability',
      scene: 'improbability',
      audioIntensity: 0.5,
      lines: [
        { text: 'For you to exist, an unbroken chain had to hold.', hold: 5000 },
        {
          text: 'Every ancestor you\'ve ever had — back through humans, and the creatures before them, all the way to the first living cell — survived long enough to pass life on.',
          hold: 7000,
        },
        { text: 'Not one link broke. Across nearly four billion years.', hold: 5500 },
        { text: 'The chance of you — this exact you — was almost nothing.', hold: 5000 },
        { text: 'And yet. Here you are.', hold: 4500 },
      ],
    },

    // ── PHASE: scale ───────────────────────────────────────────────
    {
      id: 'scale',
      scene: 'scale',
      audioIntensity: 0.65,
      lines: [
        { text: 'You\'re standing on a rock that\'s spinning a thousand miles an hour…', hold: 5000 },
        { text: '…racing around a star at sixty-seven thousand miles an hour…', hold: 5000 },
        { text: '…and that whole star, with you on it, is sweeping through the galaxy at nearly half a million miles an hour…', hold: 5500 },
        { text: '…on an orbit so vast it takes two hundred million years just to come back around once.', hold: 5500 },
        { text: '…in a galaxy of a hundred billion stars, one of two trillion galaxies.', hold: 5500 },
        { text: 'From far enough away, you can\'t be seen at all.', hold: 4500 },
        {
          text: 'And from right here — you are the universe, briefly awake, looking back at itself.',
          hold: 6000,
        },
      ],
    },

    // ── PHASE: weeks ───────────────────────────────────────────────
    {
      id: 'weeks',
      scene: 'weeks',
      audioIntensity: 0.45,
      // pass the current date so the scene can compute the representative dot
      sceneOpts: { now },
      lines: [
        { text: 'A long life is about four thousand weeks.', hold: 5000 },
        { text: 'Every dot here is one week.', hold: 4000 },
        { text: 'You don\'t know which one is your last. None of us do.', hold: 5500 },
        { text: 'And that\'s exactly why this one — right now — matters.', hold: 6000 },
      ],
    },

    // ── PHASE: return ──────────────────────────────────────────────
    {
      id: 'return',
      scene: 'return',
      audioIntensity: 0.1,
      lines: [
        { text: 'So. Here you are.', hold: 4000 },
        { text: 'Alive. Awake. Breathing. Reading these words.', hold: 4500 },
        { text: `On ${dateStr}.`, hold: 4500 },
        { text: 'This is your life. Not someday. Now. This.', hold: 5000 },
        {
          text: 'Nothing is required of you. You don\'t have to fix anything, or become anyone.',
          hold: 5500,
        },
        { text: 'You just get to be here, for a little while.', hold: 5000 },
        { text: 'In a moment this will end and you\'ll go back to your day.', hold: 5000 },
        { text: 'When you do — look up. Look around. Really look.', hold: 5000 },
        { text: 'You are still here.', hold: 6000 },
      ],
    },
  ];
}
