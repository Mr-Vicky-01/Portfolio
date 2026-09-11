const host = document.querySelector("#workspace");
const status = document.querySelector("#scene-status");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let scene;
let loading = false;
let failed = false;

function syncMotion() {
  const stopped = reduced.matches;
  document.documentElement.classList.toggle("motion-paused", stopped);
  document.dispatchEvent(new CustomEvent("portfolio:motionchange"));
  scene?.setPaused(stopped);
  if (host)
    host.dataset.state = reduced.matches
      ? "static"
      : scene
        ? "ready"
        : "static";
  if (status)
    status.textContent =
      reduced.matches || failed
        ? "A DIFFERENT PERSPECTIVE"
        : scene && matchMedia("(pointer: fine)").matches
          ? "MOVE YOUR CURSOR TO EXPLORE"
          : "A DIFFERENT PERSPECTIVE";
}
async function loadScene() {
  if (!host || reduced.matches || scene || loading || failed) return;
  loading = true;
  try {
    const { createWorkspace } = await import("./workspace.js");
    // A preference change during download must not briefly start animation.
    if (!reduced.matches)
      scene = createWorkspace(host, {
        paused: reduced.matches,
        onFailure: fail,
      });
  } catch {
    fail();
  } finally {
    loading = false;
    syncMotion();
  }
}
function fail() {
  failed = true;
  scene?.dispose();
  scene = undefined;
  host?.querySelector("canvas")?.remove();
  syncMotion();
}
reduced.addEventListener("change", () => {
  syncMotion();
  if (!reduced.matches) loadScene();
});
syncMotion();
// The illustration and all page content render before the optional module loads.
function schedule() {
  if ("requestIdleCallback" in window)
    requestIdleCallback(loadScene, { timeout: 1800 });
  else setTimeout(loadScene, 150);
}
if (document.readyState === "complete") schedule();
else window.addEventListener("load", schedule, { once: true });
