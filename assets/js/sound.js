/* Sound: a small synthesiser built on the Web Audio API, so the site ships no audio files.
   It stays off until the visitor turns it on (the choice is remembered), and browsers hold any sound back
   until a tap, click or key press. Everything is tuned to A minor pentatonic over a low A drone, so cues
   that overlap still sound together. The site calls the cues below; while sound is off they do nothing. */
(() => {
  const KEY = "sound";
  let ctx = null, master, dry, fx, verb, droneLp, air, airGain, hum = null, restTimer = 0, lastTick = 0;
  // Cues run through one bus, so their level against the quiet bed is set in one place.
  const FX = 2.5;
  const lastForm = {};
  let on = false;
  try { on = localStorage.getItem(KEY) === "on"; } catch {}

  // Semitones from A3 (220 Hz); the scale walks A minor pentatonic upward.
  const hz = (semi) => 220 * Math.pow(2, semi / 12);
  const PENTA = [0, 3, 5, 7, 10];
  const scale = (step) => hz(PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5));

  function noiseBuffer(seconds) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  // A generated hall: stereo noise that dies away, used as the reverb's impulse response.
  function hall(seconds) {
    const len = ctx.sampleRate * seconds, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return b;
  }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp);
    dry = ctx.createGain();
    dry.connect(master);
    fx = ctx.createGain();
    fx.gain.value = FX;
    fx.connect(dry);
    verb = ctx.createConvolver();
    verb.buffer = hall(3);
    const wet = ctx.createGain();
    wet.gain.value = 0.34;
    verb.connect(wet);
    wet.connect(master);

    // The bed: a soft drone on A and E. Scrolling opens its filter and raises a breath of air.
    droneLp = ctx.createBiquadFilter();
    droneLp.type = "lowpass";
    droneLp.frequency.value = 300;
    const dg = ctx.createGain();
    dg.gain.value = 0.018;
    droneLp.connect(dg);
    dg.connect(dry);
    dg.connect(verb);
    [[55, 0, "triangle"], [82.41, 3, "sine"], [110, -6, "triangle"], [110, 7, "sine"]].forEach(([f, cents, type]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(droneLp);
      o.start();
    });
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 0.06;
    depth.gain.value = 80;
    lfo.connect(depth);
    depth.connect(droneLp.frequency);
    lfo.start();
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(2);
    n.loop = true;
    air = ctx.createBiquadFilter();
    air.type = "bandpass";
    air.frequency.value = 700;
    air.Q.value = 0.7;
    airGain = ctx.createGain();
    airGain.gain.value = 0;
    n.connect(air);
    air.connect(airGain);
    airGain.connect(dry);
    n.start();
    return true;
  }

  const ready = () => on && ctx && ctx.state === "running";
  const send = (node, amount) => {
    node.connect(fx);
    if (amount > 0) {
      const s = ctx.createGain();
      s.gain.value = amount * FX;
      node.connect(s);
      s.connect(verb);
    }
  };

  /* ---------- Voices ---------- */
  // A soft bell: a sine with a quieter, faster-fading inharmonic partial on top.
  function bell(freq, { at = 0, gain = 0.07, decay = 2.4, verbAmt = 0.7, shine = 0.22 } = {}) {
    const t = ctx.currentTime + at, out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    o.connect(out);
    const p = ctx.createOscillator(), pg = ctx.createGain();
    p.frequency.value = freq * 2.76;
    pg.gain.setValueAtTime(shine, t);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.3);
    p.connect(pg);
    pg.connect(out);
    send(out, verbAmt);
    [o, p].forEach((x) => { x.start(t); x.stop(t + decay + 0.05); });
  }
  // A short pluck: a triangle wave through a closing filter.
  function pluck(freq, { at = 0, gain = 0.05, decay = 0.4 } = {}) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    f.type = "lowpass";
    f.frequency.setValueAtTime(freq * 8, t);
    f.frequency.exponentialRampToValueAtTime(freq * 1.2, t + decay);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(f);
    f.connect(g);
    send(g, 0.5);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
  // Filtered noise whose band moves from one frequency to another: whooshes and falls.
  function sweep({ at = 0, from = 400, to = 3000, dur = 0.6, gain = 0.05, q = 1.2, verbAmt = 0.4 } = {}) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(dur + 0.1);
    f.type = "bandpass";
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    send(g, verbAmt);
    s.start(t);
    s.stop(t + dur + 0.05);
  }
  // A low thump: a sine dropping in pitch.
  function thump({ at = 0, gain = 0.2 } = {}) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g);
    send(g, 0.2);
    o.start(t);
    o.stop(t + 0.65);
  }
  const chord = (semis, opts = {}, gap = 0.07) => semis.forEach((s, i) => bell(hz(s), { ...opts, at: (opts.at || 0) + i * gap }));

  /* ---------- Cues the site calls ---------- */
  const SHAPES = {
    name: () => chord([-12, 7, 12, 19], { gain: 0.06, decay: 3.2 }, 0.09),
    wave: () => chord([5, 12, 17], { gain: 0.05, decay: 2.6 }, 0.11),
    portrait: () => chord([3, 10, 19], { gain: 0.055, decay: 2.8 }, 0.08),
    hello: () => chord([-2, 5, 12, 15], { gain: 0.055, decay: 3 }, 0.1),
    emblem: () => chord([7, 14], { gain: 0.05 }, 0.08),
    pipeline: () => chord([-12, -5], { gain: 0.06, decay: 3.4, shine: 0.1 }, 0.15),
  };
  const Sound = {
    get on() { return on; },
    // A shape has formed; an optional index picks a note, so the project gallery plays a rising line.
    form(name, index) {
      if (!ready()) return;
      const now = performance.now();
      if (lastForm[name] !== undefined && now - lastForm[name] < 500) return;
      lastForm[name] = now;
      if (name.startsWith("emblem:")) bell(scale(5 + (index || 0)), { gain: 0.06, decay: 2.2 });
      else SHAPES[name]?.();
    },
    // SecuriTron chapters: learn, scan (eight scanners), triage (noise falls, the signal rings), report.
    chapter(n) {
      if (!ready()) return;
      if (n === 0) SHAPES.pipeline();
      else if (n === 1) for (let i = 0; i < 8; i++) pluck(scale(5 + i), { at: i * 0.055, gain: 0.04 });
      else if (n === 2) { sweep({ from: 2400, to: 160, dur: 1.1, gain: 0.045, q: 2 }); bell(hz(24), { at: 0.35, gain: 0.05, decay: 2.6 }); }
      else if (n === 3) chord([0, 7, 14, 16], { gain: 0.06, decay: 3.6 }, 0.06);
    },
    // Scroll speed in pixels per frame.
    velocity(v) {
      if (!ready()) return;
      const s = Math.min(1, v / 60), t = ctx.currentTime;
      airGain.gain.setTargetAtTime(s * 0.1, t, 0.08);
      air.frequency.setTargetAtTime(600 + s * 2200, t, 0.1);
      droneLp.frequency.setTargetAtTime(300 + s * 900, t, 0.15);
      clearTimeout(restTimer);
      restTimer = setTimeout(() => {
        if (!ctx) return;
        const r = ctx.currentTime;
        airGain.gain.setTargetAtTime(0, r, 0.35);
        air.frequency.setTargetAtTime(700, r, 0.4);
        droneLp.frequency.setTargetAtTime(300, r, 0.6);
      }, 140);
    },
    // Press and hold: a hum that rises while the well pulls; letting go throws it out with a whoosh and a thump.
    hold() {
      if (!ready() || hum) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(55, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 2.5);
      f.type = "lowpass";
      f.Q.value = 6;
      f.frequency.setValueAtTime(140, t);
      f.frequency.exponentialRampToValueAtTime(1400, t + 2.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.8);
      o.connect(f);
      f.connect(g);
      send(g, 0.4);
      o.start(t);
      hum = { o, g };
    },
    release() {
      if (!hum) return;
      const { o, g } = hum, t = ctx.currentTime;
      hum = null;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.05);
      o.stop(t + 0.4);
      if (!ready()) return;
      sweep({ from: 3000, to: 200, dur: 0.9, gain: 0.07, q: 0.8 });
      thump({ gain: 0.18 });
    },
    // A tap or click: a droplet.
    ripple() {
      if (!ready()) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(1100, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g);
      send(g, 0.8);
      o.start(t);
      o.stop(t + 0.35);
    },
    // Hovering a link or button.
    tick() {
      if (!ready()) return;
      const now = performance.now();
      if (now - lastTick < 60) return;
      lastTick = now;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 2640;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g);
      g.connect(fx);
      o.start(t);
      o.stop(t + 0.06);
    },
    // The photograph surfacing from the particles.
    shimmer() {
      if (!ready()) return;
      [12, 15, 19, 22, 24].forEach((s, i) => bell(hz(s), { at: i * 0.045, gain: 0.025, decay: 1.6, shine: 0.1 }));
    },
    // Page transitions.
    whoosh() {
      if (!ready()) return;
      sweep({ from: 300, to: 3200, dur: 0.75, gain: 0.12, q: 0.9 });
    },
  };

  /* ---------- Switching on and off ---------- */
  function fadeTo(v, time = 0.8) {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(v, t, time / 3);
  }
  // Starting needs a user gesture; resume() quietly waits when the browser has not had one yet.
  function start() {
    if (!ctx && !build()) return;
    const go = () => fadeTo(0.9);
    if (ctx.state === "running") go();
    else ctx.resume().then(go, () => {});
  }
  function stop() {
    if (!ctx) return;
    fadeTo(0, 0.3);
    setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 450);
  }
  function set(value, buttons) {
    on = value;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(on)));
    if (on) start();
    else stop();
  }
  // Wires the header switches. With sound already chosen on, the first gesture on the page starts it.
  Sound.init = (buttons) => {
    if (!buttons.length) return;
    buttons.forEach((b) => {
      b.hidden = false;
      b.setAttribute("aria-pressed", String(on));
      b.addEventListener("click", () => set(!on, buttons));
    });
    if (on) {
      start();
      const wake = () => { if (on) start(); ["pointerdown", "keydown", "touchend"].forEach((e) => removeEventListener(e, wake, true)); };
      ["pointerdown", "keydown", "touchend"].forEach((e) => addEventListener(e, wake, true));
    }
    document.addEventListener("visibilitychange", () => {
      if (!on || !ctx) return;
      if (document.hidden) { fadeTo(0, 0.2); setTimeout(() => document.hidden && ctx.suspend(), 300); }
      else ctx.resume().then(() => fadeTo(0.9), () => {});
    });
  };

  window.Sound = Sound;
})();
