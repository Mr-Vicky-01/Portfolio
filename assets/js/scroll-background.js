/* Prefetch compressed frames; decode a bounded neighborhood off the scroll path. */
const canvas = document.querySelector('#scroll-scene');
const context = canvas?.getContext('2d', { alpha: false });
const toggle = document.querySelector('#background-motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const small = matchMedia('(max-width: 760px)');
const connection = navigator.connection;
const base = new URL('../img/sequence/', import.meta.url);
const count = 192;
const cache = new Map();
const encoded = new Map();
const pending = new Set();
const decoding = new Set();
const failed = new Set();
// Desktop bitmaps are 1920x1080, so the old 28-frame window would nearly double decoded memory.
const limit = small.matches ? 12 : 20;
let variant = small.matches ? 'mobile' : 'desktop';
let generation = 0;
let target = 0;
let position = 0;
let lastTick = 0;
let drawn = -1;
let renderedPosition = 0;
let scheduled = false;
let paused = reduced.matches || !!connection?.saveData;
let started = false;
const hero = document.querySelector('#header');
const header = document.querySelector('.site-header');
const pin = document.querySelector('.hero-pin');
const cards = [...document.querySelectorAll('[data-hero-card]')];
const nextButton = document.querySelector('#hero-next');
const heroChapter = document.querySelector('#hero-chapter-label');
const root = document.documentElement;
let heroRun = 1;
let heroStart = 0;
let heroEnd = 0;
let storyEnabled = false;
let lastScrollTime = 0;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const p = clamp(value); return p*p*(3-2*p); };

function syncStory() {
  // Native sticky positioning; short screens and reduced motion keep a normal hero.
  storyEnabled = !reduced.matches && !connection?.saveData && innerHeight >= 660;
  root.classList.toggle('scroll-story', storyEnabled);
  nextButton.hidden = !storyEnabled;
  if (storyEnabled) {
    // Pin only when every chapter fits, including enlarged text and browser chrome.
    const layout = document.querySelector('.hero-layout');
    const style = getComputedStyle(layout);
    const available = layout.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (Math.max(...cards.map(card => card.offsetHeight)) > available) {
      storyEnabled = false;
      root.classList.remove('scroll-story');
      nextButton.hidden = true;
    }
  }
  if (!storyEnabled) {
    hero.style.removeProperty('--intro-opacity');
    hero.style.removeProperty('--chapter-progress');
    heroChapter.textContent = '01 / WHO I AM';
    cards.forEach((card, i) => {
      card.style.removeProperty('--card-opacity');
      card.style.removeProperty('--card-y');
      card.inert = i !== 0;
      card.setAttribute('aria-hidden', String(i !== 0));
    });
  }
}

function measure() {
  const navHeight = header.getBoundingClientRect().height;
  hero.style.setProperty('--hero-header', `${navHeight}px`);
  syncStory();
  heroStart = Math.max(0, hero.getBoundingClientRect().top + scrollY - navHeight);
  // The timeline must finish while still pinned, so it spans only the distance the pin holds.
  heroRun = Math.max(1, storyEnabled ? hero.offsetHeight - pin.offsetHeight : hero.offsetHeight * .65);
  heroEnd = heroStart + navHeight + hero.offsetHeight;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, small.matches ? 1.5 : 2, 2560 / rect.width);
  const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
  }
  drawn = -1;
  blendHeader();
  if (paused && cache.size) paint();
  schedule();
}
function choreograph() {
  if (!storyEnabled) return;
  const progress = clamp((scrollY-heroStart)/heroRun);
  // Copy follows the same eased timeline as the footage while motion is enabled.
  const visual = paused || !cache.size || failed.size ? progress : clamp(renderedPosition/(count-1));
  const firstOut = smooth((visual-.26)/.04);
  const firstIn = smooth((visual-.30)/.03);
  const secondOut = smooth((visual-.60)/.03);
  const secondIn = smooth((visual-.63)/.04);
  // Separate text exits and entrances so stopping mid-transition never stacks copy.
  const opacities = [1-firstOut, firstIn*(1-secondOut), secondIn];
  const shifts = [-firstOut*22, (1-firstIn)*22-secondOut*22, (1-secondIn)*22];
  cards.forEach((card, i) => {
    card.style.setProperty('--card-opacity', opacities[i].toFixed(3));
    card.style.setProperty('--card-y', `${shifts[i].toFixed(2)}px`);
    card.inert = opacities[i] < .5;
    card.setAttribute('aria-hidden', String(opacities[i] < .5));
  });
  hero.style.setProperty('--intro-opacity', opacities[0].toFixed(3));
  hero.style.setProperty('--chapter-progress', progress.toFixed(4));
  const label = visual < .295 ? '01 / WHO I AM' : visual < .635 ? '02 / WHAT I DO' : '03 / HOW I WORK';
  if (heroChapter.textContent !== label) heroChapter.textContent = label;
  const nextLabel = progress < .64 ? 'Next chapter ↓' : 'See the work ↓';
  if (nextButton.textContent !== nextLabel) nextButton.textContent = nextLabel;
}
function blendHeader() {
  // Ease the bar from navy to paper over the hero's last stretch, so the work arrives under a light header.
  const remaining = hero.getBoundingClientRect().bottom - header.offsetHeight;
  header.style.setProperty('--nav-blend', smooth(1 - remaining/320).toFixed(3));
}
function frameAtScroll() {
  return clamp((scrollY-heroStart)/heroRun) * (count-1);
}
function paint() {
  if (!cache.size) return;
  let lower = Math.floor(position), upper = Math.ceil(position);
  if (!cache.has(lower) || !cache.has(upper)) {
    // Never dissolve distant frames together: that creates a soft double image.
    const nearest = [...cache.keys()].reduce((a,b) => Math.abs(a-position) <= Math.abs(b-position) ? a : b);
    lower = upper = nearest;
  }
  const mix = lower === upper ? 0 : Math.max(0, Math.min(1, (position-lower)/(upper-lower)));
  renderedPosition = lower + (upper-lower)*mix;
  const stamp = `${lower}:${upper}:${mix.toFixed(3)}`;
  if (drawn === stamp) return;
  function draw(index, alpha) {
    const img = cache.get(index);
    // Preserve the complete source frame; scroll must never change its scale or crop.
    const iw = img.width, ih = img.height;
    const scale = Math.min(canvas.width/iw, canvas.height/ih);
    const w = iw*scale, h = ih*scale;
    context.globalAlpha = alpha;
    context.drawImage(img, canvas.width-w, (canvas.height-h)/2, w, h);
  }
  context.globalAlpha = 1;
  context.fillStyle = '#0b1220';
  context.fillRect(0, 0, canvas.width, canvas.height);
  draw(lower, 1);
  if (mix > 0) draw(upper, mix);
  context.globalAlpha = 1;
  drawn = stamp;
  canvas.dataset.frame = String(Math.round(renderedPosition));
  canvas.dataset.loaded = `${lower},${upper}`;
  canvas.classList.add('is-ready');
}
function wantedFrames() {
  const dest = Math.round(target), current = Math.round(position);
  const direction = target >= position ? 1 : -1;
  const indices = [current, Math.floor(position), Math.ceil(position), dest];
  for (let step = 1; step <= 14; step++) indices.push(current+step*direction, dest+step*direction, current-step*direction);
  return [...new Set(indices)].filter(i => i >= 0 && i < count).slice(0, limit-4);
}
async function decodeFrame(blob) {
  if ('createImageBitmap' in window) return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}
function trimCache() {
  const priorities = wantedFrames();
  const rank = i => priorities.includes(i) ? priorities.indexOf(i) : 1000 + Math.abs(i-position);
  while (cache.size > limit) {
    const key = [...cache.keys()].sort((a,b) => rank(b)-rank(a))[0];
    cache.get(key).close?.();
    cache.delete(key);
  }
}
function pump() {
  if (paused || document.hidden || !started || scrollY >= heroEnd) return;
  const version = generation;
  const wanted = wantedFrames();
  for (const index of wanted) {
    if (decoding.size >= 2) break;
    if (!encoded.has(index) || cache.has(index) || decoding.has(index) || failed.has(index)) continue;
    decoding.add(index);
    decodeFrame(encoded.get(index)).then(bitmap => {
      if (version !== generation) { bitmap.close?.(); return; }
      cache.set(index, bitmap);
      trimCache();
      schedule();
    }).catch(() => { if (version === generation) failed.add(index); }).finally(() => { if (version === generation) { decoding.delete(index); pump(); } });
  }
  // Fetch compressed assets ahead of demand, without keeping 192 decoded bitmaps.
  const rest = small.matches ? [] : Array.from({length: count}, (_,i) => i).sort((a,b) => Math.abs(a-target)-Math.abs(b-target));
  for (const index of new Set([...wanted, ...rest])) {
    if (pending.size >= (small.matches ? 3 : 4)) break;
    if (encoded.has(index) || pending.has(index) || failed.has(index)) continue;
    pending.add(index);
    const url = new URL(`${variant}/${String(index).padStart(3,'0')}.webp?v=3`, base);
    fetch(url, { cache: 'force-cache' }).then(response => {
      if (!response.ok) throw new Error('Frame unavailable');
      return response.blob();
    }).then(blob => {
      if (version !== generation) return;
      encoded.set(index, blob);
      if (small.matches && encoded.size > 36) {
        const furthest = [...encoded.keys()].sort((a,b) => Math.abs(b-target)-Math.abs(a-target))[0];
        encoded.delete(furthest);
      }
    }).catch(() => { if (version === generation) { failed.add(index); schedule(); } }).finally(() => {
      if (version !== generation) return;
      pending.delete(index);
      canvas.dataset.buffered = String(encoded.size);
      pump();
    });
  }
}
function update(now) {
  scheduled = false;
  if (document.hidden) return;
  blendHeader();
  if (scrollY >= heroEnd) return;
  if (paused) { choreograph(); return; }
  target = frameAtScroll();
  // Resolve onto a single sharp source frame when the user stops scrolling.
  if (now-lastScrollTime > 120) target = Math.round(target);
  const dt = Math.min(50, lastTick ? now-lastTick : 16);
  lastTick = now;
  // Time-based easing plus adjacent-frame blending removes discrete frame steps.
  position += (target-position) * (1-Math.exp(-dt/85));
  if (Math.abs(target-position) < 0.015) position = target;
  paint();
  choreograph();
  pump();
  if (position !== target) schedule();
}
function schedule() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
}
function syncControl() {
  toggle.textContent = paused ? 'Enable background motion' : 'Pause background motion';
  toggle.setAttribute('aria-pressed', String(!paused));
}
if (context && toggle) {
  nextButton.addEventListener('click', () => {
    const progress = clamp((scrollY-heroStart)/heroRun);
    const next = Math.min(3, Math.floor(progress*3 + .025)+1);
    const top = next === 3
      ? document.querySelector('#portfolio').getBoundingClientRect().top + scrollY - header.offsetHeight
      : heroStart + heroRun*next/3;
    window.scrollTo({ top, behavior: 'smooth' });
    if (next === 3) {
      const work = document.querySelector('#portfolio');
      work.setAttribute('tabindex', '-1');
      work.focus({ preventScroll: true });
      work.addEventListener('blur', () => work.removeAttribute('tabindex'), { once: true });
    }
  });
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    paused = !paused;
    syncControl();
    if (!paused) { started = true; drawn = -1; schedule(); }
  });
  reduced.addEventListener('change', () => {
    paused = reduced.matches || !!connection?.saveData;
    syncControl();
    measure();
    if (paused) { canvas.classList.remove('is-ready'); drawn = -1; }
    else schedule();
  });
  addEventListener('scroll', () => { started = true; lastScrollTime = performance.now(); schedule(); }, { passive: true });
  addEventListener('resize', measure, { passive: true });
  small.addEventListener('change', () => {
    generation++;
    variant = small.matches ? 'mobile' : 'desktop';
    cache.forEach(bitmap => bitmap.close?.());
    cache.clear(); encoded.clear(); pending.clear(); decoding.clear(); failed.clear();
    canvas.classList.remove('is-ready');
    measure();
  });
  document.addEventListener('visibilitychange', schedule);
  new ResizeObserver(measure).observe(document.querySelector('main'));
  document.fonts.ready.then(measure);
  syncControl();
  measure();
  // After the poster loads, prefetch compressed frames during idle time.
  const warm = () => {
    if (paused || started) return;
    const run = () => { started = true; pump(); };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1800 });
    else setTimeout(run, 300);
  };
  if (document.readyState === 'complete') warm();
  else addEventListener('load', warm, { once: true });
  // Reduced motion / Save-Data stay poster-only until explicitly enabled.
}
