/* Particle field: a fixed WebGL canvas whose points move between shapes (noise, text, a portrait). */
(() => {
  const FG = [0.93, 0.918, 0.89];
  const AMBER = [1, 0.71, 0.28];

  function create(canvas, { count, small }) {
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return null;
    const vs = `attribute vec2 aPos; attribute vec4 aCol; attribute float aSize;
      uniform vec2 uRes; uniform float uDpr; varying vec4 vCol;
      void main() { vec2 c = aPos / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); gl_PointSize = aSize * uDpr; vCol = aCol; }`;
    const fs = `precision mediump float; varying vec4 vCol;
      void main() { float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, r); gl_FragColor = vec4(vCol.rgb, vCol.a * a); }`;
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const N = count;
    const pos = new Float32Array(N * 2), vel = new Float32Array(N * 2), col = new Float32Array(N * 4);
    const size = new Float32Array(N), seed = new Float32Array(N);
    const shapeOf = new Uint8Array(N), pending = new Uint8Array(N), switchAt = new Float32Array(N);
    let W = innerWidth, H = innerHeight, dpr = 1;
    for (let i = 0; i < N; i++) {
      pos[i * 2] = Math.random() * W;
      pos[i * 2 + 1] = Math.random() * H;
      seed[i] = Math.random();
      size[i] = (small ? 1.6 : 1.5) + Math.random() * 1.3;
    }
    const buffer = (data, name, n, usage) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
      return b;
    };
    const bPos = buffer(pos, "aPos", 2, gl.DYNAMIC_DRAW);
    const bCol = buffer(col, "aCol", 4, gl.DYNAMIC_DRAW);
    buffer(size, "aSize", 1, gl.STATIC_DRAW);
    const uRes = gl.getUniformLocation(prog, "uRes"), uDpr = gl.getUniformLocation(prog, "uDpr");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth;
      H = innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    addEventListener("resize", resize);

    const shapes = [];
    let current = -1, turbulence = 0;
    const mouse = { x: -1e4, y: -1e4 };
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -1e4; });

    function add(shape) {
      shape.alpha = 1;
      shape.alphaTarget = 1;
      shapes.push(shape);
      return shapes.length - 1;
    }
    function setShape(id, spread = 700) {
      if (id === current || id == null) return;
      const now = performance.now();
      for (let i = 0; i < N; i++) { pending[i] = id; switchAt[i] = now + Math.random() * spread; }
      current = id;
    }
    // Fit a shape inside its slot; text sits on the slot's left edge unless data-align="center".
    function fit(slot, aspect) {
      const r = slot.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      let w = r.width, h = r.height;
      if (w / h > aspect) w = h * aspect;
      else h = w / aspect;
      const x = slot.dataset.align === "center" ? r.left + (r.width - w) / 2 : r.left;
      return { x, y: r.top + (r.height - h) / 2, w, h };
    }

    let last = performance.now(), running = true;
    function frame(now) {
      if (!running) return;
      const dt = Math.min(2.5, (now - last) / 16.667);
      last = now;
      const t = now / 1000;
      for (const s of shapes) {
        s.box = s.slot ? fit(s.slot, s.aspect) : null;
        s.alpha += (s.alphaTarget - s.alpha) * 0.06 * dt;
      }
      const k = 0.032 * dt, damp = Math.pow(0.86, dt), R = small ? 70 : 130, R2 = R * R;
      const jitter = turbulence * 3.2 * dt;
      turbulence *= Math.pow(0.9, dt);
      for (let i = 0; i < N; i++) {
        if (pending[i] !== shapeOf[i] && now >= switchAt[i]) shapeOf[i] = pending[i];
        const s = shapes[shapeOf[i]];
        const i2 = i * 2, i4 = i * 4, u = s.pts[i2], v = s.pts[i2 + 1], sd = seed[i];
        let tx, ty;
        if (s.kind === "box" && s.box) {
          tx = s.box.x + u * s.box.w + Math.sin(t * 1.6 + sd * 40) * 0.7;
          ty = s.box.y + v * s.box.h + Math.cos(t * 1.3 + sd * 30) * 0.7;
        } else if (s.kind === "wave") {
          tx = u * W;
          ty = H * 0.5 + (Math.sin(u * 7 + t * 0.9) * 0.6 + Math.sin(u * 13 - t * 1.3) * 0.25) * H * 0.13 * Math.sin(t * 0.35 + u * 2.5) + (v - 0.5) * 16;
        } else {
          tx = u * W + Math.sin(t * 0.13 + sd * 6.28) * 40;
          ty = v * H + Math.cos(t * 0.11 + sd * 9.1) * 40;
        }
        const x = pos[i2], y = pos[i2 + 1];
        let vx = (vel[i2] + (tx - x) * k) * damp, vy = (vel[i2 + 1] + (ty - y) * k) * damp;
        if (jitter > 0.02) { vx += (Math.random() - 0.5) * jitter; vy += (Math.random() - 0.5) * jitter; }
        const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * 2.4 * dt;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
        }
        vel[i2] = vx;
        vel[i2 + 1] = vy;
        pos[i2] = x + vx * dt;
        pos[i2 + 1] = y + vy * dt;
        const c = s.cols, a = c[i4 + 3] * s.alpha, e = 0.07 * dt;
        col[i4] += (c[i4] - col[i4]) * e;
        col[i4 + 1] += (c[i4 + 1] - col[i4 + 1]) * e;
        col[i4 + 2] += (c[i4 + 2] - col[i4 + 2]) * e;
        col[i4 + 3] += (a - col[i4 + 3]) * e;
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, W, H);
      gl.uniform1f(uDpr, dpr);
      gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, bCol);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, col);
      gl.drawArrays(gl.POINTS, 0, N);
      requestAnimationFrame(frame);
    }
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) { last = performance.now(); requestAnimationFrame(frame); }
    });

    return {
      N,
      add,
      setShape,
      start: () => requestAnimationFrame(frame),
      shape: (id) => shapes[id],
      // Fast scrolling shakes the points loose; they settle back when scrolling stops.
      kick: (amount) => { turbulence = Math.max(turbulence, Math.min(1, amount)); },
      get current() { return current; },
    };
  }

  // Weighted sampling of N points from something drawn on a 2D canvas.
  function sample(N, w, h, draw, weight, colour, tight = true) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    draw(ctx, w, h);
    const d = ctx.getImageData(0, 0, w, h).data, idx = [], cum = [];
    let sum = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4, wt = weight(d, k);
        if (wt > 0) {
          sum += wt; idx.push(k); cum.push(sum);
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (!tight) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
    // Normalise to the pixels actually drawn, so text fills its slot exactly.
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const pts = new Float32Array(N * 2), cols = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const r = Math.random() * sum;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
      const k = idx[lo], p = k / 4, x = p % w, y = (p / w) | 0;
      pts[i * 2] = (x - x0 + Math.random()) / bw;
      pts[i * 2 + 1] = (y - y0 + Math.random()) / bh;
      colour(d, k, cols, i * 4);
    }
    return { pts, cols, aspect: bw / bh };
  }
  const tint = (out, j, rgb, a) => { out[j] = rgb[0]; out[j + 1] = rgb[1]; out[j + 2] = rgb[2]; out[j + 3] = a; };

  function textShape(N, text, font, { stretch, amber = 0.08 } = {}) {
    const lines = text.split("\n"), probe = document.createElement("canvas").getContext("2d");
    probe.font = font;
    if (stretch && "fontStretch" in probe) probe.fontStretch = stretch;
    const ms = lines.map((l) => probe.measureText(l));
    const lh = Math.max(...ms.map((m) => m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)), gap = lh * 0.14;
    const w = Math.ceil(Math.max(...ms.map((m) => m.actualBoundingBoxLeft + m.actualBoundingBoxRight))) + 8;
    const h = Math.ceil(lh * lines.length + gap * (lines.length - 1)) + 8;
    return sample(N, w, h, (ctx) => {
      ctx.font = font;
      if (stretch && "fontStretch" in ctx) ctx.fontStretch = stretch;
      ctx.fillStyle = "#fff";
      lines.forEach((l, i) => ctx.fillText(l, ms[i].actualBoundingBoxLeft + 4, 4 + ms[i].actualBoundingBoxAscent + i * (lh + gap)));
    }, (d, k) => (d[k + 3] > 140 ? 1 : 0), (d, k, out, j) => tint(out, j, Math.random() < amber ? AMBER : FG, 1));
  }

  function imageShape(N, img, w = 320, h = 400) {
    const lum = (d, k) => (0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]) / 255;
    return sample(N, w, h, (ctx) => {
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
    }, (d, k) => { const l = lum(d, k); return l > 0.15 ? Math.pow(l - 0.12, 1.3) : 0; }, (d, k, out, j) => {
      const l = lum(d, k), g = Math.min(1, 0.3 + l * 0.95);
      if (Math.random() < 0.05) tint(out, j, AMBER, 1);
      else tint(out, j, [g, g * 0.96, g * 0.9], 0.6 + l * 0.4);
    }, false);
  }

  function scatter(N, colour) {
    const pts = new Float32Array(N * 2), cols = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { pts[i * 2] = Math.random(); pts[i * 2 + 1] = Math.random(); colour(cols, i * 4, i); }
    return { pts, cols, aspect: 1 };
  }

  window.PField = { create, textShape, imageShape, scatter, tint, FG, AMBER };
})();
