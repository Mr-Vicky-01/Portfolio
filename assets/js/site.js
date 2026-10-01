/* Site behaviour: smooth scroll, particle shapes per section, reveals, pinned sections, cursor and page transitions.
   Everything here is an enhancement; the pages read fully without it. */
(() => {
  const root = document.documentElement;
  const page = document.body.dataset.page || "home";
  const systemReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reduced = systemReduced || root.classList.contains("motion-off");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const small = matchMedia("(max-width: 760px)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} }, del: (k) => { try { sessionStorage.removeItem(k); } catch {} } };

  const hasGsap = !!(window.gsap && window.ScrollTrigger && window.Lenis);
  const motion = hasGsap && !reduced;
  root.classList.toggle("motion", motion);
  if (!motion) root.classList.remove("pt-in");

  /* ---------- Small utilities that work without motion ---------- */
  const clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tick = () => { const t = clockFmt.format(new Date()); $$("[data-clock]").forEach((el) => (el.textContent = t)); };
  tick();
  setInterval(tick, 1000);

  $$("[data-copy]").forEach((btn) => btn.addEventListener("click", () => {
    const text = btn.dataset.copy, label = btn.dataset.label || (btn.dataset.label = btn.textContent);
    const done = (msg) => { btn.textContent = msg; setTimeout(() => (btn.textContent = label), 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => done("Copied"), () => done(text));
    else done(text);
  }));

  // Motion switch in the footer; the system setting always wins.
  $$("[data-motion-toggle]").forEach((btn) => {
    if (systemReduced) { btn.hidden = true; return; }
    const off = root.classList.contains("motion-off");
    btn.textContent = off ? "Motion: off" : "Motion: on";
    btn.setAttribute("aria-pressed", String(!off));
    btn.addEventListener("click", () => {
      try { localStorage.setItem("motion", off ? "on" : "off"); } catch {}
      location.reload();
    });
  });

  // Phone menu.
  let lenis = null;
  const menu = $("#menu"), menuBtn = $("[data-menu]");
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "Close" : "Menu";
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) $("a", menu)?.focus();
  }
  menuBtn?.addEventListener("click", () => setMenu(menu.hidden));
  menu?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  if (!motion) {
    root.classList.add("no-gl");
    $$(".stage").forEach((s) => s.classList.add("on"));
    $(".loader")?.remove();
    return;
  }

  /* ---------- Particle field ---------- */
  const cores = navigator.hardwareConcurrency || 8;
  let field = null;
  try { field = window.PField && PField.create($("#field"), { count: small ? 6500 : cores <= 4 ? 9000 : 14000, small, links: finePointer }); } catch { field = null; }
  if (!field) root.classList.add("no-gl");
  const ids = {};
  let activeShape = null, glyphActive = false, introDone = false;

  function buildShapes() {
    const { textShape, imageShape, scatter, tint, FG, AMBER } = PField, N = field.N;
    ids.dust = field.add({ kind: "dust", motes: 1, ...scatter(N, (c, j, i) => (i % 31 === 0 ? tint(c, j, AMBER, 0.55) : tint(c, j, FG, 0.16))) });
    ids.wave = field.add({ kind: "wave", motes: 1, ...scatter(N, (c, j) => { const a = Math.random(); tint(c, j, a < 0.6 ? AMBER : FG, 0.25 + a * 0.5); }) });
    const scene = $("[data-pipeline] .st-visual");
    if (scene) ids.pipeline = field.add({ ...PField.pipelineShape(N, "96%", '800 260px "Anek Latin"'), slot: scene });
    $$("[data-particles]").forEach((slot) => {
      const name = slot.dataset.particles;
      if (slot.dataset.emblem) {
        const draw = window.Emblems?.[slot.dataset.emblem];
        if (draw) ids[name] = field.add({ kind: "box", slot, ...PField.drawnShape(N, draw) });
        return;
      }
      if (slot.dataset.image) {
        const img = $(slot.dataset.image);
        if (img && img.naturalWidth) ids[name] = field.add({ kind: "box", slot, ...imageShape(N, img) });
        return;
      }
      const text = ((small && slot.dataset.textSmall) || slot.dataset.text).split("|").join("\n");
      const tamil = slot.dataset.font === "tamil";
      ids[name] = field.add({ kind: "box", slot, ...textShape(N, text, tamil ? '700 240px "Anek Tamil"' : '800 260px "Anek Latin"', { stretch: tamil ? null : "condensed", amber: +(slot.dataset.amber || 0.08) }) });
    });
    field.setShape(ids.dust, 0);
    field.start();
  }
  const shapeFor = (name) => (ids[name] != null ? ids[name] : ids.dust);
  // Each project panel gets its emblem, drawn the first time it is needed.
  function emblemOf(panel) {
    const slug = panel.dataset.emblem, key = "emblem:" + slug, draw = window.Emblems?.[slug], box = $(".glyph", panel);
    if (!field || !draw || !box) return null;
    if (ids[key] == null) ids[key] = field.add({ kind: "box", slot: box, ...PField.drawnShape(field.N, draw) });
    return key;
  }
  let livePanel = null;
  function setLive(panel) {
    if (panel === livePanel) return;
    livePanel?.classList.remove("is-live");
    livePanel = panel;
    panel?.classList.add("is-live");
  }
  // Sections record the shape they want; nothing moves until the intro has played.
  function showShape(name, spread) {
    activeShape = name;
    if (field && introDone && !glyphActive) field.setShape(shapeFor(name), spread);
  }
  function startShapes(fallback, spread) {
    introDone = true;
    showShape(activeShape || fallback, spread);
  }

  /* ---------- Scroll ---------- */
  gsap.registerPlugin(ScrollTrigger);
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  const hdr = $(".hdr");
  lenis.on("scroll", (e) => {
    ScrollTrigger.update();
    const v = Math.abs(e.velocity);
    if (field && v > 10) field.kick((v - 10) / 70);
    // Header steps aside while reading down the page and returns on the way up.
    if (hdr && menu?.hidden !== false) hdr.classList.toggle("is-hidden", e.direction === 1 && e.scroll > 240);
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  const toTarget = (hash) => (hash === "#top" ? 0 : $(hash));
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = toTarget(a.getAttribute("href"));
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.6 });
  });

  /* ---------- Page transitions ---------- */
  const curtain = $(".curtain");
  const internal = (a) => {
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
    const u = new URL(a.href, location.href);
    return u.origin === location.origin && u.pathname !== location.pathname && /(\.html|\/)$/.test(u.pathname);
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!curtain || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !internal(a)) return;
    e.preventDefault();
    navigate(a.href, a.dataset.title || a.textContent.trim());
  });
  function navigate(href, title) {
    $(".curtain-title", curtain).textContent = title || "";
    store.set("pt", "1");
    gsap.fromTo(curtain, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.inOut", onComplete: () => (location.href = href) });
    gsap.fromTo($(".curtain-title", curtain), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: "expo.out", delay: 0.35 });
  }
  addEventListener("pageshow", (e) => {
    if (e.persisted && curtain) { gsap.set(curtain, { clipPath: "inset(100% 0% 0% 0%)" }); root.classList.remove("pt-in"); }
  });

  /* ---------- Text helpers ---------- */
  function splitWords(el, cls) {
    const out = [];
    const walk = (node, hl) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const span = document.createElement("span");
          span.className = cls + (hl ? " hl" : "");
          span.textContent = part;
          frag.appendChild(span);
          out.push(span);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n, hl || n.tagName === "EM");
    });
    walk(el, false);
    return out;
  }
  const maskWords = (el) => splitWords(el, "wi").map((w) => {
    const m = document.createElement("span");
    m.className = "wm";
    w.replaceWith(m);
    m.appendChild(w);
    return w;
  });

  // Hover scramble: characters pass through noise before resolving into the label.
  const GLYPHS = "!<>-_/[]{}=+*^?#01";
  function scramble(el) {
    if (el.dataset.busy) return;
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    el.setAttribute("aria-label", final);
    el.dataset.busy = "1";
    let frame = 0;
    const total = 16;
    const step = () => {
      frame++;
      const done = frame / total;
      el.textContent = [...final].map((ch, i) => (ch === " " || i / final.length < done ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
      if (frame < total) requestAnimationFrame(step);
      else { el.textContent = final; delete el.dataset.busy; }
    };
    step();
  }
  if (finePointer) $$("[data-scramble]").forEach((el) => el.addEventListener("pointerenter", () => scramble(el)));

  /* ---------- Boot: wait for fonts and images, then play the intro ---------- */
  const loader = $(".loader");
  const useLoader = !!loader && page === "home" && !root.classList.contains("skip-loader");
  if (!useLoader) loader?.remove();
  store.set("visited", "1");
  const count = $(".loader .count"), bar = $(".loader .bar i");
  if (useLoader) {
    const p = { v: 0 };
    gsap.to(p, { v: 90, duration: 1.2, ease: "power2.out", onUpdate: () => { count.textContent = String(Math.round(p.v)).padStart(3, "0"); bar.style.width = p.v + "%"; } });
  }
  const images = $$("[data-particles][data-image]").map((s) => $(s.dataset.image)).filter(Boolean).map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
  const fonts = Promise.all([
    document.fonts.load('800 200px "Anek Latin"'),
    document.fonts.load('400 12px "Martian Mono"'),
    $("[data-font='tamil']") ? document.fonts.load('700 200px "Anek Tamil"', "வணக்கம்") : null,
  ]).catch(() => {});
  let skipWait;
  const minTime = new Promise((r) => { skipWait = r; setTimeout(r, useLoader ? 900 : 0); });
  if (useLoader) { loader.addEventListener("click", () => skipWait()); addEventListener("keydown", () => skipWait(), { once: true }); }

  Promise.all([fonts, minTime, ...images]).then(() => {
    if (field) buildShapes();
    run();
  });

  function run() {
    const heroShape = $("[data-hero]")?.dataset.shape;
    const intro = gsap.timeline();
    if (useLoader) {
      intro.to(bar, { width: "100%", duration: 0.35, ease: "power2.out", onUpdate: () => (count.textContent = "100") })
        .to(loader, { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "expo.inOut" }, "+=0.15")
        .add(() => { startShapes(heroShape, 1400); loader.remove(); }, "-=0.55");
    } else if (root.classList.contains("pt-in") && curtain) {
      store.del("pt");
      intro.to(curtain, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: "expo.inOut", onComplete: () => { root.classList.remove("pt-in"); gsap.set(curtain, { clipPath: "inset(100% 0% 0% 0%)" }); } })
        .add(() => startShapes(heroShape, 1200), "-=0.6");
    } else {
      intro.add(() => startShapes(heroShape, 1200));
    }
    const heroWords = $$("[data-hero-reveal]").flatMap(maskWords);
    gsap.set(heroWords, { yPercent: 110 });
    intro.to(heroWords, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.035 }, "-=0.2")
      .from("[data-hero-fade]", { opacity: 0, y: 14, duration: 0.8, stagger: 0.06, ease: "power3.out" }, "<0.1");

    // Featured case study: scrolling through the scene plays its four chapters, which the particles draw.
    const story = $("[data-pipeline]");
    if (story && ids.pipeline != null) {
      const chapters = $$(".chapter", story), steps = $$(".st-steps i", story), visual = $(".st-visual", story), scene = field.shape(ids.pipeline);
      let shown = -1;
      const show = (n) => {
        if (n === shown) return;
        shown = n;
        chapters.forEach((c, i) => c.classList.toggle("on", i === n));
        steps.forEach((el, i) => el.classList.toggle("on", i <= n));
        visual.dataset.stage = n;
      };
      show(0);
      // The last tenth of the scroll holds the result; text changes midway through each particle transition.
      ScrollTrigger.create({ trigger: story, start: "top top", end: "bottom bottom", onUpdate: (st) => {
        const p = Math.min(3, st.progress * 3.3);
        scene.stage = p;
        show(Math.min(3, Math.floor(p + 0.45)));
      } });
    }

    const mm = gsap.matchMedia();
    mm.add("(min-width: 761px)", () => {
      // Selected work: a horizontal gallery driven by vertical scroll.
      const work = $(".work"), track = $(".work-track");
      if (work && track) {
        work.classList.add("hscroll");
        const counter = $("[data-work-index]"), panelEls = $$(".panel[data-glyph]", work), panels = panelEls.length;
        const dist = () => track.scrollWidth - innerWidth;
        // The particles travel with the gallery, drawing the emblem of the project in the middle of the screen.
        const follow = (st) => {
          if (!st.isActive || glyphActive) return;
          let best = null, bd = innerWidth * 0.28;
          panelEls.forEach((p) => { const r = p.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - innerWidth * 0.55); if (d < bd) { bd = d; best = p; } });
          setLive(best);
          const key = best && emblemOf(best);
          if ((key || work.dataset.shape) !== activeShape) showShape(key || work.dataset.shape, 600);
        };
        gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: work, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, onUpdate: (st) => {
          gsap.set(".work-progress i", { scaleX: st.progress });
          if (counter) counter.textContent = String(Math.round(st.progress * (panels - 1)) + 1).padStart(2, "0");
          follow(st);
        }, onToggle: (st) => !st.isActive && setLive(null) } });
      }
      return () => work?.classList.remove("hscroll");
    });
    mm.add("(max-width: 760px)", () => {
      $$(".stage").forEach((s) => ScrollTrigger.create({ trigger: s, start: "top 80%", onEnter: () => s.classList.add("on") }));
      // Phones: each project's emblem forms as its card reaches the middle of the screen.
      const work = $(".work");
      $$(".panel[data-emblem]").forEach((panel) => ScrollTrigger.create({
        trigger: panel, start: "top 62%", end: "bottom 38%",
        onToggle: (st) => {
          const key = emblemOf(panel);
          if (st.isActive) { setLive(panel); if (key) showShape(key, 700); }
          else if (livePanel === panel) { setLive(null); if (activeShape === key) showShape(work?.dataset.shape || "dust", 700); }
        },
      }));
    });

    // Created after the pins, so their positions include the pinned scroll distance.
    $$("[data-shape]").forEach((sec) => ScrollTrigger.create({
      trigger: sec, start: "top 55%", end: "bottom 45%",
      onToggle: (st) => st.isActive && showShape(sec.dataset.shape, sec.dataset.shape === "dust" ? 900 : 1100),
    }));
    $$("[data-reveal]").forEach((el) => {
      const w = maskWords(el);
      gsap.from(w, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.045, scrollTrigger: { trigger: el, start: "top 88%" } });
    });
    $$("[data-words]").forEach((el) => {
      const words = splitWords(el, "w");
      gsap.to(words, { opacity: 1, stagger: 0.12, ease: "none", scrollTrigger: { trigger: el.closest("section"), start: "top top", end: "bottom bottom", scrub: 0.6 } });
    });
    $$("[data-count]").forEach((el) => {
      const o = { v: 0 }, end = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
      el.textContent = pre + "0" + suf;
      gsap.to(o, { v: end, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" }, onUpdate: () => (el.textContent = pre + Math.round(o.v) + suf) });
    });
    $$("[data-rise]").forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } }));
    // Project steps light up in order.
    $$(".steps").forEach((steps) => {
      const items = $$(".stage", steps);
      const tl = gsap.timeline({ scrollTrigger: { trigger: steps, start: "top 75%" } });
      tl.to($(".rail i", steps), { scaleX: 1, duration: 1.4, ease: "power2.inOut" }, 0);
      items.forEach((s, i) => tl.add(() => s.classList.add("on"), 0.2 + i * 0.45));
    });

    // Header nav marks the section in view.
    $$(".hdr nav a[href^='#']").forEach((a) => {
      let sec = $(a.getAttribute("href"));
      // A pinned section's wrapper spans its whole pinned scroll distance.
      if (sec?.parentElement?.classList.contains("pin-spacer")) sec = sec.parentElement;
      if (sec) ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (st) => (st.isActive ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current")) });
    });

    // Header progress line.
    gsap.to(".progress i", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

    // Skills ticker speeds up with scroll velocity.
    const mqRow = $(".marquee .mq-row");
    if (mqRow) {
      const mq = gsap.to(mqRow, { xPercent: -50, duration: 80, ease: "none", repeat: -1 });
      ScrollTrigger.create({ onUpdate: (st) => { const v = st.getVelocity() / 400; gsap.to(mq, { timeScale: gsap.utils.clamp(-6, 6, 1 + Math.abs(v)) * (v < -0.5 ? -1 : 1), duration: 0.3, overwrite: true }); } });
    }

    // Portrait: hover swaps the particles for the photograph.
    const slot = $(".portrait-slot");
    if (slot) {
      const denoise = (on) => { slot.classList.toggle("denoised", on); if (field && ids.portrait != null) field.shape(ids.portrait).alphaTarget = on ? 0 : 1; };
      slot.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && denoise(true));
      slot.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && denoise(false));
      slot.addEventListener("click", () => denoise(!slot.classList.contains("denoised")));
    }

    // Project panels: hovering one draws its emblem.
    if (field && finePointer) {
      $$(".panel[data-emblem]").forEach((panel) => {
        panel.addEventListener("pointerenter", () => {
          const key = emblemOf(panel);
          if (!key) return;
          glyphActive = true;
          setLive(panel);
          field.setShape(ids[key], 500);
        });
        panel.addEventListener("pointerleave", () => { glyphActive = false; field.setShape(shapeFor(activeShape), 700); });
      });
      // Draw the rest of the emblems while the browser is idle, so scrolling never waits on them.
      const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
      $$(".panel[data-emblem]").forEach((panel, i) => idle(() => emblemOf(panel), { timeout: 4000 + i * 300 }));
    }

    // Press and hold anywhere to pull the field into a well; let go to throw it back. A click sends a ripple.
    if (field) {
      const skip = "a, button, input, textarea, select, label, [data-href], .portrait-slot, .menu, .loader";
      const hint = $("[data-hold-hint]"), ringEl = $(".ring");
      let press = null;
      const end = (e) => {
        if (!press) return;
        clearTimeout(press.timer);
        if (press.held) {
          field.release();
          root.classList.remove("holding");
          ringEl?.classList.remove("hold");
          if (hint && !hint.classList.contains("done")) { hint.classList.add("done"); try { localStorage.setItem("held", "1"); } catch {} }
        } else if (e.type === "pointerup" && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 10) {
          field.pulse(e.clientX, e.clientY, 0.8);
        }
        press = null;
      };
      document.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || e.target.closest(skip) || (menu && !menu.hidden)) return;
        press = { x: e.clientX, y: e.clientY, held: false };
        if (e.pointerType !== "mouse") return;
        press.timer = setTimeout(() => {
          if (!press) return;
          press.held = true;
          field.hold();
          root.classList.add("holding");
          ringEl?.classList.add("hold");
        }, 220);
      });
      document.addEventListener("pointermove", (e) => { if (press && !press.held && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12) { clearTimeout(press.timer); press = null; } }, { passive: true });
      document.addEventListener("pointerup", end);
      document.addEventListener("pointercancel", end);
      addEventListener("blur", () => end({ type: "blur" }));
      root.addEventListener("pointerleave", () => end({ type: "leave" }));
      try { if (localStorage.getItem("held")) hint?.classList.add("done"); } catch {}
    }
    // Whole panel opens its case study; links inside keep their own targets.
    $$("[data-href]").forEach((panel) => panel.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;
      const a = $("a[data-case]", panel);
      if (a) a.click();
    }));

    // Footer name: each letter widens as the cursor passes over it.
    const big = $(".big-name");
    if (big && finePointer) {
      const letters = splitWords(big, "bn").flatMap((w) => {
        const chars = [...w.textContent];
        w.textContent = "";
        return chars.map((c) => { const s = document.createElement("span"); s.textContent = c; w.appendChild(s); return s; });
      });
      const setters = letters.map((l) => gsap.quickTo(l, "--w", { duration: 0.6, ease: "power3.out" }));
      const zone = big.closest("footer") || big;
      zone.addEventListener("pointermove", (e) => letters.forEach((l, i) => {
        const r = l.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2));
        setters[i](75 + 50 * Math.max(0, 1 - d / 280));
      }));
      zone.addEventListener("pointerleave", () => setters.forEach((s) => s(75)));
    }

    // Custom cursor and magnetic controls.
    if (finePointer) {
      root.classList.add("has-cursor");
      const dot = $(".cursor"), ring = $(".ring"), label = $(".ring span");
      const qx = gsap.quickTo(dot, "x", { duration: 0.08 }), qy = gsap.quickTo(dot, "y", { duration: 0.08 });
      const rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
      addEventListener("pointermove", (e) => { qx(e.clientX); qy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
      document.addEventListener("pointerover", (e) => {
        const tagged = e.target.closest("[data-cursor]"), link = e.target.closest("a, button");
        const view = !!tagged && !link && tagged.dataset.cursor !== "none";
        ring.classList.toggle("view", view);
        ring.classList.toggle("link", !!link);
        label.textContent = view ? tagged.dataset.cursor : "";
      });
      $$("[data-magnetic]").forEach((el) => {
        const mx = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" }), my = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.35); my((e.clientY - r.top - r.height / 2) * 0.35); });
        el.addEventListener("pointerleave", () => { mx(0); my(0); });
      });
    }

    // Lenis caches the page height; pins change it, so re-measure after every refresh.
    ScrollTrigger.addEventListener("refresh", () => lenis.resize());
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    // Arriving with a section link (for example from a project page).
    const hashTarget = location.hash && $(location.hash);
    if (hashTarget) requestAnimationFrame(() => { lenis.resize(); lenis.scrollTo(hashTarget, { immediate: true, force: true }); });
  }
})();
