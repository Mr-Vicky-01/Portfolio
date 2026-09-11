/* One motion controller: native scroll, single-use reveals, and a sticky project stage. */
const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const desktop = matchMedia("(min-width: 1000px)");
const pointer = matchMedia("(hover: hover) and (pointer: fine)");
const sequence = document.querySelector(".project-sequence");
const stories = [...document.querySelectorAll(".featured-project")];
const slides = [...document.querySelectorAll(".stage-slide")];
const dots = [...document.querySelectorAll(".stage-dots i")];
const counter = document.querySelector("#stage-counter");
const stage = document.querySelector(".stage-art");
const portrait = document.querySelector(".portrait-studio");
let active = -1;
let frame = 0;
let isVisible = true;
root.classList.toggle("motion-paused", reduced.matches);
const stopped = () =>
  reduced.matches || root.classList.contains("motion-paused");
const progress = document.createElement("div");
progress.className = "reading-progress";
progress.setAttribute("aria-hidden", "true");
document.querySelector(".site-header")?.append(progress);

const revealNodes = new Set(
  document.querySelectorAll(
    ".reveal, .featured-project > .project-visual, .detail-heading, .detail-main > .project-visual, .project-overview, .project-stack, .next-project",
  ),
);
document.querySelectorAll(".more-work-grid, .skill-grid").forEach((group) => {
  [...group.children].forEach((item, index) =>
    item.style.setProperty("--delay", `${(index % 3) * 90}ms`),
  );
});
function reveal(element, animate = true) {
  element.classList.remove("reveal-pending");
  if (animate && !stopped()) {
    element.classList.add("is-entering");
    element.addEventListener(
      "animationend",
      () => element.classList.remove("is-entering"),
      { once: true },
    );
  }
  revealNodes.delete(element);
}
const observer =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              reveal(entry.target);
              observer.unobserve(entry.target);
            }
        },
        { threshold: 0, rootMargin: "0px 0px -35px 0px" },
      )
    : null;

function syncReveals() {
  if (stopped()) {
    observer?.disconnect();
    for (const element of revealNodes) reveal(element, false);
    document
      .querySelectorAll(".is-entering")
      .forEach((element) => element.classList.remove("is-entering"));
    document.querySelector(".hero")?.classList.remove("hero-intro");
  }
}
if (!stopped()) {
  document.querySelector(".hero")?.classList.add("hero-intro");
  for (const element of revealNodes) {
    const rect = element.getBoundingClientRect();
    if (!observer || rect.top < innerHeight - 30) reveal(element, false);
    else {
      element.classList.add("reveal-pending");
      observer.observe(element);
    }
  }
  setTimeout(
    () => document.querySelector(".hero")?.classList.remove("hero-intro"),
    2000,
  );
}
document.addEventListener("focusin", (event) => {
  const pending = event.target.closest(".reveal-pending");
  if (pending) {
    observer?.unobserve(pending);
    reveal(pending, false);
  }
});

function setActive(index) {
  if (active === index) return;
  active = index;
  slides.forEach((slide, i) =>
    slide.classList.toggle("is-active", i === index),
  );
  dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  if (counter) counter.textContent = `0${index + 1} / 03`;
}
function update() {
  frame = 0;
  if (document.hidden) return;
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  if (portrait && !stopped()) {
    const rect = portrait.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) {
      const position =
        (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight;
      portrait.style.setProperty("--orbit-angle", `${-12 + position * 55}deg`);
    }
  }
  if (sequence && root.classList.contains("cinematic") && isVisible) {
    let index = 0;
    stories.forEach((story, i) => {
      if (story.getBoundingClientRect().top < innerHeight * 0.56) index = i;
    });
    setActive(index);
  }
}
function schedule() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(update);
}
function resetDepth() {
  stage?.style.removeProperty("--tilt-x");
  stage?.style.removeProperty("--tilt-y");
  portrait?.style.removeProperty("--portrait-x");
  portrait?.style.removeProperty("--portrait-y");
  if (stopped()) portrait?.style.removeProperty("--orbit-angle");
}
function syncLayout() {
  // Reduced motion uses ordinary image/text pairs and a stationary portrait.
  const shouldEnable = !!sequence && desktop.matches && !reduced.matches;
  const anchor = stories.find((s) => {
    const r = s.getBoundingClientRect();
    return r.bottom > 100 && r.top < innerHeight;
  });
  const before = anchor?.getBoundingClientRect().top;
  const changed = root.classList.contains("cinematic") !== shouldEnable;
  root.classList.toggle("cinematic", shouldEnable);
  if (changed && anchor && scrollY > 300) {
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollBy(0, anchor.getBoundingClientRect().top - before);
    root.style.scrollBehavior = previous;
  }
  resetDepth();
  syncReveals();
  isVisible = true;
  schedule();
}
if (sequence && "IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
    if (isVisible) schedule();
  }).observe(sequence);
}
stage?.addEventListener("pointermove", (event) => {
  if (stopped() || !pointer.matches) return;
  const rect = stage.getBoundingClientRect();
  stage.style.setProperty(
    "--tilt-x",
    `${(-(event.clientY - rect.top - rect.height / 2) / rect.height) * 4}deg`,
  );
  stage.style.setProperty(
    "--tilt-y",
    `${((event.clientX - rect.left - rect.width / 2) / rect.width) * 5}deg`,
  );
});
stage?.addEventListener("pointerleave", resetDepth);
portrait?.addEventListener("pointermove", (event) => {
  if (stopped() || !pointer.matches || event.pointerType === "touch") return;
  const rect = portrait.getBoundingClientRect();
  portrait.style.setProperty(
    "--portrait-x",
    `${((event.clientX - rect.left - rect.width / 2) / rect.width) * 16}px`,
  );
  portrait.style.setProperty(
    "--portrait-y",
    `${((event.clientY - rect.top - rect.height / 2) / rect.height) * 8}px`,
  );
});
portrait?.addEventListener("pointerleave", resetDepth);
window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("hashchange", () => {
  isVisible = true;
  schedule();
});
window.addEventListener("pageshow", schedule);
document.addEventListener("portfolio:motionchange", syncLayout);
desktop.addEventListener("change", syncLayout);
reduced.addEventListener("change", syncLayout);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(frame);
    frame = 0;
    resetDepth();
  } else schedule();
});
if ("ResizeObserver" in window)
  new ResizeObserver(schedule).observe(document.body);
syncLayout();
