/* Sound: a small synthesiser built on the Web Audio API, so the site ships no audio files.
   It stays off until the visitor turns it on (the choice is remembered), and browsers hold any sound back
   until a tap, click or key press. Every voice is a clean tone (no noise), tuned to A minor pentatonic over
   a soft A pad, so cues that overlap still sound together. The site calls the cues below; while sound is
   off they do nothing. */
(() => {
  const KEY = "sound";
  let ctx = null, master, dry, fx, verb, droneLp, sheen, hum = null, restTimer = 0, lastTick = 0;
  // The pointer's glints: notes owed (a running total), when it last moved, and the last note played.
  let owed = 0, lastTouch = 0, lastStep = -1;
  // Cues run through one bus, so their level against the quiet bed is set in one place.
  const FX = 3.4, BED_LP = 650;
  const lastForm = {};
  let on = false;
  try { on = localStorage.getItem(KEY) === "on"; } catch {}

  // Semitones from A3 (220 Hz); the scale walks A minor pentatonic upward.
  const hz = (semi) => 220 * Math.pow(2, semi / 12);
  const PENTA = [0, 3, 5, 7, 10];
  const scale = (step) => hz(PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5));

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
    // iPhone mutes web audio in silent mode unless the page plays as media; the visitor asked for sound.
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
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

    // The bed: a soft pad on A and E, pitched high enough for laptop and phone speakers, over a sub for headphones.
    // Scrolling opens its filter a little (the pad brightens as the particles shake) and swells the sheen below.
    droneLp = ctx.createBiquadFilter();
    droneLp.type = "lowpass";
    droneLp.frequency.value = BED_LP;
    droneLp.Q.value = 0.6;
    const dg = ctx.createGain();
    dg.gain.value = 0.022;
    droneLp.connect(dg);
    dg.connect(dry);
    dg.connect(verb);
    [[110, -7, "triangle"], [110, 6, "triangle"], [164.81, 3, "triangle"], [220, -4, "triangle"], [329.63, 5, "sine"]].forEach(([f, cents, type]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(droneLp);
      o.start();
    });
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.frequency.value = 55;
    sg.gain.value = 0.03;
    sub.connect(sg);
    sg.connect(dry);
    sub.start();
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 0.06;
    depth.gain.value = 160;
    lfo.connect(depth);
    depth.connect(droneLp.frequency);
    lfo.start();
    // Sheen: a high, pure chord that swells with scroll speed, slowly breathing.
    sheen = ctx.createGain();
    sheen.gain.value = 0;
    const breathe = ctx.createGain();
    breathe.gain.value = 0.7;
    const slow = ctx.createOscillator(), slowDepth = ctx.createGain();
    slow.frequency.value = 0.35;
    slowDepth.gain.value = 0.3;
    slow.connect(slowDepth);
    slowDepth.connect(breathe.gain);
    slow.start();
    [[880, 0, 0.5], [1318.51, 4, 0.32], [1760, -3, 0.2]].forEach(([f, cents, g]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = f;
      o.detune.value = cents;
      og.gain.value = g;
      o.connect(og);
      og.connect(breathe);
      o.start();
    });
    breathe.connect(sheen);
    sheen.connect(dry);
    const sv = ctx.createGain();
    sv.gain.value = 0.8;
    sheen.connect(sv);
    sv.connect(verb);
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
  // A pure tone and its fifth gliding from one pitch to another: falls and rises without any noise.
  function glide({ at = 0, from = 880, to = 220, dur = 1, gain = 0.03 } = {}) {
    const t = ctx.currentTime + at, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [1, 1.5].forEach((r, i) => {
      const o = ctx.createOscillator();
      o.type = i ? "sine" : "triangle";
      o.frequency.setValueAtTime(from * r, t);
      o.frequency.exponentialRampToValueAtTime(to * r, t + dur);
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
    send(g, 0.9);
  }
  // A reversed swell: a chord that grows and is cut at its peak, leaving the hall to ring. A clean whoosh.
  function swell(semis, { at = 0, dur = 0.45, gain = 0.035 } = {}) {
    const t = ctx.currentTime + at, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    semis.forEach((sm) => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = hz(sm);
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.2);
    });
    send(g, 1.2);
    return dur;
  }
  // A glint: a short glassy tone placed left or right, used for the pointer moving through the particles.
  function glint(freq, pan, gain, decay) {
    const t = ctx.currentTime, g = ctx.createGain(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.frequency.value = freq;
    o2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0.18, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.4);
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    let out = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    send(out, 1.1);
    [o, o2].forEach((x) => { x.start(t); x.stop(t + decay + 0.05); });
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
      else if (n === 2) { glide({ from: 1320, to: 165, dur: 1.2, gain: 0.03 }); bell(hz(24), { at: 0.4, gain: 0.05, decay: 2.6 }); }
      else if (n === 3) chord([0, 7, 14, 16], { gain: 0.06, decay: 3.6 }, 0.06);
    },
    // Scroll speed in pixels per frame: the pad brightens and the sheen swells, then both settle.
    velocity(v) {
      if (!ready()) return;
      const s = Math.min(1, v / 50), t = ctx.currentTime;
      sheen.gain.setTargetAtTime(s * 0.04, t, 0.12);
      droneLp.frequency.setTargetAtTime(BED_LP + s * 900, t, 0.15);
      clearTimeout(restTimer);
      restTimer = setTimeout(() => {
        if (!ctx) return;
        const r = ctx.currentTime;
        sheen.gain.setTargetAtTime(0, r, 0.5);
        droneLp.frequency.setTargetAtTime(BED_LP, r, 0.6);
      }, 140);
    },
    // The pointer moving through the particles. stir: 0 to 1, how much of the field it is pushing aside;
    // speed: pixels per millisecond. Faster, denser movement plays more glints; stillness plays none.
    touch(x, y, stir, speed) {
      if (!ready()) return;
      const now = performance.now(), dt = Math.min(60, now - lastTouch) / 1000;
      lastTouch = now;
      if (stir < 0.02) { owed = 0; return; }
      const rate = Math.min(16, speed * 7) * Math.pow(stir, 0.7);
      owed = Math.min(2, owed + rate * dt);
      if (owed < 1) return;
      owed -= 1;
      // Higher on the screen plays higher; the same note never repeats twice in a row.
      let step = 6 + Math.round((1 - y / innerHeight) * 9 + (Math.random() - 0.5) * 2);
      if (step === lastStep) step += Math.random() < 0.5 ? -1 : 1;
      lastStep = step;
      glint(scale(step), Math.max(-0.75, Math.min(0.75, (x / innerWidth) * 1.5 - 0.75)), (0.03 + 0.03 * stir) / (1 + rate / 16), 0.6 + Math.random() * 0.8);
    },
    // Press and hold: a clean hum (a root and its fifth) that rises while the well pulls;
    // letting go cuts it, rings a bell and drops a soft low thump.
    hold() {
      if (!ready() || hum) return;
      const t = ctx.currentTime, f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass";
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + 2.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04, t + 0.8);
      const os = [[110, 220], [164.81, 329.63]].map(([a, b]) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(a, t);
        o.frequency.exponentialRampToValueAtTime(b, t + 2.5);
        o.connect(f);
        o.start(t);
        return o;
      });
      f.connect(g);
      send(g, 0.6);
      hum = { os, g };
    },
    release() {
      if (!hum) return;
      const { os, g } = hum, t = ctx.currentTime;
      hum = null;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.04);
      os.forEach((o) => o.stop(t + 0.3));
      if (!ready()) return;
      thump({ gain: 0.16 });
      chord([12, 19, 24], { gain: 0.04, decay: 2.4 }, 0.05);
      glide({ from: 330, to: 1320, dur: 0.5, gain: 0.02 });
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
      g.gain.exponentialRampToValueAtTime(0.02, t + 0.003);
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
      swell([0, 7, 12, 19], { dur: 0.55, gain: 0.03 });
    },
  };

  /* ---------- Switching on and off ---------- */
  function fadeTo(v, time = 0.8) {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(v, t, time / 3);
  }
  let buttons = [];
  // The bars only dance once audio is really playing, so the switch never claims sound the browser is holding back.
  const live = () => buttons.forEach((b) => b.classList.toggle("is-live", !!(on && ctx && ctx.state === "running")));
  // Starting needs a user gesture; resume() quietly waits when the browser has not had one yet.
  // confirm: play a short chord as soon as sound is running, so switching it on is heard at once.
  function start(confirm) {
    if (!ctx && !build()) return;
    // iOS Safari unlocks audio for the page once something has played inside a gesture.
    try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0); } catch {}
    const go = () => {
      live();
      if (!on) return;
      fadeTo(0.9, 0.5);
      if (confirm) chord([-12, 0, 7, 12], { gain: 0.06, decay: 2.8 }, 0.07);
    };
    if (ctx.state === "running") go();
    else {
      const r = ctx.resume && ctx.resume();
      if (r && r.then) r.then(go, () => {});
      else setTimeout(go, 0);
    }
  }
  function stop() {
    live();
    if (!ctx) return;
    fadeTo(0, 0.3);
    setTimeout(() => { if (!on && ctx) ctx.suspend().then(live, live); }, 450);
  }
  function set(value) {
    on = value;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(on)));
    if (on) start(true);
    else stop();
  }
  // Wires the header switches. With sound already chosen on, the first gesture on the page starts it.
  Sound.init = (list) => {
    buttons = list;
    if (!buttons.length) return;
    buttons.forEach((b) => {
      b.hidden = false;
      b.setAttribute("aria-pressed", String(on));
      b.addEventListener("click", () => set(!on));
    });
    if (on) start();
    // Until audio is running, every tap, click or key press tries again (browsers only allow it inside one).
    const wake = (e) => {
      if (!on || e.target.closest?.("[data-sound]")) return;
      if (!ctx || ctx.state !== "running") start();
    };
    ["pointerdown", "keydown", "touchend"].forEach((e) => addEventListener(e, wake, true));
    document.addEventListener("visibilitychange", () => {
      if (!on || !ctx) return;
      if (document.hidden) { fadeTo(0, 0.2); setTimeout(() => document.hidden && ctx.suspend().then(live, live), 300); }
      else start();
    });
  };

  window.Sound = Sound;
})();
