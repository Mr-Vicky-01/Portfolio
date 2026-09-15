/* Native details remain usable without this enhancement. */
(() => {
  const panels = [...document.querySelectorAll('.approach-item')];
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new Map(panels.map(panel => [panel, panel.open]));
  const animations = new Map();
  let pinned = null;

  function expand(panel, open) {
    if (states.get(panel) === open) return;
    states.set(panel, open);
    const from = panel.getBoundingClientRect().height;
    animations.get(panel)?.cancel();
    panel.open = true;
    const summary = panel.querySelector('summary');
    const to = open ? panel.getBoundingClientRect().height : summary.getBoundingClientRect().height + 2;
    panel.classList.toggle('is-expanded', open);
    if (reduced.matches || !panel.animate) {
      panel.open = open;
      panel.classList.remove('is-resizing');
      animations.delete(panel);
      return;
    }
    panel.classList.add('is-resizing');
    const animation = panel.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      { duration: 340, easing: 'cubic-bezier(.22,.8,.25,1)' },
    );
    animations.set(panel, animation);
    animation.onfinish = () => {
      panel.open = states.get(panel);
      panel.classList.remove('is-resizing');
      animations.delete(panel);
    };
  }
  function select(panel, open = true) {
    panels.forEach(item => expand(item, item === panel && open));
  }
  panels.forEach(panel => {
    // Manage exclusivity here so the outgoing panel can animate closed too.
    panel.removeAttribute('name');
    panel.classList.add('hover-details');
    panel.classList.toggle('is-expanded', panel.open);
    let hover;
    panel.addEventListener('pointerenter', event => {
      if (!pointer.matches || event.pointerType === 'touch') return;
      hover = setTimeout(() => {
        if (pinned !== panel) pinned = null;
        select(panel);
      }, 100);
    });
    const cancelHover = () => clearTimeout(hover);
    const leave = () => {
      cancelHover();
      if (pinned !== panel) expand(panel, false);
    };
    panel.addEventListener('pointerleave', leave);
    panel.addEventListener('pointercancel', leave);
    panel.querySelector('summary').addEventListener('click', event => {
      event.preventDefault();
      cancelHover();
      pinned = panel;
      select(panel);
    });
    reduced.addEventListener('change', () => {
      cancelHover();
      animations.get(panel)?.finish();
    });
    pointer.addEventListener('change', leave);
  });
})();
