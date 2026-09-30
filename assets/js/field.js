/* Particle field: a fixed WebGL canvas whose points move between shapes (noise, text, a portrait, drawn emblems).
   Each point has a depth: near points are larger and brighter, and the field tilts with the pointer so shapes read in 3D.
   The pointer lights the points around it, pushes them aside and links them; holding pulls them into a well.
   Points add up as light and a blurred copy is laid over them, so dense shapes glow. */
(() => {
  const FG = [0.93, 0.918, 0.89];
  const AMBER = [1, 0.71, 0.28];

  function create(canvas, { count, small, links = false }) {
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return null;
    // aMeta: x = depth (0 far, 1 near), y = seed; a negative seed marks link geometry, which is drawn as given.
    const vs = `attribute vec2 aPos; attribute vec4 aCol; attribute float aSize; attribute vec2 aMeta;
      uniform vec2 uRes; uniform float uDpr; uniform vec2 uMouse; uniform vec2 uTilt; uniform float uTime; uniform float uLight; uniform float uMotes;
      varying vec4 vCol; varying float vSoft;
      void main() {
        if (aMeta.y < 0.0) { vec2 c = aPos / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); gl_PointSize = 1.0; vCol = aCol; vSoft = -1.0; return; }
        float z = aMeta.x, sd = aMeta.y;
        vec2 p = aPos + uTilt * (z - 0.5);
        vec2 dm = p - uMouse;
        float lit = uLight * exp(-dot(dm, dm) / 34000.0);
        float tw = 0.88 + 0.12 * sin(uTime * (0.7 + sd * 2.4) + sd * 40.0);
        float mote = step(0.972, sd) * uMotes;
        vec2 c = p / uRes * 2.0 - 1.0;
        gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
        gl_PointSize = aSize * uDpr * (0.62 + z * 0.8) * (1.0 + lit * 0.6) * (1.0 + mote * 5.0);
        vCol = vec4(mix(aCol.rgb, vec3(1.0, 0.84, 0.58), lit * 0.5), min(1.0, aCol.a * (0.72 + z * 0.56) * tw * (1.0 + lit * 0.8)) * (1.0 - mote * 0.84));
        vSoft = mote;
      }`;
    const fs = `precision mediump float; varying vec4 vCol; varying float vSoft;
      void main() {
        float a = vSoft < 0.0 ? 1.0 : smoothstep(0.5, mix(0.15, 0.0, vSoft), length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vCol.rgb, vCol.a * a);
      }`;
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    // Attribute locations are fixed, so switching programs never leaves one pointing at the wrong buffer.
    const program = (v, f, attrs) => {
      const pr = gl.createProgram();
      gl.attachShader(pr, shader(gl.VERTEX_SHADER, v));
      gl.attachShader(pr, shader(gl.FRAGMENT_SHADER, f));
      attrs.forEach((a, i) => gl.bindAttribLocation(pr, i, a));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      return pr;
    };
    const prog = program(vs, fs, ["aPos", "aCol", "aSize", "aMeta"]);

    // Glow: points render into a texture, which is halved twice (averaging every pixel), blurred, and added back on screen.
    const quadVs = `attribute vec2 aQ; varying vec2 vUv; void main() { vUv = aQ * 0.5 + 0.5; gl_Position = vec4(aQ, 0.0, 1.0); }`;
    const blurFs = `precision mediump float; varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uStep;
      void main() {
        vec3 c = texture2D(uTex, vUv).rgb * 0.227;
        c += (texture2D(uTex, vUv + uStep * 1.385).rgb + texture2D(uTex, vUv - uStep * 1.385).rgb) * 0.316;
        c += (texture2D(uTex, vUv + uStep * 3.231).rgb + texture2D(uTex, vUv - uStep * 3.231).rgb) * 0.070;
        gl_FragColor = vec4(c, 1.0);
      }`;
    // The canvas is transparent: light is sent out as its hue plus an alpha equal to its brightness.
    const mixFs = `precision mediump float; varying vec2 vUv; uniform sampler2D uScene; uniform sampler2D uGlow; uniform float uGlowK;
      void main() {
        vec3 c = texture2D(uScene, vUv).rgb + texture2D(uGlow, vUv).rgb * uGlowK;
        float m = max(max(c.r, c.g), c.b);
        gl_FragColor = m < 0.002 ? vec4(0.0) : vec4(c / m, min(1.0, m));
      }`;
    let glow = null;
    try {
      const blur = program(quadVs, blurFs, ["aQ"]), mix = program(quadVs, mixFs, ["aQ"]);
      const quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      glow = {
        blur, mix, quad,
        uTex: gl.getUniformLocation(blur, "uTex"), uStep: gl.getUniformLocation(blur, "uStep"),
        uScene: gl.getUniformLocation(mix, "uScene"), uGlow: gl.getUniformLocation(mix, "uGlow"), uGlowK: gl.getUniformLocation(mix, "uGlowK"),
        targets: [],
      };
    } catch { glow = null; }
    const target = (w, h) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, fb, w, h, ok };
    };
    gl.useProgram(prog);

    const N = count;
    const pos = new Float32Array(N * 2), vel = new Float32Array(N * 2), col = new Float32Array(N * 4);
    const size = new Float32Array(N), seed = new Float32Array(N), meta = new Float32Array(N * 2);
    const shapeOf = new Uint8Array(N), pending = new Uint8Array(N), switchAt = new Float32Array(N);
    let W = innerWidth, H = innerHeight, dpr = 1;
    for (let i = 0; i < N; i++) {
      pos[i * 2] = Math.random() * W;
      pos[i * 2 + 1] = Math.random() * H;
      seed[i] = Math.random();
      size[i] = (small ? 1.6 : 1.5) + Math.random() * 1.3;
      meta[i * 2] = Math.random();
      meta[i * 2 + 1] = seed[i];
    }
    const buffer = (data, usage) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      return b;
    };
    // Bind a buffer to an attribute and, when given, upload new contents.
    const use = (b, loc, n, data) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      if (data) gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    };
    const aPos = gl.getAttribLocation(prog, "aPos"), aCol = gl.getAttribLocation(prog, "aCol"), aSize = gl.getAttribLocation(prog, "aSize"), aMeta = gl.getAttribLocation(prog, "aMeta");
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aCol);
    const bPos = buffer(pos, gl.DYNAMIC_DRAW), bCol = buffer(col, gl.DYNAMIC_DRAW), bSize = buffer(size, gl.STATIC_DRAW), bMeta = buffer(meta, gl.STATIC_DRAW);
    // Links drawn between points near the pointer, as thin quads (GL lines are one device pixel at most).
    const MAX_LINKS = 700, NODE_EVERY = small ? 3 : 5, MAX_NODES = 150, LINK_W = 0.7;
    const lPos = new Float32Array(MAX_LINKS * 12), lCol = new Float32Array(MAX_LINKS * 24), nodes = new Int32Array(MAX_NODES);
    const bLPos = buffer(lPos, gl.DYNAMIC_DRAW), bLCol = buffer(lCol, gl.DYNAMIC_DRAW);
    // Link ends follow their points' depth, so links stay attached while the field tilts.
    const vert = (v, x, y, from, a) => {
      const z = meta[from * 2] - 0.5;
      lPos[v * 2] = x + tilt.x * z; lPos[v * 2 + 1] = y + tilt.y * z;
      lCol[v * 4] = col[from * 4]; lCol[v * 4 + 1] = col[from * 4 + 1]; lCol[v * 4 + 2] = col[from * 4 + 2]; lCol[v * 4 + 3] = a;
    };
    const U = (n) => gl.getUniformLocation(prog, n);
    const uRes = U("uRes"), uDpr = U("uDpr"), uMouse = U("uMouse"), uTilt = U("uTilt"), uTime = U("uTime"), uLight = U("uLight"), uMotes = U("uMotes");
    gl.clearColor(0, 0, 0, 0);
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth;
      H = innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      if (glow) {
        glow.targets.forEach((t) => { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); });
        const hw = Math.max(1, Math.round(canvas.width / 2)), hh = Math.max(1, Math.round(canvas.height / 2));
        const qw = Math.max(1, Math.round(hw / 2)), qh = Math.max(1, Math.round(hh / 2));
        glow.targets = [target(canvas.width, canvas.height), target(hw, hh), target(qw, qh), target(qw, qh)];
        if (!glow.targets.every((t) => t.ok)) { glow.targets.forEach((t) => { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }); glow = null; }
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    addEventListener("resize", resize);

    const shapes = [];
    let current = -1, turbulence = 0, hold = 0, holdTarget = 0, light = 0, motes = 0;
    const pulses = [];
    const mouse = { x: -1e4, y: -1e4 }, tilt = { x: 0, y: 0 }, TILT = small ? 16 : 38, GLOW = 1.3;
    const away = () => { mouse.x = mouse.y = -1e4; };
    const point = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    addEventListener("pointermove", point, { passive: true });
    addEventListener("pointerdown", point, { passive: true });
    // A finger leaves no pointer behind once it lifts.
    addEventListener("pointerup", (e) => e.pointerType !== "mouse" && away(), { passive: true });
    addEventListener("pointercancel", (e) => e.pointerType !== "mouse" && away(), { passive: true });
    document.documentElement.addEventListener("pointerleave", away);

    // A shape can set motes: 1 to float a few large, out-of-focus points in front of it (the noise and the wave do).
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
      // Tilt toward the pointer; without one (phones, or the pointer off the page) the field drifts slowly on its own.
      const here = mouse.x > -1e3 && !small;
      const tx0 = here ? (mouse.x / W - 0.5) * 2 : Math.sin(t * 0.21) * 0.6, ty0 = here ? (mouse.y / H - 0.5) * 2 : Math.cos(t * 0.17) * 0.45;
      tilt.x += (tx0 * TILT - tilt.x) * 0.05 * dt;
      tilt.y += (ty0 * TILT - tilt.y) * 0.05 * dt;
      light += ((here ? 1 : 0) - light) * 0.06 * dt;
      motes += ((shapes[current]?.motes || 0) - motes) * 0.03 * dt;
      const k = 0.032 * dt, damp = Math.pow(0.86, dt), R = small ? 70 : 130, R2 = R * R;
      const jitter = turbulence * 3.2 * dt;
      turbulence *= Math.pow(0.9, dt);
      hold += (holdTarget - hold) * (holdTarget ? 0.045 : 0.25) * dt;
      if (hold < 0.002) hold = 0;
      const G = small ? 280 : 460, G2 = G * G, pull = hold > 0, repel = hold < 0.25;
      const LR = R + 90, LR2 = LR * LR, linking = links && mouse.x > -1e3;
      let nNodes = 0;
      for (let p = pulses.length - 1; p >= 0; p--) {
        const q = pulses[p];
        q.age = (now - q.t0) / 1000;
        q.r = q.age * 820;
        if (q.age > 1.3) pulses.splice(p, 1);
      }
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
        const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
        // Holding: points near the pointer loosen from their shape, fall inward and swirl around a small core.
        let g = 0;
        if (pull && d2 < G2) g = hold * Math.min(1, (1 - Math.sqrt(d2) / G) * 2.2);
        const kk = k * (1 - g * 0.97);
        let vx = (vel[i2] + (tx - x) * kk) * damp, vy = (vel[i2 + 1] + (ty - y) * kk) * damp;
        if (jitter > 0.02) { vx += (Math.random() - 0.5) * jitter; vy += (Math.random() - 0.5) * jitter; }
        if (g > 0.001 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (d > 30 ? 1.7 : -1.4) * g * dt, sw = 1.25 * g * dt;
          vx += (-dx / d) * f - (dy / d) * sw;
          vy += (-dy / d) * f + (dx / d) * sw;
        } else if (repel && d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * 2.4 * dt;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
        }
        // Ripples travel outward as rings.
        for (let p = 0; p < pulses.length; p++) {
          const q = pulses[p], ex = x - q.x, ey = y - q.y, e2 = ex * ex + ey * ey;
          if (e2 < 1) continue;
          const d = Math.sqrt(e2), band = Math.abs(d - q.r);
          if (band < 60) {
            const f = (1 - band / 60) * (1 - q.age / 1.3) * q.s * 2.2 * dt;
            vx += (ex / d) * f;
            vy += (ey / d) * f;
          }
        }
        if (linking && i % NODE_EVERY === 0 && d2 < LR2 && nNodes < MAX_NODES) nodes[nNodes++] = i;
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
      // Link nearby points around the pointer, brightest close to it.
      let nl = 0;
      const LD = 64, LD2 = LD * LD;
      for (let a = 0; a < nNodes && nl < MAX_LINKS; a++) {
        const i = nodes[a], ax = pos[i * 2], ay = pos[i * 2 + 1];
        for (let b = a + 1; b < nNodes && nl < MAX_LINKS; b++) {
          const j = nodes[b], bx = pos[j * 2], by = pos[j * 2 + 1], ex = ax - bx, ey = ay - by, e2 = ex * ex + ey * ey;
          if (e2 > LD2) continue;
          const mx = (ax + bx) / 2 - mouse.x, my = (ay + by) / 2 - mouse.y, e = Math.sqrt(e2);
          const near = Math.max(0, 1 - (mx * mx + my * my) / LR2);
          const al = (1 - e / LD) * near;
          if (al < 0.03 || e < 0.5) continue;
          const nx = (-ey / e) * LINK_W, ny = (ex / e) * LINK_W, v0 = nl * 6;
          const ai = Math.min(1, col[i * 4 + 3] * 2.5) * al, bj = Math.min(1, col[j * 4 + 3] * 2.5) * al;
          // Two triangles: a+n, a-n, b+n and a-n, b-n, b+n.
          vert(v0, ax + nx, ay + ny, i, ai); vert(v0 + 1, ax - nx, ay - ny, i, ai); vert(v0 + 2, bx + nx, by + ny, j, bj);
          vert(v0 + 3, ax - nx, ay - ny, i, ai); vert(v0 + 4, bx - nx, by - ny, j, bj); vert(v0 + 5, bx + nx, by + ny, j, bj);
          nl++;
        }
      }
      const [scene, half, gA, gB] = glow ? glow.targets : [];
      gl.useProgram(prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, glow ? scene.fb : null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.BLEND);
      // Into the glow texture points add up as light; straight to the canvas they blend as before.
      if (glow) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, W, H);
      gl.uniform1f(uDpr, dpr);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform2f(uTilt, tilt.x, tilt.y);
      gl.uniform1f(uTime, t % 1000);
      gl.uniform1f(uLight, light);
      gl.uniform1f(uMotes, motes);
      if (nl) {
        gl.disableVertexAttribArray(aSize);
        gl.disableVertexAttribArray(aMeta);
        gl.vertexAttrib1f(aSize, 1);
        gl.vertexAttrib2f(aMeta, 0.5, -1);
        use(bLPos, aPos, 2, lPos.subarray(0, nl * 12));
        use(bLCol, aCol, 4, lCol.subarray(0, nl * 24));
        gl.drawArrays(gl.TRIANGLES, 0, nl * 6);
      }
      gl.enableVertexAttribArray(aSize);
      gl.enableVertexAttribArray(aMeta);
      use(bSize, aSize, 1);
      use(bMeta, aMeta, 2);
      use(bPos, aPos, 2, pos);
      use(bCol, aCol, 4, col);
      gl.drawArrays(gl.POINTS, 0, N);
      if (glow) {
        gl.disable(gl.BLEND);
        gl.bindBuffer(gl.ARRAY_BUFFER, glow.quad);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        const pass = (src, dst, dx, dy) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
          gl.viewport(0, 0, dst.w, dst.h);
          gl.bindTexture(gl.TEXTURE_2D, src.tex);
          gl.uniform2f(glow.uStep, dx / src.w, dy / src.h);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
        gl.useProgram(glow.blur);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(glow.uTex, 0);
        // A zero step copies; sampling between texels averages them.
        pass(scene, half, 0, 0);
        pass(half, gA, 0, 0);
        pass(gA, gB, 1, 0);
        pass(gB, gA, 0, 1);
        pass(gA, gB, 2, 0);
        pass(gB, gA, 0, 2);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(glow.mix);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, scene.tex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, gA.tex);
        gl.uniform1i(glow.uScene, 0);
        gl.uniform1i(glow.uGlow, 1);
        gl.uniform1f(glow.uGlowK, GLOW);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.activeTexture(gl.TEXTURE0);
      }
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
      // Press and hold pulls the points into a well at the pointer; letting go throws them back out.
      hold: () => { holdTarget = 1; },
      release: () => {
        const s = hold;
        holdTarget = 0;
        hold = 0;
        if (s < 0.05) return;
        const G = small ? 280 : 460, B = G * 1.4;
        for (let i = 0; i < N; i++) {
          const dx = pos[i * 2] - mouse.x, dy = pos[i * 2 + 1] - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < B && d > 0.5) {
            const f = (1 - d / B) * 34 * s * (0.6 + Math.random() * 0.8);
            vel[i * 2] += (dx / d) * f;
            vel[i * 2 + 1] += (dy / d) * f;
          }
        }
        pulses.push({ x: mouse.x, y: mouse.y, t0: performance.now(), s: 1.4 * s, age: 0, r: 0 });
      },
      pulse: (x, y, s = 1) => { if (pulses.length < 4) pulses.push({ x, y, t0: performance.now(), s, age: 0, r: 0 }); },
      get holding() { return hold; },
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

  function drawnShape(N, draw, size = 480) {
    return sample(N, size, size, draw, (d, k) => (d[k + 3] > 120 ? 1 : 0), (d, k, out, j) => tint(out, j, d[k + 2] < 150 || Math.random() < 0.04 ? AMBER : FG, 1));
  }

  function scatter(N, colour) {
    const pts = new Float32Array(N * 2), cols = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { pts[i * 2] = Math.random(); pts[i * 2 + 1] = Math.random(); colour(cols, i * 4, i); }
    return { pts, cols, aspect: 1 };
  }

  window.PField = { create, textShape, imageShape, drawnShape, scatter, tint, FG, AMBER };
})();
