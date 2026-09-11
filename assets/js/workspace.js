import * as THREE from "three";

/** Procedural scene: no model downloads, controls library, or postprocessing. */
export function createWorkspace(host, { paused = false, onFailure } = {}) {
  const compact = matchMedia("(max-width: 640px)");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !compact.matches,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x090c0d, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);

  const resources = new Set();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const material = (color, roughness = 0.6, metalness = 0.25, extra = {}) =>
    keep(
      new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }),
    );
  const dark = material(0x1b2340, 0.5, 0.55);
  const rim = material(0x677b9f, 0.4, 0.65);
  const deskSurface = material(0x283550, 0.68, 0.35);
  const black = material(0x090f22, 0.55, 0.3);
  const keyMaterial = material(0x596985, 0.65, 0.2);
  const cyan = material(0x90acff, 0.4, 0.2, {
    emissive: 0x3868ff,
    emissiveIntensity: 1.1,
  });
  const amber = material(0xb7a17a, 0.55, 0.3);
  const stage = new THREE.Group();
  scene.add(stage);

  function box(width, height, depth, mat, x, y, z, parent = stage) {
    const mesh = new THREE.Mesh(
      keep(new THREE.BoxGeometry(width, height, depth)),
      mat,
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function cylinder(top, bottom, height, mat, x, y, z) {
    const mesh = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(top, bottom, height, 32)),
      mat,
    );
    mesh.position.set(x, y, z);
    stage.add(mesh);
    return mesh;
  }
  function planeTexture(canvas) {
    const texture = keep(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    return texture;
  }
  function canvas(width, height) {
    const element = document.createElement("canvas");
    element.width = width;
    element.height = height;
    return element;
  }

  scene.add(new THREE.HemisphereLight(0xc6d5ff, 0x151b36, 2.5));
  const key = new THREE.DirectionalLight(0xe0eaff, 3.5);
  key.position.set(-3, 7, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc7b58c, 2.3);
  fill.position.set(5, 4, -4);
  scene.add(fill);
  const screenLight = new THREE.PointLight(0x6c91ff, 7, 5, 2);
  screenLight.position.set(0, 1.8, 0.3);
  scene.add(screenLight);

  // Thin floating platform, inset edge, and four structural legs.
  box(6.8, 0.16, 3.6, deskSurface, 0, 0, 0);
  box(6.83, 0.025, 3.63, rim, 0, -0.06, 0);
  box(6.65, 0.018, 0.018, cyan, 0, -0.01, 1.81);
  for (const x of [-2.8, 2.8]) {
    for (const z of [-1.22, 1.22]) box(0.16, 1.6, 0.16, dark, x, -0.87, z);
    box(0.17, 0.12, 2.7, rim, x, -1.59, 0);
  }
  box(5.6, 0.1, 0.08, dark, 0, -0.85, -1.23);

  // Monitor and stand. The screen is drawn as a crisp, generated texture.
  box(1.18, 0.075, 0.7, rim, 0, 0.12, -0.62);
  box(0.24, 0.95, 0.21, dark, 0, 0.6, -0.75);
  box(3.65, 2.29, 0.18, rim, 0, 1.95, -0.8);
  box(3.6, 2.24, 0.19, black, 0, 1.95, -0.78);
  const screenCanvas = canvas(1200, 720);
  const screenContext = screenCanvas.getContext("2d");
  const screenTexture = planeTexture(screenCanvas);
  const screen = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3.39, 2.04)),
    keep(
      new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
    ),
  );
  screen.position.set(0, 1.985, -0.675);
  stage.add(screen);
  box(0.048, 0.025, 0.01, cyan, 0, 0.885, -0.674);

  function drawScreen(time = 0) {
    const c = screenContext;
    c.fillStyle = "#0e162a";
    c.fillRect(0, 0, 1200, 720);
    c.fillStyle = "#1b2845";
    c.fillRect(0, 0, 1200, 50);
    ["#b48470", "#c3ae7c", "#7cad8a"].forEach((color, i) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(24 + i * 23, 25, 6, 0, Math.PI * 2);
      c.fill();
    });
    c.font = "17px monospace";
    c.fillStyle = "#a5b5d5";
    c.fillText("pachaiappan / workspace", 390, 32);
    c.fillStyle = "#141e35";
    c.fillRect(0, 50, 220, 624);
    c.fillStyle = "#a4b5d9";
    c.font = "17px monospace";
    c.fillText("EXPLORER", 24, 89);
    c.fillStyle = "#273555";
    c.fillRect(8, 112, 204, 37);
    [
      "⌁  developer.py",
      "   models/",
      "   applications/",
      "   experiments/",
      "   README.md",
    ].forEach((line, i) => {
      c.fillStyle = i === 0 ? "#c3d7ff" : "#8192b3";
      c.fillText(line, 23, 137 + i * 42);
    });
    c.fillStyle = "#1c3154";
    c.fillRect(220, 50, 236, 47);
    c.fillStyle = "#a8beee";
    c.fillText("developer.py", 252, 80);
    const code = [
      [["#8096bf", "# Ideas into useful software"]],
      [],
      [
        ["#bc9ac5", "class "],
        ["#94b6ff", "Developer"],
        ["#cad8f3", ":"],
      ],
      [
        ["#cad8f3", "    name = "],
        ["#d6bd8d", '"Pachaiappan"'],
      ],
      [
        ["#cad8f3", "    focus = "],
        ["#d6bd8d", '"AI + engineering"'],
      ],
      [],
      [
        ["#bc9ac5", "    def "],
        ["#94b6ff", "build"],
        ["#cad8f3", "(self, idea):"],
      ],
      [["#cad8f3", "        learn()"]],
      [["#cad8f3", "        experiment()"]],
      [
        ["#bc9ac5", "        return "],
        ["#cad8f3", "something_useful"],
      ],
    ];
    c.font = "23px monospace";
    code.forEach((tokens, row) => {
      c.fillStyle = "#425779";
      c.fillText(String(row + 1).padStart(2, "0"), 247, 146 + row * 37);
      let x = 308;
      tokens.forEach(([color, text]) => {
        c.fillStyle = color;
        c.fillText(text, x, 146 + row * 37);
        x += c.measureText(text).width;
      });
    });
    c.fillStyle = "#23355b";
    c.fillRect(221, 539, 979, 1);
    c.font = "16px monospace";
    c.fillStyle = "#a5b6d5";
    c.fillText("TERMINAL", 250, 569);
    c.font = "20px monospace";
    c.fillStyle = "#9bcbf4";
    c.fillText("> ready to create", 250, 618);
    if (Math.floor(time * 1.6) % 2 === 0) c.fillRect(473, 602, 10, 21);
    c.fillStyle = "#314b7c";
    c.fillRect(0, 675, 1200, 45);
    c.font = "17px monospace";
    c.fillStyle = "#d4e3ff";
    c.fillText("main*", 22, 704);
    c.fillText("Python  ·  UTF-8  ·  Let’s build.", 785, 704);
    screenTexture.needsUpdate = true;
  }
  drawScreen();

  // Instanced keys keep geometry and draw calls small on mobile devices.
  const keyboard = new THREE.Group();
  keyboard.position.set(-0.35, 0.15, 0.91);
  stage.add(keyboard);
  box(2.42, 0.1, 0.84, black, 0, 0, 0, keyboard);
  const keys = new THREE.InstancedMesh(
    keep(new THREE.BoxGeometry(0.155, 0.055, 0.135)),
    keyMaterial,
    52,
  );
  const matrix = new THREE.Matrix4();
  let keyIndex = 0;
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 13; col++) {
      matrix.makeTranslation(-1.09 + col * 0.181, 0.072, -0.28 + row * 0.18);
      keys.setMatrixAt(keyIndex++, matrix);
    }
  keyboard.add(keys);
  box(0.73, 0.018, 0.09, rim, 0, 0.108, 0.26, keyboard);
  box(1.03, 0.022, 0.9, black, 1.64, 0.102, 0.9);
  const mouse = new THREE.Mesh(
    keep(new THREE.SphereGeometry(0.22, 24, 16)),
    rim,
  );
  mouse.scale.set(0.76, 0.42, 1.15);
  mouse.position.set(1.6, 0.2, 0.86);
  stage.add(mouse);
  box(0.015, 0.01, 0.13, cyan, 1.6, 0.292, 0.79);

  // Ceramic cup, handle, and a small desk plant.
  cylinder(0.24, 0.2, 0.45, amber, 2.62, 0.32, -0.58);
  cylinder(0.21, 0.21, 0.018, black, 2.62, 0.554, -0.58);
  const handle = new THREE.Mesh(
    keep(new THREE.TorusGeometry(0.17, 0.04, 10, 24)),
    amber,
  );
  handle.position.set(2.87, 0.34, -0.58);
  stage.add(handle);
  cylinder(0.24, 0.19, 0.34, dark, -2.64, 0.27, -0.75);
  cylinder(0.205, 0.205, 0.025, black, -2.64, 0.45, -0.75);
  const leafMaterial = material(0x528469, 0.8, 0.05);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(
      keep(new THREE.SphereGeometry(0.12, 10, 8)),
      leafMaterial,
    );
    const angle = i * 2.4;
    leaf.scale.set(0.7, 3.1 + (i % 2), 0.32);
    leaf.position.set(
      -2.64 + Math.cos(angle) * 0.12,
      0.67,
      -0.75 + Math.sin(angle) * 0.12,
    );
    leaf.rotation.z = Math.sin(angle) * 0.6;
    leaf.rotation.x = Math.cos(angle) * 0.5;
    stage.add(leaf);
  }

  function panel(width, height, type) {
    const group = new THREE.Group();
    box(width + 0.025, height + 0.025, 0.045, rim, 0, 0, 0, group);
    const art = canvas(600, 360);
    const c = art.getContext("2d");
    c.fillStyle = "#121d35";
    c.fillRect(0, 0, 600, 360);
    c.strokeStyle = "#536b99";
    c.strokeRect(1, 1, 598, 358);
    c.beginPath();
    c.moveTo(0, 55);
    c.lineTo(600, 55);
    c.stroke();
    c.fillStyle = "#c4b58c";
    c.beginPath();
    c.arc(25, 27, 6, 0, Math.PI * 2);
    c.fill();
    c.font = "17px monospace";
    c.fillStyle = "#bbc9e5";
    c.fillText(
      type === "code" ? "MODEL.PIPELINE" : "BUILD / EXPERIMENT / REPEAT",
      46,
      33,
    );
    if (type === "code") {
      [
        "from idea import possibility",
        "",
        "model.train(data)",
        "result = model.predict(input)",
        "",
        "→ make it useful",
      ].forEach((line, i) => {
        c.fillStyle = i === 5 ? "#dfc890" : i === 0 ? "#9ec0f5" : "#aebedc";
        c.font = "21px monospace";
        c.fillText(line, 30, 103 + i * 41);
      });
    } else {
      c.strokeStyle = "#2c4165";
      for (let y = 100; y < 310; y += 45) {
        c.beginPath();
        c.moveTo(30, y);
        c.lineTo(570, y);
        c.stroke();
      }
      c.strokeStyle = "#9cbdff";
      c.lineWidth = 4;
      c.beginPath();
      [260, 239, 251, 185, 206, 148, 157, 106, 132, 90].forEach((y, i) =>
        i ? c.lineTo(35 + i * 58, y) : c.moveTo(35, y),
      );
      c.stroke();
      c.font = "18px monospace";
      c.fillStyle = "#a6b8da";
      c.fillText("ALWAYS LEARNING_", 33, 333);
    }
    const face = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(width, height)),
      keep(
        new THREE.MeshBasicMaterial({
          map: planeTexture(art),
          toneMapped: false,
        }),
      ),
    );
    face.position.z = 0.03;
    group.add(face);
    stage.add(group);
    return group;
  }
  const codePanel = panel(1.75, 1.05, "code");
  codePanel.position.set(2.78, 2.92, -0.65);
  codePanel.rotation.set(0, -0.2, -0.04);
  const chartPanel = panel(1.7, 1.02, "chart");
  chartPanel.position.set(-2.75, 1.65, 0.3);
  chartPanel.rotation.set(0, 0.22, 0.06);

  // Soft baked light and grounding shadows; no expensive realtime shadow maps.
  const glowCanvas = canvas(128, 128);
  const glowContext = glowCanvas.getContext("2d");
  const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.6)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  glowContext.fillStyle = gradient;
  glowContext.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(10, 7)),
    keep(
      new THREE.MeshBasicMaterial({
        map: planeTexture(glowCanvas),
        transparent: true,
        depthWrite: false,
      }),
    ),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.7;
  stage.add(shadow);
  const grid = new THREE.GridHelper(11, 18, 0x394b78, 0x253558);
  grid.position.y = -1.73;
  grid.material.transparent = true;
  grid.material.opacity = 0.16;
  keep(grid.geometry);
  keep(grid.material);
  stage.add(grid);
  const orbit = new THREE.Mesh(
    keep(new THREE.RingGeometry(4.45, 4.46, 100)),
    keep(
      new THREE.MeshBasicMaterial({
        color: 0x546eac,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      }),
    ),
  );
  orbit.rotation.x = -Math.PI / 2;
  orbit.position.y = -1.72;
  stage.add(orbit);

  let visible = true,
    disposed = false,
    frame = 0,
    last = 0,
    elapsed = 0,
    lastTexture = 0;
  let pointerX = 0,
    pointerY = 0,
    currentX = 0,
    currentY = 0;
  function pose() {
    const intro = document.querySelector(".hero-layout");
    const progress = Math.max(
      0,
      Math.min(1, -intro.getBoundingClientRect().top / intro.offsetHeight),
    );
    camera.position.set(
      4.6 + currentX * 0.7 + progress * 2.8,
      3.8 + currentY * 0.4 + progress * 1.5,
      8.4 - progress * 0.8,
    );
    camera.lookAt(-progress * 0.4, 0.8 + progress * 0.3, 0);
    host.style.opacity = String(1 - progress * 0.65);
  }
  function render() {
    if (disposed) return;
    pose();
    try {
      renderer.render(scene, camera);
    } catch {
      onFailure?.();
    }
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed) return;
    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, compact.matches ? 1.25 : 1.75),
    );
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = compact.matches ? 43 : 42;
    camera.updateProjectionMatrix();
    render();
  }
  function tick(timestamp) {
    frame = 0;
    if (disposed || paused || !visible || document.hidden) return;
    const delta = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
    if (compact.matches && last && timestamp - last < 32) {
      frame = requestAnimationFrame(tick);
      return;
    }
    last = timestamp;
    elapsed += delta;
    currentX += (pointerX - currentX) * 0.045;
    currentY += (pointerY - currentY) * 0.045;
    codePanel.position.y = 2.92 + Math.sin(elapsed * 0.65) * 0.085;
    chartPanel.position.y = 1.65 + Math.sin(elapsed * 0.7 + 1) * 0.07;
    if (elapsed - lastTexture > 0.6) {
      drawScreen(elapsed);
      lastTexture = elapsed;
    }
    render();
    if (!disposed) frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    host.dataset.rendering = disposed
      ? "disposed"
      : paused
        ? "paused"
        : !visible || document.hidden
          ? "suspended"
          : "running";
    if (!disposed && !paused && visible && !document.hidden)
      frame = requestAnimationFrame(tick);
  }
  const onPointer = (event) => {
    if (event.pointerType !== "mouse") return;
    const rect = host.getBoundingClientRect();
    pointerX = Math.max(
      -1,
      Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
    );
    pointerY = Math.max(
      -1,
      Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
  };
  const clearPointer = () => {
    pointerX = 0;
    pointerY = 0;
  };
  const onLost = (event) => {
    event.preventDefault();
    onFailure?.();
  };
  const onVisibility = () => sync();
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0 },
  );
  observer.observe(host);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  host.addEventListener("pointermove", onPointer, { passive: true });
  host.addEventListener("pointerleave", clearPointer);
  renderer.domElement.addEventListener("webglcontextlost", onLost);
  document.addEventListener("visibilitychange", onVisibility);
  compact.addEventListener("change", resize);
  resize();
  sync();

  function dispose() {
    if (disposed) return;
    disposed = true;
    sync();
    observer.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    compact.removeEventListener("change", resize);
    host.removeEventListener("pointermove", onPointer);
    host.removeEventListener("pointerleave", clearPointer);
    renderer.domElement.removeEventListener("webglcontextlost", onLost);
    resources.forEach((resource) => resource.dispose());
    renderer.dispose();
    renderer.domElement.remove();
    host.style.opacity = "";
  }
  return {
    setPaused(value) {
      paused = value;
      sync();
    },
    dispose,
  };
}
